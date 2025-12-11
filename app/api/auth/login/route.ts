import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/user-store";
import { validateLogin } from "@/lib/validation";
import { createSession, setSessionCookie } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const input = {
    email: (body.email as string | undefined)?.trim() ?? "",
    password: (body.password as string | undefined) ?? "",
  };

  const errors = validateLogin(input);
  if (errors.length) {
    return NextResponse.json(
      { success: false, errors },
      { status: 400 }
    );
  }

  const user = await authenticateUser(input);
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          { field: "password", message: "Invalid email or password" },
        ],
      },
      { status: 401 }
    );
  }

  const sessionId = await createSession(user.id);
  await setSessionCookie(sessionId);

  return NextResponse.json({
    success: true,
    user,
    message: "Signed in",
  });
}

