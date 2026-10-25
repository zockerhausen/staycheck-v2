import Link from "next/link";
import { redirect } from "next/navigation";
import { getCriteria, getExtras, getProfile, getSavedPlaces, getUser } from "@/lib/data";
import { after } from "next/server";
import { autoCityCached, DEFAULT_WEIGHTS, distance, hotelsNearCached, locationMatch, withDeadline, type HotelResult } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { pickZones } from "@/lib/zones";
import ZoneLegend from "@/components/ZoneLegend";
import AskDistrict from "@/components/AskDistrict";
import { assistantEnabled } from "@/lib/assistant";
import { personalMatch } from "@/lib/profile";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { characterOf, characterTint, traitsOf } from "@/lib/character";
import { CRITERION_ICON } from "@/lib/icons";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import KiezMap from "@/components/KiezMap";
import PlaceSaveButton from "@/components/PlaceSaveButton";

export const fetchCache = "default-cache";
export const maxDuration = 120; // erste Berechnung einer Stadt kann dauern (läuft nach der Antwort weiter)

const KIND_LABEL: Record<string, string> = { hotel: "Hotel", hostel: "Hostel", guest_house: "Pension", apartment: "Apartment" };
const FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "hostel", label: "Hostels" },
  { key: "hotel", label: "Hotels" },
  { key: "guest_house", label: "Pensionen" },
  { key: "apartment", label: "Apartments" },
];

