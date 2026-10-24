"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CITY_COOKIE, EXTRAS_COOKIE, PROFILE_COOKIE, encodeProfile } from "@/lib/data";
import { cleanExtras, decodeExtras, encodeExtras, type Extras } from "@/lib/profile";

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
  // Nicht den „Origin“-Header nehmen (von außen fälschbar), sondern die Adresse, unter der die App läuft
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `https://${host}` : "";
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

/** Konto endgültig löschen: Datenbank löscht alle Nutzerdaten mit, danach Cookies weg. */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "LÖSCHEN") {
    return { error: "Tippe LÖSCHEN ein, um zu bestätigen." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/konto");
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "Das hat nicht geklappt. Versuche es später noch einmal." };
  await supabase.auth.signOut().catch(() => undefined);
  const jar = await cookies();
  for (const c of [PROFILE_COOKIE, EXTRAS_COOKIE, CITY_COOKIE]) jar.delete(c);
  redirect("/?geloescht=1");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isCoord = (lat: unknown, lon: unknown) =>
  typeof lat === "number" && typeof lon === "number" && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

export async function savePreferences(weights: Record<string, number>) {
  if (!weights || typeof weights !== "object") return;
  // Nur bekannte Schlüssel-Form und Gewichte 0–5 (die Datenbank prüft das zusätzlich)
  weights = Object.fromEntries(
    Object.entries(weights)
      .filter(([k, v]) => /^[a-z_]{2,20}$/.test(k) && Number.isFinite(Number(v)))
      .slice(0, 20)
      .map(([k, v]) => [k, Math.min(5, Math.max(0, Math.round(Number(v))))]),
  );
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
export async function storeProfile(weights: Record<string, number>, city?: string, extrasInput?: Partial<Extras>) {
  const clean = Object.fromEntries(
    Object.entries(weights)
      .filter(([k]) => /^[a-z_]{2,20}$/.test(k))
      .map(([k, v]) => [k, Math.min(5, Math.max(0, Math.round(Number(v) || 0)))]),
  );
  const jar = await cookies();
  jar.set(PROFILE_COOKIE, encodeProfile(clean), { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
  if (city && /^[a-z-]{2,40}$/.test(city)) jar.set(CITY_COOKIE, city, { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
  await savePreferences(clean);
  if (extrasInput !== undefined) await storeExtras(extrasInput);
  // Kein revalidatePath("/"): das würde alle gespeicherten Kartendaten für alle Nutzer löschen.
  // Die Seiten lesen das Profil bei jedem Aufruf frisch aus dem Cookie.
}

/** Extras (mit wem, was in Laufweite, Muss) speichern: Cookie und – falls eingeloggt – Konto. */
export async function storeExtras(input: Partial<Extras>) {
  const e = cleanExtras(input);
  (await cookies()).set(EXTRAS_COOKIE, encodeExtras(e), { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ travel_with: e.wer, extras: e.items, must_have: e.must }).eq("id", user.id);
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
  const extras = decodeExtras((await cookies()).get(EXTRAS_COOKIE)?.value);
  if (extras.wer || extras.items.length) {
    await supabase.from("profiles").update({ travel_with: extras.wer, extras: extras.items, must_have: extras.must }).eq("id", user.id);
  }
}

export async function rememberCity(city: string) {
  if (!/^[a-z-]{2,40}$/.test(city)) return;
  (await cookies()).set(CITY_COOKIE, city, { maxAge: YEAR, path: "/", sameSite: "lax", secure: true, httpOnly: true });
}

/** Speichert Präferenzen und merkt sich den Top-Kiez. */
export async function saveResult(weights: Record<string, number>, districtId: string) {
  if (typeof districtId !== "string" || !UUID.test(districtId)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await savePreferences(weights);
  await supabase
    .from("favorites")
    .upsert({ user_id: user.id, district_id: districtId }, { onConflict: "user_id,district_id", ignoreDuplicates: true });
}

export async function toggleFavorite(districtId: string, isFavorite: boolean) {
  if (typeof districtId !== "string" || !UUID.test(districtId)) return;
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
  if (!place || typeof place.name !== "string" || !isCoord(place.lat, place.lon)) return Boolean(isSaved);
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
        subtitle: typeof place.subtitle === "string" ? place.subtitle.slice(0, 200) : null,
        lat: place.lat,
        lon: place.lon,
        kind: typeof place.kind === "string" && /^[a-z_]{1,20}$/.test(place.kind) ? place.kind : "other",
        match: Number.isFinite(place.match) ? Math.min(100, Math.max(0, Math.round(place.match as number))) : null,
      },
      { onConflict: "user_id,lat,lon", ignoreDuplicates: true },
    );
  }
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
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(returnTo))}`);
  if (!input || typeof input.body !== "string" || typeof input.category !== "string") return "Ungültige Eingabe.";

  const body = input.body.trim().replace(/\s+/g, " ");
  if (body.length < 10) return "Schreib bitte mindestens 10 Zeichen.";
  if (body.length > 280) return "Maximal 280 Zeichen.";
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|de|net|org|io|co|me|ly|app|info|biz|th|vn|ru|xyz)\b/i.test(body)) return "Bitte keine Links in Tipps.";
  if (!TIP_CATEGORY_KEYS.includes(input.category)) return "Wähl eine Kategorie.";
  if (!isCoord(input.lat, input.lon)) return "Ort fehlt.";
  if (input.districtId != null && (typeof input.districtId !== "string" || !UUID.test(input.districtId))) return "Ungültiges Viertel.";

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
    place_name: typeof input.placeName === "string" ? input.placeName.slice(0, 120) : null,
    district_id: input.districtId ?? null,
    category: input.category,
    body,
  });
  if (error) return "Speichern hat nicht geklappt. Versuch es nochmal.";
  return null; // die Seite lädt sich selbst neu (router.refresh), ohne Zwischenspeicher zu leeren
}

export async function reportTip(tipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (typeof tipId !== "string" || !UUID.test(tipId)) return;
  await supabase.from("tip_reports").upsert({ tip_id: tipId, user_id: user.id }, { onConflict: "tip_id,user_id", ignoreDuplicates: true });
}

export async function deleteTip(tipId: string, path: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (typeof tipId !== "string" || !UUID.test(tipId)) return;
  void path;
  await supabase.from("place_tips").delete().eq("id", tipId).eq("user_id", user.id);
}
