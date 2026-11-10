import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export type OAuthProvider = "google" | "apple";
export const OAUTH_LABEL: Record<OAuthProvider, string> = { google: "Google", apple: "Apple" };

/**
 * Welche Anmelde-Anbieter im Supabase-Projekt eingeschaltet sind (öffentliche Auskunft, ohne geheimen Schlüssel).
 * Die Knöpfe erscheinen von selbst, sobald ein Anbieter dort aktiviert ist. Bei Fehler: keine Knöpfe.
 */
export async function enabledProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    const ext = ((await res.json()) as { external?: Record<string, unknown> }).external ?? {};
    return (["apple", "google"] as const).filter((p) => ext[p] === true);
  } catch {
    return [];
  }
}
