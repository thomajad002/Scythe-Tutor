"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

export async function signIn(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/login?error=Supabase%20is%20not%20configured.%20Run%20./setup.sh%20after%20starting%20Docker%20Desktop.");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=Email%20and%20password%20are%20required");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/signup?error=Supabase%20is%20not%20configured.%20Run%20./setup.sh%20after%20starting%20Docker%20Desktop.");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/signup?error=Email%20and%20password%20are%20required");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  if (!hasSupabaseEnv()) {
    redirect("/");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/profile?error=Supabase%20is%20not%20configured.%20Run%20./setup.sh%20after%20starting%20Docker%20Desktop.");
  }

  const user = await requireUser();
  const fullName = String(formData.get("full_name") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", user.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?success=Profile%20updated");
}

export async function uploadAvatar(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirect("/profile?error=Supabase%20is%20not%20configured.%20Run%20./setup.sh%20after%20starting%20Docker%20Desktop.");
  }

  const user = await requireUser();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/profile?error=Please%20select%20an%20image%20file");
  }

  if (!file.type.startsWith("image/")) {
    redirect("/profile?error=Avatar%20must%20be%20an%20image%20file");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    redirect("/profile?error=Avatar%20must%20be%208MB%20or%20smaller");
  }

  const supabase = await createClient();
  const filePath = `${user.id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (uploadError) {
    redirect(`/profile?error=${encodeURIComponent(uploadError.message)}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) {
    redirect(`/profile?error=${encodeURIComponent(updateError.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?success=Avatar%20updated");
}
