import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import { listMessages, saveMessages, deleteMessages } from "@/lib/chat-store";

const model = "gpt-5";
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

IMPORTANT: If the user mentions medication names (even if misspelled or unknown), try to interpret them and provide helpful information. If you cannot identify specific medications, provide general guidance about medication interactions and suggest consulting a doctor with the exact medication names. Always attempt to be helpful rather than dismissive.
`;

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[a.length][b.length];
};

const isMedicalLike = (text: string, hints: string[]) => {
  const lower = text.toLowerCase();
  if (hints.some((h) => lower.includes(h))) return true;

  const tokens = lower.match(/[a-z]+/g) ?? [];
  for (const token of tokens) {
    for (const hint of hints) {
      const distance = levenshtein(token, hint);
      if (distance <= 1) return true;
      if (hint.length >= 7 && distance <= 2) return true;
    }
  }
  return false;
};

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
    "med", "medicine", "medication", "meds", "medic", "medicin",
    "drug", "drugs", "pill", "pills", "tablet", "tablets", "capsule", "capsules",
    "dose", "dosing", "dosage", "mg", "milligram", "milligrams", "g", "gram", "grams",
    "prescription", "prescribed", "rx", "take", "taking", "took",
    "insulin", "antibiotic", "antibiotics", "blood pressure", "bp",
    "statin", "statins", "cholesterol", "painkiller", "painkillers",
    "ibuprofen", "acetaminophen", "paracetamol", "amoxicillin", "metformin",
    "atorvastatin", "aspirin", "tylenol", "advil", "motrin", "naproxen",
    "lisinopril", "amlodipine", "metoprolol", "omeprazole", "pantoprazole",
    "simvastatin", "levothyroxine", "azithromycin", "amoxicillin", "prednisone",
    "gabapentin", "tramadol", "hydrocodone", "oxycodone", "warfarin",
    "clopidogrel", "furosemide", "losartan", "sertraline", "fluoxetine",
    "interaction", "interactions", "side effect", "side effects", "symptom", "symptoms",
    "doctor", "physician", "pharmacy", "pharmacist", "hospital", "clinic",
  ];

  const hasMedicalPattern = (text: string): boolean => {
    const lower = text.toLowerCase();
    
    if (medicalHints.some((h) => lower.includes(h))) return true;
    
    if (/\d+\s*(mg|g|milligram|gram|ml|milliliter)/i.test(text)) return true;
    if (/\b(take|taking|took|prescribed|prescription)\b/i.test(text)) return true;
    
    const medicalSuffixes = /(in|ol|ide|ine|ate|azole|mycin|pril|statin|prazole)$/i;
    const tokens = lower.match(/[a-z]{4,}/g) ?? [];
    if (tokens.some((t) => medicalSuffixes.test(t))) return true;
    
    for (const token of tokens) {
      for (const hint of medicalHints) {
        const distance = levenshtein(token, hint);
        const maxDistance = hint.length <= 4 ? 1 : hint.length <= 7 ? 2 : 3;
        if (distance <= maxDistance) return true;
      }
    }
    
    if (text.length > 20) {
      const capitalizedWords = text.match(/\b[A-Z][a-z]{3,}\b/g) ?? [];
      if (capitalizedWords.length > 0) return true;
      
      const commonWords = new Set(["this", "that", "with", "from", "have", "been", "will", "would", "could", "should", "what", "when", "where", "which", "about"]);
      const potentialMedNames = tokens.filter(t => t.length >= 4 && !commonWords.has(t));
      if (potentialMedNames.length >= 2) return true;
    }
    
    return false;
  };

  const looksMedical = hasMedicalPattern(message);

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
        temperature: 1,
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

