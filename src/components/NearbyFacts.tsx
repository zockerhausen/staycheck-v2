import Icon from "@/components/Icon";
import { precomputedCovering } from "@/lib/precomputed";
import { distance } from "@/lib/score";

const KIND: Record<string, string> = {
  attraction: "Sehenswürdigkeit",
  museum: "Museum",
  viewpoint: "Aussichtspunkt",
  gallery: "Galerie",
  zoo: "Zoo",
  monument: "Denkmal",
  castle: "Burg / Schloss",
  ruins: "Ruine",
  city_gate: "Stadttor",
  archaeological_site: "Ausgrabung",
};

/** Ehrliche Fakten rund um eine Ecke: was zu Fuß erreichbar ist und wie weit der Flughafen ist. */
export default async function NearbyFacts({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const pre = await precomputedCovering(lat, lon);
  if (!pre) return null;
  // Gehzeit: Luftlinie × 1,3 (Umwege), 80 m pro Minute
  const walk = (m: number) => Math.max(1, Math.round((m * 1.3) / 80));
  const sights = pre.sights
    .map((s) => ({ ...s, d: distance(lat, lon, s.lat, s.lon) }))
    .filter((s) => walk(s.d) <= 15)
    .sort((a, b) => b.w - a.w || a.d - b.d)
    .slice(0, 6);
  // Die zwei nächsten Flughäfen (oft gibt es einen großen und einen kleineren in Stadtnähe)
  const airports = pre.airports
    .map((a) => ({ ...a, km: Math.round(distance(lat, lon, a.lat, a.lon) / 100) / 10 }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 2);
  if (!sights.length && !airports.length) return null;

  return (
    <section className="card p-5">
      <h2 className="font-display text-[19px] font-extrabold">Rund um {name}</h2>
      {sights.length > 0 && (
        <>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.06em] text-muted">In 15 Minuten zu Fuß</p>
          <ul className="mt-2 divide-y divide-line">
            {sights.map((s) => (
              <li key={`${s.n}-${s.lat}`} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tan text-sun-soft">
                  <Icon name="eye" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{s.n}</span>
                  <span className="block text-xs text-muted">{KIND[s.k] ?? "Sehenswert"}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums">{walk(s.d)} Min.</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {airports.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-tan px-3.5 py-3">
          <Icon name="plane" size={18} className="mt-0.5 shrink-0 text-sun-soft" />
          <span className="text-sm leading-relaxed">
            {airports.map((a, i) => (
              <span key={a.iata} className="block">
                <b>{a.iata}</b> {a.n}: {String(a.km).replace(".", ",")} km Luftlinie{i === airports.length - 1 ? "." : ""}
              </span>
            ))}
            <span className="mt-1 block text-muted">Den besten Weg von dort kennt „Frag das Viertel“ oben.</span>
          </span>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Gehzeit geschätzt aus der Entfernung (Luftlinie plus Umwege). Daten: OpenStreetMap, Flughäfen: OurAirports. Stand {pre.generated}.
      </p>
    </section>
  );
}
