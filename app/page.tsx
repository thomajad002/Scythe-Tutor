import Link from "next/link";
import { getOptionalUser } from "@/lib/auth/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const user = await getOptionalUser();

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
      <section className="reveal-up relative overflow-hidden rounded-3xl border border-border/70 bg-surface-1/80 p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <p className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-strong">
          Scythe Scoring Intelligent Tutor
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl leading-tight sm:text-6xl">
          Learn end-game scoring fast. No table arguments required.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted sm:text-lg">
          Practice each scoring subtype with immediate feedback, then graduate to single-player and multiplayer
          score audits before unlocking timed speed challenges.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <>
              <Link href="/tutor">
                <Button>Continue Training</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">View Progress Hub</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button>Start Learning</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Log In</Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="space-y-3 reveal-up">
          <h2 className="text-xl">1. Master Subtypes</h2>
          <p className="text-sm text-muted">
            Popularity tiers, stars, territories, resources, structure bonus, total sum, and tiebreakers.
          </p>
        </Card>
        <Card className="space-y-3 reveal-up">
          <h2 className="text-xl">2. Clear Gates</h2>
          <p className="text-sm text-muted">
            Move from single-player verification to 2-5 player scoreboards with strict unlock rules.
          </p>
        </Card>
        <Card className="space-y-3 reveal-up">
          <h2 className="text-xl">3. Race The Clock</h2>
          <p className="text-sm text-muted">
            Speed mode unlocks only after proving scoring fluency or passing a perfect skip check.
          </p>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg">Session Status</h2>
          <p className="text-sm text-muted">{user ? `Signed in as ${user.email ?? "unknown user"}` : "Not signed in yet."}</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg">Why this tutor works</h2>
          <p className="text-sm text-muted">
            Correctness is rule-based, hints are targeted by mistake type, and progression adapts to weak knowledge
            components.
          </p>
        </Card>
      </section>
    </main>
  );
}
