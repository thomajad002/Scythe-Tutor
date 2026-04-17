import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { formatIsoDate } from "@/lib/utils/format-date";
import { SUBTYPE_IDS, allSubtypesMastered } from "@/lib/tutor/progression";
import { getTutorProgressState } from "@/lib/tutor/server";

function getRecommendedStep(progress: Awaited<ReturnType<typeof getTutorProgressState>>) {
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);

  if (!progress.skipCheckPassed && !masteredAllSubtypes) {
    return {
      title: "Finish Subtype Mastery",
      description: "Keep working through subtype drills until every section is mastered.",
      ctaLabel: "Resume Subtype Drills",
      ctaHref: "/tutor?stage=subtype",
    };
  }

  if (!progress.singlePlayerMastered) {
    return {
      title: "Clear Single-Player Gate",
      description: "Complete enough accurate rounds to unlock consistent multiplayer training.",
      ctaLabel: "Open Single-Player Stage",
      ctaHref: "/tutor?stage=single-player",
    };
  }

  if (progress.maxMultiplayerUnlocked < 5) {
    return {
      title: "Push Multiplayer Mastery",
      description: "Advance multiplayer target sizes up to 5 players to unlock speed challenge.",
      ctaLabel: "Open Multiplayer Stage",
      ctaHref: "/tutor?stage=multiplayer",
    };
  }

  return {
    title: "Ready for Speed Challenge",
    description: "You have completed all current gate requirements and are ready for the next mode.",
    ctaLabel: "Open Tutor",
    ctaHref: "/tutor",
  };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const progress = await getTutorProgressState(user.id);
  const masteredSubtypeCount = SUBTYPE_IDS.filter((subtypeId) => progress.subtypeMastery[subtypeId] === true).length;
  const subtypeProgressPercent = Math.round((masteredSubtypeCount / SUBTYPE_IDS.length) * 100);
  const masteredAllSubtypes = allSubtypesMastered(progress.subtypeMastery);
  const singlePlayerUnlocked = progress.skipCheckPassed || masteredAllSubtypes;
  const multiplayerUnlocked = progress.skipCheckPassed || progress.singlePlayerMastered;
  const recommendedStep = getRecommendedStep(progress);

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

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
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
            <h2 className="text-xl">Tutor Progress</h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Subtype mastery</span>
                  <span className="text-foreground">{masteredSubtypeCount}/{SUBTYPE_IDS.length}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-surface-3">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${subtypeProgressPercent}%` }} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Single-Player Gate</p>
                  <p className="mt-1 text-sm text-foreground">{singlePlayerUnlocked ? "Unlocked" : "Locked"}</p>
                  <p className="mt-1 text-xs text-muted">Consecutive correct: {progress.singlePlayerConsecutiveCorrect}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">Multiplayer Gate</p>
                  <p className="mt-1 text-sm text-foreground">{multiplayerUnlocked ? "Unlocked" : "Locked"}</p>
                  <p className="mt-1 text-xs text-muted">Current unlock: up to {Math.max(2, progress.maxMultiplayerUnlocked)} players</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-muted">Track status</p>
                <p className="mt-1 text-sm text-foreground">{progress.tutorialCompleted ? "Tutorial path complete" : "In progress"}</p>
                <p className="mt-1 text-xs text-muted">Speed challenge {progress.speedChallengeUnlocked ? "unlocked" : "locked"}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">

          <Card className="bg-surface-2/70">
            <h2 className="text-xl">Recommended Next Step</h2>
            <p className="mt-2 text-sm text-muted">
              {recommendedStep.description}
            </p>
            <div className="mt-4">
              <Link href={recommendedStep.ctaHref}>
                <Button fullWidth>{recommendedStep.ctaLabel}</Button>
              </Link>
            </div>
          </Card>

          <Card className="bg-surface-2/70">
            <h2 className="text-xl">Speed Challenge Scores</h2>
            <p className="mt-2 text-sm text-muted">
              Coming soon. This section will show your best speed run score, average completion time, and recent attempts.
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
              Scoreboard is under construction.
            </div>
          </Card>
        </section>
      </Card>
    </main>
  );
}