/** Ein automatisch gefundenes Viertel in einer Stadt ohne Handbewertung, mit Unterkünften nach Lage. */
export default async function AutoViertelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ziel = parseZiel(params);
  const vlat = Number(params.vlat);
  const vlon = Number(params.vlon);
  const name = typeof params.name === "string" ? params.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80) : "";
  if (!ziel || !name || !Number.isFinite(vlat) || !Number.isFinite(vlon) || Math.abs(vlat) > 85 || Math.abs(vlon) > 180) redirect("/?ziel=neu");
  const zq = zielQuery(ziel);
  const back = `/ziel?${zq}`;
  const filter = typeof params.typ === "string" && FILTERS.some((f) => f.key === params.typ) ? params.typ : "alle";
  const self = `/ziel/viertel?${zq}&${new URLSearchParams({ name, vlat: vlat.toFixed(5), vlon: vlon.toFixed(5) })}`;

  if (!(await pageRateLimit("ziel-viertel", 15))) {
    return <p className="card mt-8 p-5 text-sm text-muted">Zu viele Anfragen in kurzer Zeit. Warte eine Minute und lade die Seite neu.</p>;
  }

  const criteria = await getCriteria();
  const cityWork = autoCityCached(ziel.lat, ziel.lon).catch(() => null);
  const [{ weights: profile }, user, saved, cityRaw] = await Promise.all([
    getProfile(criteria),
    getUser(),
    getSavedPlaces(),
    withDeadline(cityWork, 6_000),
  ]);
  if (cityRaw === "slow") after(() => cityWork);
  const cityData = cityRaw === "slow" ? null : cityRaw;
  const weights = profile ?? DEFAULT_WEIGHTS;
  const districts = cityData?.districts ?? [];
  const zones = cityData ? pickZones(cityData.zones, weights) : [];
  const district = districts.find((d) => distance(d.lat, d.lon, vlat, vlon) < 300);

  let hotels: HotelResult[] = [];
  let failed = false;
  const work = hotelsNearCached({ lat: Number(vlat.toFixed(5)), lon: Number(vlon.toFixed(5)) }, null, weights, 800, name);
  const raced = await withDeadline(work.catch(() => null), 9_000);
  const slow = raced === "slow";
  if (slow) after(() => work.catch(() => undefined));
  else if (raced === null) failed = true;
  else hotels = raced;
  // Persönlicher Match inkl. Extras und Muss (Liste neu sortieren)
  if (profile) {
    const ex = await getExtras();
    if (ex.items.length) {
      hotels = hotels
        .map((h) => ({ ...h, match: personalMatch(h.scores, weights, ex).match }))
        .sort((a, b) => b.match - a.match);
    }
  }
  const shown = filter === "alle" ? hotels : hotels.filter((h) => h.kind === filter);
  const isSaved = (h: HotelResult) => saved.some((p) => Math.abs(p.lat - h.lat) < 1e-6 && Math.abs(p.lon - h.lon) < 1e-6);
  const checkUrl = (h: HotelResult) =>
    `/check/ergebnis?${new URLSearchParams({ lat: h.lat.toFixed(6), lon: h.lon.toFixed(6), name: h.name, sub: `${h.subtitle}, ${ziel.ort}`, kind: h.kind })}`;
  const scores = district?.scores ?? {};
  const pool = districts.map((d) => d.scores);
  const match = district && profile ? locationMatch(district.scores, profile) : null;

  return (
    <div className="fade-up space-y-7">
      <section
        className="-mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))] px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]"
        style={{ background: `linear-gradient(180deg, ${characterTint(scores, pool)} 0%, #1a120e 55%, #0c0c0e 100%)` }}
      >
        <Link href={back} aria-label="Zurück" className="press flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur">
          <Icon name="back" size={18} />
        </Link>
        <p className="mt-16 text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">
          {ziel.ort} · {match !== null ? `${match} % Match` : district ? characterOf(scores, pool) : "Viertel"}
        </p>
        <h1 className="mega mt-1 text-[clamp(2.2rem,11vw,3.1rem)] [overflow-wrap:anywhere]">{name}</h1>
        {district && (
          <p className="mt-2 text-[15px] text-[#c9c0bb]">{district.distKm < 1.5 ? "Im Zentrum" : `${String(district.distKm).replace(".", ",")} km vom Zentrum`}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {traitsOf(scores, pool).map((t) => (
            <span key={t.key} className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-semibold">
              <Icon name={t.icon} size={14} /> {t.label}
            </span>
          ))}
        </div>
        {!profile && (
          <Link href={`/quiz?${zq}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sun-soft">
            Passt das zu mir? Reise-Profil in 30 Sek. <Icon name="chevron" size={14} />
          </Link>
        )}
      </section>

      {district && (
        <section className="card px-5 py-2">
          {criteria.map((c) => {
            const v = district.scores[c.key];
            return (
              <div key={c.key} className="border-b border-line py-3 last:border-0">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex w-32 shrink-0 items-center gap-2 font-semibold">
                    <Icon name={CRITERION_ICON[c.key]} size={18} /> {c.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised">
                    {v !== null && v !== undefined && (
                      <span className={`bar-grow block h-full rounded-full ${v <= 4 ? "bg-faint" : "bg-sun"}`} style={{ width: `${v * 10}%` }} />
                    )}
                  </span>
                  <span className="w-7 text-right font-extrabold tabular-nums">{v === null || v === undefined ? "–" : Math.round(v)}</span>
                </div>
                <p className="mt-1 pl-[26px] text-xs text-muted">{district.reasons[c.key]}</p>
              </div>
            );
          })}
          <p className="py-3 text-xs leading-relaxed text-muted">
            Automatisch aus OpenStreetMap, gezählt rund um die Mitte des Viertels. Jede Unterkunft unten prüfen wir einzeln genauer.
          </p>
        </section>
      )}

      <AskDistrict
        target={{ art: "auto", ort: ziel.ort, land: ziel.land, lat: ziel.lat, lon: ziel.lon, name, vlat, vlon }}
        place={name}
        enabled={assistantEnabled()}
      />

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-extrabold">Beste Lage im Viertel</h2>
          {!failed && !slow && <span className="text-sm text-muted">{shown.length} gefunden</span>}
        </div>
        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" aria-label="Unterkunftsart">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`${self}&typ=${f.key}`}
              scroll={false}
              className={`press shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${filter === f.key ? "bg-ink text-sand" : "bg-tan"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>

        {slow ? (
          <StillLoading title="Wir prüfen die Unterkünfte …" text="Für jede Unterkunft schauen wir uns die Umgebung an. Beim ersten Mal dauert das etwas, die Seite lädt von selbst neu." />
        ) : failed ? (
          <p className="card mt-4 p-4 text-sm text-muted">Die Kartendaten sind gerade überlastet. Lade die Seite in einer Minute neu.</p>
        ) : shown.length === 0 ? (
          <p className="card mt-4 p-4 text-sm text-muted">Hier haben wir in OpenStreetMap keine passenden Unterkünfte gefunden.</p>
        ) : (
          <>
            <div className="mt-4">
              <KiezMap
                points={shown.slice(0, 25).map((h, i) => ({ slug: `h${i}`, name: h.name, lat: h.lat, lng: h.lon, match: h.match }))}
                highlight="h0"
                center={[vlon, vlat]}
                zoom={14}
                height="h-60"
                zones={zones}
              />
              <ZoneLegend personal={Boolean(profile)} shown={zones.length > 0} />
            </div>
            <ol className="mt-2">
              {shown.slice(0, 25).map((h, i) => (
                <li key={`${h.lat}-${h.lon}`} id={`kiez-h${i}`} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <span className="w-5 shrink-0 font-bold text-faint">{i + 1}</span>
                  <Link href={checkUrl(h)} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-raised">
                      <Icon name="hotel" size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{h.name}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {KIND_LABEL[h.kind] ?? "Unterkunft"} · {h.highlights[0]?.text ?? ""}
                      </span>
                    </span>
                    <span className="font-display text-[17px] font-extrabold tabular-nums text-sun-soft">{h.match}</span>
                  </Link>
                  <PlaceSaveButton
                    compact
                    place={{ name: h.name, subtitle: h.subtitle, lat: h.lat, lon: h.lon, kind: h.kind, match: h.match }}
                    initiallySaved={isSaved(h)}
                    loggedIn={Boolean(user)}
                    returnTo={self}
                  />
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted">Tippe auf eine Unterkunft für Details, Begründung und Preise.</p>
          </>
        )}
      </section>
    </div>
  );
}
