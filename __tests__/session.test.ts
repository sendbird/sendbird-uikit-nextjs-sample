import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as requestToken } from "@/app/api/sendbird/token/route";
import { signIn, signOut } from "@/app/login/actions";

const { browserCookies, Redirect } = vi.hoisted(() => {
  class Redirect extends Error {
    constructor(readonly url: string) {
      super(`Redirected to ${url}`);
    }
  }
  return { browserCookies: new Map<string, string>(), Redirect };
});

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (browserCookies.has(name) ? { name, value: browserCookies.get(name) } : undefined),
    set: (name: string, value: string) => browserCookies.set(name, value),
    delete: (name: string) => browserCookies.delete(name),
  }),
}));
vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const SESSION_SECRET = "test-session-secret-of-at-least-32-chars";

let platformCalls: string[];
let revokeStatuses: number[];
let revokeDelayMs: number;

beforeEach(() => {
  browserCookies.clear();
  platformCalls = [];
  revokeStatuses = [];
  revokeDelayMs = 0;
  vi.stubEnv("NEXT_PUBLIC_SENDBIRD_APP_ID", "test-app");
  vi.stubEnv("SENDBIRD_API_TOKEN", "test-api-token");
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const call = `${init.method} ${new URL(url).pathname}`;
    if (init.method !== "DELETE") {
      platformCalls.push(call);
      return Response.json(call.endsWith("/token") ? { token: "session-token" } : {});
    }
    await new Promise((resolve) => setTimeout(resolve, revokeDelayMs));
    platformCalls.push(call);
    const status = revokeStatuses.shift() ?? 200;
    if (status === 0) throw new TypeError("fetch failed");
    return Response.json({}, { status });
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function signInAs(userId: string) {
  const form = new FormData();
  form.set("userId", userId);
  await expect(signIn(form)).rejects.toMatchObject({ url: "/chat" });
}

async function signOutToLoginPage() {
  await expect(signOut()).rejects.toMatchObject({ url: "/login" });
}

async function tokenStatus() {
  return (await requestToken()).status;
}

function revokeAttempts() {
  return platformCalls.filter((call) => call.startsWith("DELETE")).length;
}

function silenceConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("token route", () => {
  it("issues a token to the signed-in user", async () => {
    await signInAs("alice");
    const res = await requestToken();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "alice", token: "session-token" });
  });

  it("stops accepting a session seven days after sign-in", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await signInAs("alice");
    vi.setSystemTime(new Date("2026-01-07T23:59:59Z"));
    expect(await tokenStatus()).toBe(200);
    vi.setSystemTime(new Date("2026-01-08T00:00:00Z"));
    expect(await tokenStatus()).toBe(401);
  });

  it("rejects a signed cookie without an expiry", async () => {
    const signature = createHmac("sha256", SESSION_SECRET).update("alice").digest("base64url");
    browserCookies.set("demo_session", `alice.${signature}`);
    expect(await tokenStatus()).toBe(401);
  });

  it("rejects a cookie changed to another user", async () => {
    await signInAs("alice");
    browserCookies.set("demo_session", browserCookies.get("demo_session")!.replace(/^alice\./, "bob."));
    expect(await tokenStatus()).toBe(401);
  });
});

describe("signOut", () => {
  it("ends the session on the server, so a tab that still sends the cookie gets no token", async () => {
    await signInAs("alice");
    const cookie = browserCookies.get("demo_session")!;
    await signOutToLoginPage();
    expect(browserCookies.has("demo_session")).toBe(false);
    browserCookies.set("demo_session", cookie);
    expect(await tokenStatus()).toBe(401);
  });

  it("finishes the revoke before it responds, so signing in again right away gets a token issued after the revoke", async () => {
    await signInAs("alice");
    await requestToken();
    revokeDelayMs = 50;
    await signOutToLoginPage();
    await signInAs("alice");
    await requestToken();
    expect(platformCalls).toEqual([
      "POST /v3/users",
      "POST /v3/users/alice/token",
      "DELETE /v3/users/alice/token",
      "POST /v3/users",
      "POST /v3/users/alice/token",
    ]);
  });

  it("retries a revoke that fails to reach the server or fails on it", async () => {
    await signInAs("alice");
    revokeStatuses = [0, 503, 200];
    const consoleError = silenceConsoleError();
    await signOutToLoginPage();
    expect(revokeAttempts()).toBe(3);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does not retry a revoke that the server rejects", async () => {
    await signInAs("alice");
    revokeStatuses = [403];
    const consoleError = silenceConsoleError();
    await signOutToLoginPage();
    expect(revokeAttempts()).toBe(1);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      new Error("Revoking the session tokens failed with status 403."),
    );
  });

  it("still signs out when the revoke keeps failing, and logs the error", async () => {
    await signInAs("alice");
    const cookie = browserCookies.get("demo_session")!;
    revokeStatuses = [503, 503, 503];
    const consoleError = silenceConsoleError();
    await signOutToLoginPage();
    expect(revokeAttempts()).toBe(3);
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      new Error("Revoking the session tokens failed with status 503."),
    );
    browserCookies.set("demo_session", cookie);
    expect(await tokenStatus()).toBe(401);
  });
});
