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
    <main className="mx-auto flex min-h-full w-full max-w-3xl items-center px-6 py-16">
      <Card className="w-full space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">This route is protected. Unauthenticated users are redirected to login.</p>
        </header>

        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm">
          <div className="mb-3">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt="Profile avatar"
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-xs text-muted">
                No avatar
              </div>
            )}
          </div>
          <p><span className="text-muted">Email:</span> {user.email}</p>
          <p><span className="text-muted">Full Name:</span> {profile?.full_name ?? "Not set"}</p>
          <p><span className="text-muted">Last Updated:</span> {formatIsoDate(profile?.updated_at)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/profile">
            <Button variant="secondary">Go to Profile</Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="danger">
              Sign Out
            </Button>
          </form>
        </div>
      </Card>
    </main>
  );
}
