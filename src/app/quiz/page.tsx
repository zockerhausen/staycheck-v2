import { getCity, getLastCity } from "@/lib/data";
import { parseZiel, zielQuery } from "@/lib/ziel";
import QuizClient from "@/components/QuizClient";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Reiseziel ohne Handbewertung (z. B. Lissabon): danach zurück zu dessen Vierteln
  const ziel = parseZiel(params);
  if (ziel) return <QuizClient city="" cityName={ziel.ort} next={`/ziel?${zielQuery(ziel)}&neu=1`} />;
  const wanted = typeof params.stadt === "string" ? params.stadt : await getLastCity();
  const city = (await getCity(wanted)) ?? (await getCity("berlin"));
  return <QuizClient city={city?.slug ?? "berlin"} cityName={city?.name ?? "Berlin"} />;
}
