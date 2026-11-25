import "server-only";

const SESSION_TOKEN_TTL_MS = 60 * 60 * 1000;
const USER_ALREADY_EXISTS = 400202;

type PlatformApiResponse = {
  ok: boolean;
  status: number;
  json: Record<string, unknown>;
};

async function callPlatformApi(method: "POST" | "DELETE", path: string, body?: unknown): Promise<PlatformApiResponse> {
  const appId = process.env.NEXT_PUBLIC_SENDBIRD_APP_ID;
  const apiToken = process.env.SENDBIRD_API_TOKEN;
  if (!appId || !apiToken) {
    throw new Error("Set NEXT_PUBLIC_SENDBIRD_APP_ID and SENDBIRD_API_TOKEN in .env.local.");
  }

  const res = await fetch(`https://api-${appId}.sendbird.com/v3${path}`, {
    method,
    headers: { "Api-Token": apiToken, "Content-Type": "application/json; charset=utf8" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

export async function issueSessionToken(userId: string): Promise<string> {
  const user = await callPlatformApi("POST", "/users", {
    user_id: userId,
    nickname: userId,
    profile_url: "",
  });
  if (!user.ok && user.json.code !== USER_ALREADY_EXISTS) {
    throw new Error(`Creating the Sendbird user failed with status ${user.status}.`);
  }

  const issued = await callPlatformApi("POST", `/users/${encodeURIComponent(userId)}/token`, {
    expires_at: Date.now() + SESSION_TOKEN_TTL_MS,
  });
  const token = issued.json.token;
  if (!issued.ok || typeof token !== "string") {
    throw new Error(`Issuing the session token failed with status ${issued.status}.`);
  }
  return token;
}

export async function revokeSessionTokens(userId: string): Promise<void> {
  const revoked = await callPlatformApi("DELETE", `/users/${encodeURIComponent(userId)}/token`);
  if (!revoked.ok) {
    throw new Error(`Revoking the session tokens failed with status ${revoked.status}.`);
  }
}
