import Link from "next/link";
import { getCriteria, getSavedPlaces, resolveWeights, weightsToQuery } from "@/lib/data";
import PlaceSearch from "@/components/PlaceSearch";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const criteria = await getCriteria();
  const [{ weights, source }, places] = await Promise.all([resolveWeights(params, criteria), getSavedPlaces()]);
  // Profil-Gewichte nicht in Links schreiben – die App liest sie selbst aus dem Profil
  const query = weights && source === "url" ? weightsToQuery(weights) : "";

  return (
    <div className="pt-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-semibold text-peach-ink">
        <Icon name="check" size={16} fill="#fff" /> Lage-Check
      </span>
      <h1 className="mt-3 font-display text-[2.3rem] font-extrabold leading-[1.05] tracking-tight">
        Liegt dein Hotel <span className="text-sun">richtig?</span>
      </h1>
      <p className="mt-2 text-muted">
        Gib dein Hotel, Hostel oder eine Adresse ein. Wir prüfen die Umgebung: Bahn, Bars, Essen, Ruhe und Grün.
      </p>

      <div className="mt-6">
        <PlaceSearch weightsQuery={query} />
      </div>

      {!weights && (
        <Link
          href="/quiz"
          className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-4 text-sm"
        >
          <Icon name="star" size={28} className="text-sun" />
          <span>
            <span className="block font-semibold">Noch persönlicher?</span>
            <span className="text-muted">Mach zuerst das Quiz, dann bewerten wir die Lage nach deinen Wünschen.</span>
          </span>
        </Link>
      )}

      {places.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Zuletzt gemerkt</h2>
          <ul className="mt-3 space-y-2">
            {places.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/check/ergebnis?${new URLSearchParams({
                    lat: String(p.lat),
                    lon: String(p.lon),
                    name: p.name,
                    sub: p.subtitle ?? "",
                    kind: p.kind,
                  })}${query ? `&${query}` : ""}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-line bg-paper px-4 py-3"
                >
                  <Icon name="hotel" size={24} className="text-sun" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                  {p.match !== null && <span className="font-display font-extrabold text-sun">{p.match}%</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
