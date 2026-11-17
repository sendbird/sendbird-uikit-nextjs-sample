// Demo sign-in for this sample: anyone can sign in as any user ID. In your app, make getCurrentUser() return the signed-in user from your own authentication.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "demo_session";
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const DEV_SESSION_SECRET = "dev-only-session-secret";
const MIN_SESSION_SECRET_LENGTH = 32;

export type CurrentUser = { id: string };

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

function sign(userId: string) {
  return createHmac("sha256", sessionSecret()).update(userId).digest("base64url");
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const separator = value.lastIndexOf(".");
  const userId = value.slice(0, separator);
  if (separator < 1 || !isValidUserId(userId)) return null;

  const actual = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sign(userId));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  return { id: userId };
}
