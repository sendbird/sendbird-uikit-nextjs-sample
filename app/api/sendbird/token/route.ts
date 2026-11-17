import { getCurrentUser } from "@/lib/auth";
import { issueSessionToken } from "@/lib/sendbird";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const token = await issueSessionToken(user.id);
    return Response.json({ userId: user.id, token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Chat session unavailable." }, { status: 502 });
  }
}
