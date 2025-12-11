import { NextResponse } from "next/server";
import { clearSessionCookie, destroySession, getSessionFromCookies } from "@/lib/session";

export async function POST() {
  const session = await getSessionFromCookies();
  if (session?.sessionId) {
    await destroySession(session.sessionId);
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: "Logged out" });
}

