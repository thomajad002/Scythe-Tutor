import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { formatIsoDate } from "@/lib/utils/format-date";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto min-h-full w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
      <Card className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-strong">Command Board</p>
            <h1 className="mt-2 text-4xl">Training Dashboard</h1>
            <p className="mt-2 text-sm text-muted">Track account details and jump directly into scoring drills.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/tutor">
              <Button>Open Tutor</Button>
            </Link>
            <Link href="/profile">
              <Button variant="secondary">Edit Profile</Button>
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="danger">Sign Out</Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <Card className="bg-surface-2/70">
            <h2 className="text-xl">Pilot Profile</h2>
            <div className="mt-4 flex items-center gap-4">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Profile avatar"
                  width={68}
                  height={68}
                  unoptimized
                  className="h-[68px] w-[68px] rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-border bg-surface text-xs text-muted">
                  No avatar
                </div>
              )}
              <div className="space-y-1 text-sm">
                <p><span className="text-muted">Email:</span> {user.email}</p>
                <p><span className="text-muted">Name:</span> {profile?.full_name ?? "Not set"}</p>
                <p><span className="text-muted">Updated:</span> {formatIsoDate(profile?.updated_at)}</p>
              </div>
            </div>
          </Card>

          <Card className="bg-surface-2/70">
            <h2 className="text-xl">Recommended Next Step</h2>
            <p className="mt-2 text-sm text-muted">
              Resume subtype mastery in tutor mode, then validate with single-player and multiplayer rounds.
            </p>
            <div className="mt-4">
              <Link href="/tutor">
                <Button fullWidth>Resume Tutor Flow</Button>
              </Link>
            </div>
          </Card>
        </section>
      </Card>
    </main>
  );
}
