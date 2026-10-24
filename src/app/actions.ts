"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CITY_COOKIE, PROFILE_COOKIE, encodeProfile } from "@/lib/data";

function safeNext(v: FormDataEntryValue | null) {
  const n = String(v || "/");
  return /^\/(?![\/\\])[^\s\\]*$/.test(n) ? n : "/";
}

export type FormState = { error?: string; message?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "E-Mail oder Passwort ist falsch." };
  await syncProfileFromCookie();
  redirect(safeNext(formData.get("next")));
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
  if (error) {
    if (/password/i.test(error.message)) return { error: "Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen mit Zahlen oder Sonderzeichen." };
    return { error: "Registrierung hat nicht geklappt. Prüf deine E-Mail-Adresse oder versuch es später nochmal." };
  }
  if (data.session) redirect(safeNext(formData.get("next")));
  return { message: "Fast geschafft! Falls die Adresse neu ist, haben wir dir einen Bestätigungslink geschickt." };
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

const YEAR = 60 * 60 * 24 * 365;

/** Reise-Profil dauerhaft speichern: im Browser (Cookie) und – falls eingeloggt – im Konto. */
export async function storeProfile(weights: Record<string, number>, city?: string) {
  const clean = Object.fromEntries(
    Object.entries(weights)
      .filter(([k]) => /^[a-z_]{2,20}$/.test(k))
      .map(([k, v]) => [k, Math.min(5, Math.max(0, Math.round(Number(v) || 0)))]),
  );
  const jar = await cookies();
  jar.set(PROFILE_COOKIE, encodeProfile(clean), { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
  if (city && /^[a-z-]{2,40}$/.test(city)) jar.set(CITY_COOKIE, city, { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
  await savePreferences(clean);
  revalidatePath("/", "layout");
}

/** Wer das Quiz ohne Konto gemacht hat, bekommt sein Profil beim Anmelden ins Konto übernommen. */
export async function syncProfileFromCookie() {
  const raw = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!raw) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { count } = await supabase
    .from("user_preferences")
    .select("criterion_key", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (count) return;
  const weights = Object.fromEntries(
    raw
      .split(",")
      .map((p) => p.split(":"))
      .filter(([k, v]) => /^[a-z_]{2,20}$/.test(k) && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Math.min(5, Math.max(0, Math.round(Number(v))))]),
  );
  if (Object.keys(weights).length) await savePreferences(weights);
}

export async function rememberCity(city: string) {
  if (!/^[a-z-]{2,40}$/.test(city)) return;
  (await cookies()).set(CITY_COOKIE, city, { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
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

export type TipInput = {
  lat: number;
  lon: number;
  placeName?: string;
  districtId?: string | null;
  category: string;
  body: string;
};

const TIP_CATEGORY_KEYS = ["laerm", "sicherheit", "anbindung", "essen", "unterkunft", "sonstiges"];

/** Tipp von Reisenden speichern. Gibt eine Fehlermeldung zurück oder null. */
export async function addTip(input: TipInput, returnTo: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);

  const body = input.body.trim().replace(/\s+/g, " ");
  if (body.length < 10) return "Schreib bitte mindestens 10 Zeichen.";
  if (body.length > 280) return "Maximal 280 Zeichen.";
  if (/https?:\/\/|www\./i.test(body)) return "Bitte keine Links in Tipps.";
  if (!TIP_CATEGORY_KEYS.includes(input.category)) return "Wähl eine Kategorie.";
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) return "Ort fehlt.";

  // Schutz vor Spam: max. 5 Tipps pro Stunde
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("place_tips")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) return "Du hast gerade viele Tipps geschrieben. Versuch es später nochmal.";

  const { error } = await supabase.from("place_tips").insert({
    user_id: user.id,
    lat: input.lat,
    lon: input.lon,
    place_name: input.placeName?.slice(0, 120) ?? null,
    district_id: input.districtId ?? null,
    category: input.category,
    body,
  });
  if (error) return "Speichern hat nicht geklappt. Versuch es nochmal.";
  revalidatePath(returnTo.split("?")[0]);
  return null;
}

export async function reportTip(tipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("tip_reports").upsert({ tip_id: tipId, user_id: user.id }, { onConflict: "tip_id,user_id", ignoreDuplicates: true });
}

export async function deleteTip(tipId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("place_tips").delete().eq("id", tipId).eq("user_id", user.id);
  revalidatePath(path);
}
