import Link from "next/link";
import { redirect } from "next/navigation";
import { getCities, getCriteria, getProfile } from "@/lib/data";
import { after } from "next/server";
import { autoDistrictsCached, distance, locationMatch, withDeadline, type AutoDistrict } from "@/lib/geo";
import StillLoading from "@/components/StillLoading";
import { parseZiel, zielQuery } from "@/lib/ziel";
import { pageRateLimit } from "@/lib/ratelimit-page";
import Icon from "@/components/Icon";
import DistrictExplorer from "@/components/DistrictExplorer";
import KiezMap from "@/components/KiezMap";

// Kartendaten-Abfragen werden zwischengespeichert (1 Tag), die Seite selbst ist dynamisch.
export const fetchCache = "default-cache";
export const maxDuration = 120; // erste Berechnung einer Stadt kann dauern (läuft nach der Antwort weiter)

/** Reiseziel ohne unsere Handbewertung: Viertel automatisch aus OpenStreetMap. */
export default async function ZielPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ziel = parseZiel(params);
  if (!ziel) redirect("/?ziel=neu");

  // Geprüfte Stadt in der Nähe? Dann lieber unsere handbewerteten Viertel.
  const cities = await getCities();
  const known = cities.find((c) => c.districtCount > 0 && distance(ziel.lat, ziel.lon, c.lat, c.lng) < 30_000);
  if (known) redirect(`/?ziel=${known.slug}`);

  const header = (
    <div className="flex items-center justify-between">
      <Link href="/?ziel=neu" aria-label="Anderes Reiseziel" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="back" size={18} />
      </Link>
      <Link href="/?ziel=neu" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
        <Icon name="plane" size={15} /> {ziel.ort} <Icon name="down" size={14} />
      </Link>
      <Link href="/check" aria-label="Lage-Check" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="search" size={20} />
      </Link>
    </div>
  );

  if (!(await pageRateLimit("ziel", 12))) {
    return (
      <div className="fade-up">
        {header}
        <p className="card mt-8 p-5 text-sm text-muted">Zu viele Anfragen in kurzer Zeit. Warte eine Minute und lade die Seite neu.</p>
      </div>
    );
  }

  const criteria = await getCriteria();
  const work = autoDistrictsCached(ziel.lat, ziel.lon).catch(() => null as AutoDistrict[] | null);
  const [{ weights }, raced] = await Promise.all([getProfile(criteria), withDeadline(work, 45_000)]);
  // Erste Berechnung einer Stadt zu langsam? Im Hintergrund fertig rechnen, Seite lädt von selbst neu.
  if (raced === "slow") after(() => work);
  const slow = raced === "slow";
  const districts = slow ? [] : raced;
  const zq = zielQuery(ziel);
  const viertelHref = (d: AutoDistrict) =>
    `/ziel/viertel?${zq}&${new URLSearchParams({ name: d.name.slice(0, 80), vlat: d.lat.toFixed(5), vlon: d.lon.toFixed(5) })}`;
  const list = (districts ?? []).map((d) => ({ ...d, match: weights ? locationMatch(d.scores, weights) : undefined }));
  const sorted = weights ? [...list].sort((a, b) => (b.match ?? 0) - (a.match ?? 0)) : list;
  const top = weights ? sorted[0] : undefined;

  return (
    <div className="fade-up">
      {header}
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">Deine Reise{ziel.land ? ` · ${ziel.land}` : ""}</p>
      <h1 className="mega mt-1 text-[clamp(2.2rem,10vw,2.7rem)] [overflow-wrap:anywhere]">Wo schläfst du in {ziel.ort}?</h1>

      {slow ? (
        <StillLoading
          title={`Wir erkunden ${ziel.ort} …`}
          text="Beim ersten Mal zählen wir für jedes Viertel Bahn, Bars, Essen und Parks. Das dauert etwas, die Seite lädt von selbst neu."
        />
      ) : districts === null ? (
        <div className="card mt-6 p-5">
          <p className="font-bold">Die Kartendaten sind gerade überlastet.</p>
          <p className="mt-1 text-sm text-muted">Lade die Seite in einer Minute neu. Den Lage-Check für eine Unterkunft kannst du schon nutzen.</p>
        </div>
      ) : districts.length === 0 ? (
        <div className="card mt-6 p-5">
          <p className="font-bold">Für {ziel.ort} kennt die Karte keine Stadtteile.</p>
          <p className="mt-1 text-sm text-muted">Das ist bei kleineren Orten normal. Prüf einfach direkt die Lage deiner Unterkunft.</p>
        </div>
      ) : (
        <>
          <Link
            href={top ? viertelHref(top) : `/quiz?${zq}`}
            className="press glow-card mt-6 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
              <Icon name="discover" size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">{top ? `Dein Viertel: ${top.name} · ${top.match} %` : "Welches Viertel passt zu mir?"}</span>
              <span className="block text-[13px] text-muted">
                {top ? "Passt am besten zu deinem Reise-Profil" : "7 kurze Fragen, dann zeigen wir dir dein Viertel"}
              </span>
            </span>
            <Icon name="chevron" size={16} className="text-faint" />
          </Link>

          <section className="mt-7">
            <h2 className="mb-3 font-display text-[19px] font-extrabold">{top ? "Alle Viertel für dich" : "Oder selbst stöbern"}</h2>
            <DistrictExplorer
              variant="cards"
              districts={sorted.map((d) => ({
                slug: d.slug,
                city: "",
                name: d.name,
                short: d.distKm < 1.5 ? "Im Zentrum" : `${String(d.distKm).replace(".", ",")} km vom Zentrum`,
                scores: d.scores,
                match: d.match,
                href: viertelHref(d),
              }))}
            />
            <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
              <Icon name="flag" size={14} className="mt-0.5 shrink-0" />
              <span>
                Automatisch aus OpenStreetMap berechnet, gröber als bei geprüften Städten. Sicherheit kennen wir hier noch nicht.{" "}
                <Link href="/methode" className="font-semibold text-sun-soft underline underline-offset-4">
                  So rechnen wir
                </Link>
              </span>
            </p>
          </section>

          <section className="mt-7">
            <KiezMap
              points={sorted.map((d) => ({ slug: d.slug, name: d.name, lat: d.lat, lng: d.lon, match: d.match ?? 0, label: d.name }))}
              center={[ziel.lon, ziel.lat]}
              zoom={11.5}
              height="h-64"
            />
          </section>
        </>
      )}
    </div>
  );
}
