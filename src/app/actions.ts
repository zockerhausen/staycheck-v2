"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function safeNext(v: FormDataEntryValue | null) {
  const n = String(v || "/");
  return n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export type FormState = { error?: string; message?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "E-Mail oder Passwort ist falsch." };
  const next = String(formData.get("next") || "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(safeNext(formData.get("next")));
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

/** Speichert Präferenzen und merkt sich den Top-Kiez. */
export async function saveResult(weights: Record<string, number>, districtId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await savePreferences(weights);
  await supabase
    .from("favorites")
    .upsert({ user_id: user.id, district_id: districtId }, { onConflict: "user_id,district_id", ignoreDuplicates: true });
  revalidatePath("/", "layout");
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

export type PlaceInput = {
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  kind: string;
  match?: number;
};

/** Hotel oder Adresse merken bzw. wieder entfernen. Gibt den neuen Zustand zurück. */
export async function togglePlace(place: PlaceInput, isSaved: boolean): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (isSaved) {
    await supabase.from("saved_places").delete().eq("user_id", user.id).eq("lat", place.lat).eq("lon", place.lon);
  } else {
    await supabase.from("saved_places").upsert(
      {
        user_id: user.id,
        name: place.name.slice(0, 120),
        subtitle: place.subtitle?.slice(0, 200) ?? null,
        lat: place.lat,
        lon: place.lon,
        kind: place.kind.slice(0, 20),
        match: place.match ?? null,
      },
      { onConflict: "user_id,lat,lon", ignoreDuplicates: true },
    );
  }
  revalidatePath("/favoriten");
  return !isSaved;
}
