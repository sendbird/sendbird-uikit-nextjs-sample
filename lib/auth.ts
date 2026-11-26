// Demo sign-in for this sample: anyone can sign in as any user ID. In your app, make getCurrentUser() return the signed-in user from your own authentication.
import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "demo_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const DEV_SESSION_SECRET = "dev-only-session-secret";
const MIN_SESSION_SECRET_LENGTH = 32;

export type CurrentUser = { id: string };

type Session = { userId: string; sessionId: string; expiresAt: number };

// The sign-out action and the token route can load separate copies of this module, so the record lives on globalThis.
const globalForSessions = globalThis as typeof globalThis & { demoEndedSessions?: Map<string, number> };
const endedSessions = (globalForSessions.demoEndedSessions ??= new Map<string, number>());

export function isValidUserId(userId: string) {
  return USER_ID_PATTERN.test(userId);
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    if (secret.length < MIN_SESSION_SECRET_LENGTH) {
      throw new Error(`SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`);
    }
    return secret;
  }
  if (process.env.NODE_ENV !== "production") return DEV_SESSION_SECRET;
  throw new Error("Set SESSION_SECRET before running in production.");
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function readSession(value: string | undefined): Session | null {
  const separator = value?.lastIndexOf(".") ?? -1;
  if (!value || separator < 1) return null;

  const payload = value.slice(0, separator);
  const actual = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const [userId, sessionId, expiresAtText, ...rest] = payload.split(".");
  const expiresAt = Number(expiresAtText);
  if (rest.length > 0 || !isValidUserId(userId) || !sessionId || !(expiresAt > Date.now())) return null;
  if (endedSessions.has(sessionId)) return null;
  return { userId, sessionId, expiresAt };
}

export async function createSession(userId: string) {
  const payload = `${userId}.${randomUUID()}.${Date.now() + SESSION_MAX_AGE_SECONDS * 1000}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get(COOKIE_NAME)?.value);
  if (session) {
    for (const [sessionId, expiresAt] of endedSessions) {
      if (expiresAt <= Date.now()) endedSessions.delete(sessionId);
    }
    endedSessions.set(session.sessionId, session.expiresAt);
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get(COOKIE_NAME)?.value);
  return session ? { id: session.userId } : null;
}
