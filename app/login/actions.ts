"use server";

import { redirect, RedirectType } from "next/navigation";
import { after } from "next/server";
import { createSession, deleteSession, getCurrentUser, isValidUserId } from "@/lib/auth";
import { revokeSessionTokens } from "@/lib/sendbird";

export async function signIn(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!isValidUserId(userId)) {
    redirect("/login", RedirectType.replace);
  }
  await createSession(userId);
  redirect("/chat", RedirectType.replace);
}

export async function signOut() {
  const user = await getCurrentUser();
  await deleteSession();
  if (user) {
    after(() => revokeSessionTokens(user.id).catch((error) => console.error(error)));
  }
  redirect("/login", RedirectType.replace);
}
