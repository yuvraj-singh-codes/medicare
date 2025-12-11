import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export const SESSION_COOKIE = "mc_session";

type SessionDoc = {
  _id: string;
  userId: string;
  createdAt: Date;
};

const sessionCollection = async () => {
  const db = await getDb();
  const collection = db.collection<SessionDoc>("sessions");
  await collection.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
  );
  return collection;
};

export const createSession = async (userId: string) => {
  const id = crypto.randomBytes(24).toString("hex");
  const collection = await sessionCollection();
  await collection.insertOne({
    _id: id,
    userId,
    createdAt: new Date(),
  } as SessionDoc);
  return id;
};

export const destroySession = async (sessionId: string) => {
  const collection = await sessionCollection();
  await collection.deleteOne({ _id: sessionId });
};

export const getSession = async (sessionId: string | undefined | null) => {
  if (!sessionId) return null;
  const collection = await sessionCollection();
  const session = await collection.findOne({ _id: sessionId });
  return session ?? null;
};

export const setSessionCookie = async (sessionId: string) => {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
};

export const clearSessionCookie = async () => {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
};

export const getSessionFromCookies = async () => {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  return { sessionId, userId: session.userId };
};

export const getSessionFromRequest = async (request: NextRequest) => {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  return { sessionId, userId: session.userId };
};

