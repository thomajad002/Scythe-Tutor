import Link from "next/link";
import { signUp } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto min-h-full w-full max-w-md px-6 py-10 sm:py-14">
      <Card className="w-full space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-strong">New Trainee</p>
        <h1 className="text-3xl">Create Your Tutor Profile</h1>
        <p className="mt-2 text-sm text-muted">Set up an account and start practicing Scythe scoring immediately.</p>

        {params.error && <p className="mt-4 rounded-xl bg-rose-950/60 p-3 text-sm text-rose-200">{params.error}</p>}

        <form action={signUp} className="mt-6 space-y-4">
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
            <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
          </div>

          <Button type="submit" fullWidth>
            Create Account
          </Button>
        </form>

        <p className="mt-4 text-sm text-muted">
          Already have an account? <Link href="/login" className="text-accent-strong hover:underline">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
