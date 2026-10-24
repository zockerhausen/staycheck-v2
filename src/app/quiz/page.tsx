import { getCity, getLastCity } from "@/lib/data";
import QuizClient from "@/components/QuizClient";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const wanted = typeof params.stadt === "string" ? params.stadt : await getLastCity();
  const city = (await getCity(wanted)) ?? (await getCity("berlin"));
  return <QuizClient city={city?.slug ?? "berlin"} cityName={city?.name ?? "Berlin"} />;
}
