"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; message?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "E-Mail oder Passwort ist falsch." };
  const next = String(formData.get("next") || "/finden");
  redirect(next.startsWith("/") ? next : "/finden");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/finden` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/finden");
  return { message: "Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben." };
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function savePreferences(weights: Record<string, number>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const rows = Object.entries(weights).map(([criterion_key, weight]) => ({
    user_id: user.id,
    criterion_key,
    weight,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from("user_preferences").upsert(rows);
}

export async function toggleFavorite(districtId: string, isFavorite: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (isFavorite) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("district_id", districtId);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, district_id: districtId });
  }
  revalidatePath("/", "layout");
}
