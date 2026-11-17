"use server";

import { redirect, RedirectType } from "next/navigation";
import { createSession, deleteSession, isValidUserId } from "@/lib/auth";

export async function signIn(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!isValidUserId(userId)) {
    redirect("/login", RedirectType.replace);
  }
  await createSession(userId);
  redirect("/chat", RedirectType.replace);
}

export async function signOut() {
  await deleteSession();
  redirect("/login", RedirectType.replace);
}
