import Link from "next/link";
import { getCities, getCriteria, getLastCity, getSavedPlaces, resolveWeights, weightsToQuery } from "@/lib/data";
import PlaceSearch from "@/components/PlaceSearch";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const [criteria, cities, lastCity] = await Promise.all([getCriteria(), getCities(), getLastCity()]);
  const [{ weights, source }, places] = await Promise.all([resolveWeights(params, criteria), getSavedPlaces()]);
  // Profil-Gewichte nicht in Links schreiben – die App liest sie selbst aus dem Profil
  const query = weights && source === "url" ? weightsToQuery(weights) : "";
  const city = cities.find((c) => c.slug === lastCity);

  return (
    <div className="fade-up">
      <p className="text-center text-base font-bold">Lage-Check</p>
      <h1 className="mega mt-6 text-[2.1rem]">Wie gut liegt deine Unterkunft?</h1>
      <p className="mt-2 leading-relaxed text-muted">
        Name, Adresse oder Buchungslink. Klappt weltweit.
      </p>

      <div className="mt-5">
        <PlaceSearch weightsQuery={query} near={city ? { lat: city.lat, lon: city.lng } : undefined} autoFocus />
      </div>

      {!weights && (
        <Link href="/reise" className="press mt-6 flex items-center gap-3.5 rounded-[18px] border border-line bg-paper px-3.5 py-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
            <Icon name="star" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Noch persönlicher?</span>
            <span className="block text-[13px] text-muted">Mach das kurze Quiz, dann bewerten wir nach deinen Wünschen.</span>
          </span>
          <Icon name="chevron" size={16} className="text-faint" />
        </Link>
      )}

      {places.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 font-display text-[19px] font-extrabold">Gemerkt</h2>
          <ul>
            {places.slice(0, 5).map((p) => (
              <li key={p.id} className="border-b border-line last:border-0">
                <Link
                  href={`/check/ergebnis?${new URLSearchParams({
                    lat: String(p.lat),
                    lon: String(p.lon),
                    name: p.name,
                    sub: p.subtitle ?? "",
                    kind: p.kind,
                  })}${query ? `&${query}` : ""}`}
                  className="flex items-center gap-3.5 py-3"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan">
                    <Icon name="hotel" size={20} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{p.name}</span>
                  {p.match !== null && <span className="font-display text-[17px] font-extrabold text-sun-soft">{p.match}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/methode" className="mt-8 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted">
        <Icon name="check" size={16} /> Wie entsteht der Score?
      </Link>
    </div>
  );
}
