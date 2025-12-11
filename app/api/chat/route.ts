import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import { listMessages, saveMessages, deleteMessages } from "@/lib/chat-store";

const model = "gpt-4o-mini";
const endpoint = "https://api.openai.com/v1/chat/completions";

const systemPrompt = `
You are a medication interaction assistant. Given a user's free-text about medicines, produce a concise structured answer with:
1) severity score 0-10 (0 none, 10 highest)
2) plain English explanation in 1-3 sentences
3) one recommended action in a single sentence
4) one question for the doctor in a single sentence
Map severity to traffic color: 0-3 green, 4-6 yellow, 7-8 red, 9-10 black.
Return JSON only in this shape:
{
  "severityScore": number,
  "explanation": string,
  "recommendedAction": string,
  "doctorQuestion": string
}
Keep language clear, calm, and avoid medical jargon when possible.
`;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const messages = await listMessages(session.userId);
  return NextResponse.json({ success: true, data: messages });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const message = (body.message as string | undefined)?.trim();
  if (!message) {
    return NextResponse.json(
      { success: false, error: "Message is required" },
      { status: 400 }
    );
  }

  const medicalHints = [
    "med",
    "medicine",
    "medication",
    "drug",
    "pill",
    "tablet",
    "capsule",
    "dose",
    "dosing",
    "mg",
    "milligram",
    "prescription",
    "rx",
    "insulin",
    "antibiotic",
    "blood pressure",
    "statin",
    "cholesterol",
    "painkiller",
    "ibuprofen",
    "acetaminophen",
    "paracetamol",
  ];

  const looksMedical = medicalHints.some((hint) =>
    message.toLowerCase().includes(hint)
  );

  if (!looksMedical) {
    const userEntry = {
      role: "user" as const,
      content: message,
    };
    const assistantEntry = {
      role: "assistant" as const,
      content:
        "I’m a medical assistant focused on medicines, doses, and interactions. Please share the medication names, dosing, or related concerns you want help with.",
      severity: undefined,
      severityLabel: undefined,
      action: undefined,
      doctorQuestion: undefined,
    };
    await saveMessages(session.userId, [userEntry, assistantEntry]);
    return NextResponse.json({
      success: true,
      data: {
        explanation: assistantEntry.content,
        severityScore: null,
        recommendedAction: null,
        doctorQuestion: null,
        severityLabel: null,
      },
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
      cache: "no-store",
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!response.ok || !content) {
      const upstreamStatus = data?.error?.type || response.status;
      const upstreamMsg =
        data?.error?.message || (raw ? raw.slice(0, 200) : "Unable to get a response");
      return NextResponse.json(
        { success: false, error: upstreamMsg },
        { status: upstreamStatus === "rate_limit_exceeded" ? 429 : 502 }
      );
    }

    let parsed: any;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Service returned an unexpected format. Please try again.",
        },
        { status: 502 }
      );
    }
    const score = parsed.severityScore as number | undefined;
    let severityLabel: "green" | "yellow" | "red" | "black" | undefined;
    if (score !== undefined) {
      if (score <= 3) severityLabel = "green";
      else if (score <= 6) severityLabel = "yellow";
      else if (score <= 8) severityLabel = "red";
      else severityLabel = "black";
    }
    const userEntry = {
      role: "user" as const,
      content: message,
    };
    const assistantEntry = {
      role: "assistant" as const,
      content: parsed.explanation,
      severity: score,
      severityLabel,
      action: parsed.recommendedAction,
      doctorQuestion: parsed.doctorQuestion,
    };
    await saveMessages(session.userId, [userEntry, assistantEntry]);

    return NextResponse.json({
      success: true,
      data: {
        severityScore: parsed.severityScore,
        explanation: parsed.explanation,
        recommendedAction: parsed.recommendedAction,
        doctorQuestion: parsed.doctorQuestion,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteMessages(session.userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Something went wrong" },
      { status: 500 }
    );
  }
}

