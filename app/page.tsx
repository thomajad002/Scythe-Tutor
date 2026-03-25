import Link from "next/link";
import { getOptionalUser } from "@/lib/auth/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getOptionalUser();

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="mx-auto flex min-h-full w-full max-w-5xl items-center px-6 py-16 sm:px-10">
        <section className="w-full rounded-3xl border border-border bg-surface-1 p-8 shadow-2xl shadow-black/30 sm:p-12">
          <p className="mb-4 inline-flex rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Next.js Starter Template
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Dark-first foundation for rapid project setup.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">
            This starter now includes Supabase auth scaffolding, protected pages, profile management, and
            migration-based database setup.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Card className="bg-surface-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-strong">
                Authentication Status
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {user ? `Signed in as ${user.email ?? "unknown user"}` : "You are not signed in."}
              </p>
            </Card>
            <Card className="bg-navy">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-strong">Profile Flow</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                New users automatically receive a profile row via database trigger after signup.
              </p>
            </Card>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button>Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="secondary">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
