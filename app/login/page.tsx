import Link from "next/link";
import { signIn } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto min-h-full w-full max-w-md px-6 py-10 sm:py-14">
      <Card className="w-full space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-strong">Welcome Back</p>
        <h1 className="text-3xl">Continue Your Scoring Training</h1>
        <p className="mt-2 text-sm text-muted">Sign in to resume gated mastery and speed challenge progress.</p>

        {params.error && <p className="mt-4 rounded-xl bg-rose-950/60 p-3 text-sm text-rose-200">{params.error}</p>}

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-muted">
              Email
            </label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-muted">
              Password
            </label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>

          <Button type="submit" fullWidth>
            Sign In
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Need an account? <Link href="/signup" className="text-accent-strong hover:underline">Create one</Link>
        </p>
      </Card>
    </main>
  );
}
