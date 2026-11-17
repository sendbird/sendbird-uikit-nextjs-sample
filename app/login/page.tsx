import { signIn } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form action={signIn} className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-zinc-500">
          Demo sign-in: any user ID works. Replace it with your own authentication.
        </p>
        <input
          name="userId"
          required
          pattern="[A-Za-z0-9_\-]{1,40}"
          title="1 to 40 letters, digits, hyphens, or underscores"
          placeholder="User ID"
          autoComplete="username"
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
        />
        <button type="submit" className="rounded-md bg-foreground px-3 py-2 font-medium text-background">
          Sign in
        </button>
      </form>
    </main>
  );
}
