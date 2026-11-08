import { getCity, getLastCity } from "@/lib/data";
import { parseZiel, zielQuery } from "@/lib/ziel";
import QuizClient from "@/components/QuizClient";
import { precomputedBySlug, precomputedCovering, type PreCity } from "@/lib/precomputed";
import type { CityQuizInfo } from "@/lib/quiz";

/** Was die Daten über die Stadt hergeben: Strände in Laufweite vieler Unterkünfte, bekannteste Sehenswürdigkeiten */
function quizInfo(c: PreCity | null): CityQuizInfo | null {
  if (!c) return null;
  const rated = c.hotels.filter((h) => h.full);
  const nearBeach = rated.filter((h) => ((h.full!.scores as Record<string, number | null>).strand ?? 0) >= 6).length;
  const sights = [...new Set([...c.sights].filter((s) => s.k === "attraction").sort((a, b) => b.w - a.w).map((s) => s.n))];
  return { beach: rated.length >= 20 && nearBeach / rated.length >= 0.15, sights: sights.length >= 8 ? sights.slice(0, 2) : [] };
}

export const dynamic = "force-dynamic";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Reiseziel ohne Handbewertung (z. B. Lissabon): danach zurück zu dessen Vierteln
  const ziel = parseZiel(params);
  if (ziel) {
    const info = quizInfo(await precomputedCovering(ziel.lat, ziel.lon).catch(() => null));
    return <QuizClient city="" cityName={ziel.ort} cityInfo={info} next={`/ziel?${zielQuery(ziel)}&neu=1`} />;
  }
  const wanted = typeof params.stadt === "string" ? params.stadt : await getLastCity();
  const city = (await getCity(wanted)) ?? (await getCity("berlin"));
  const info = quizInfo(await precomputedBySlug(city?.slug ?? "berlin").catch(() => null));
  return <QuizClient city={city?.slug ?? "berlin"} cityName={city?.name ?? "Berlin"} cityInfo={info} />;
}
