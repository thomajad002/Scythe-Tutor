import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { updateProfile } from "@/lib/auth/actions";

type PageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function ProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  // Ensure profile row exists even if trigger did not run in a manual migration scenario.
  await supabase
    .from("profiles")
    .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const safeProfile = profile ?? {
    id: user.id,
    email: user.email ?? null,
    full_name: null,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl items-center px-6 py-16">
      <div className="w-full space-y-6">
        <Card className="space-y-4">
          <h1 className="text-3xl font-semibold">Profile</h1>
          <p className="text-sm text-muted">Update your profile information and avatar.</p>

          {params.error && <p className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-200">{params.error}</p>}
          {params.success && <p className="rounded-xl bg-emerald-950/60 p-3 text-sm text-emerald-200">{params.success}</p>}

          <form action={updateProfile} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-muted">
                Email
              </label>
              <Input id="email" value={safeProfile.email ?? ""} disabled />
            </div>
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm text-muted">
                Full Name
              </label>
              <Input id="full_name" name="full_name" defaultValue={safeProfile.full_name ?? ""} />
            </div>
            <Button type="submit">Save Profile</Button>
          </form>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold">Avatar Upload</h2>
          <AvatarUpload avatarUrl={safeProfile.avatar_url} />
        </Card>
      </div>
    </main>
  );
}
