import Link from "next/link";
import { getCities, getCriteria, getDistricts, getLastCity, getProfile, getUser } from "@/lib/data";
import { rankDistricts } from "@/lib/matching";
import { getTipsForDistrict, TIP_CATEGORIES } from "@/lib/tips";
import Icon from "@/components/Icon";
import PlaceSearch from "@/components/PlaceSearch";
import RecentChecks from "@/components/RecentChecks";
import DistrictExplorer from "@/components/DistrictExplorer";

export const dynamic = "force-dynamic";

/** Start „Suche zuerst“: oben der Lage-Check für gebuchte Unterkünfte, darunter Viertel finden (Quiz) oder selbst stöbern. */
export default async function Home() {
  const [criteria, cities, lastCity, user] = await Promise.all([getCriteria(), getCities(), getLastCity(), getUser()]);
  const city = cities.find((c) => c.slug === lastCity && c.districtCount > 0) ?? cities.find((c) => c.districtCount > 0) ?? cities[0];
  const [{ weights }, districts] = await Promise.all([getProfile(criteria), city ? getDistricts(city.slug) : Promise.resolve([])]);
  const top = weights && districts.length ? rankDistricts(districts, weights)[0] : null;
  const tipDistrict = top ?? districts[0];
  const tip = tipDistrict ? (await getTipsForDistrict(tipDistrict.id).catch(() => []))[0] : undefined;
  const tipCat = tip ? TIP_CATEGORIES.find((c) => c.key === tip.category) : undefined;

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between">
        <Link href={user ? "/konto" : "/login"} aria-label="Konto" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
          <Icon name="user" size={20} />
        </Link>
        {city && (
          <Link href="/reise" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
            {city.name} <Icon name="down" size={14} />
          </Link>
        )}
        <Link
          href={city ? `/ergebnis?stadt=${city.slug}` : "/reise"}
          aria-label="Viertel auf der Karte"
          className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan"
        >
          <Icon name="map" size={20} />
        </Link>
      </div>

      <h1 className="mega mt-7 text-[clamp(2.4rem,11vw,2.9rem)]">
        Wo schläfst
        <br />
        du heute?
      </h1>

      <div className="mt-5">
        <PlaceSearch near={city ? { lat: city.lat, lon: city.lng } : undefined} />
      </div>

      <p className="mt-2.5 px-1 text-[13px] text-muted">Schon gebucht? Prüf hier, wie gut deine Unterkunft liegt.</p>

      {city && districts.length > 0 && (
        <section className="mt-9">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-extrabold">Viertel in {city.name}</h2>
            <Link href={`/ergebnis?stadt=${city.slug}`} className="text-sm font-semibold text-muted">
              Alle
            </Link>
          </div>

          <Link
            href={top ? `/kiez/${top.slug}?stadt=${city.slug}` : `/quiz?stadt=${city.slug}`}
            className="press glow-card mt-3 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
              <Icon name="discover" size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">
                {top ? `Dein Viertel: ${top.name.split(" (")[0]} · ${top.match} %` : "Welches Viertel passt zu mir?"}
              </span>
              <span className="block text-[13px] text-muted">
                {top ? "Passt am besten zu deinem Reise-Profil" : "7 kurze Fragen, dann zeigen wir dir dein Viertel"}
              </span>
            </span>
            <Icon name="chevron" size={16} className="text-faint" />
          </Link>

          <p className="mb-3 mt-6 text-[13px] font-semibold text-muted">{top ? "Alle Viertel, sortiert nach deinem Profil" : "Oder selbst stöbern:"}</p>
          <DistrictExplorer
            variant="cards"
            districts={(top ? rankDistricts(districts, weights!) : districts).map((d) => ({
              slug: d.slug,
              city: d.city,
              name: d.name,
              short: d.short_description,
              scores: d.scores,
              match: "match" in d ? (d as { match: number }).match : undefined,
            }))}
          />
        </section>
      )}

      <RecentChecks />

      {tip && tipDistrict && (
        <section className="mt-7">
          <h2 className="mb-3 font-display text-[19px] font-extrabold">Tipp von Reisenden</h2>
          <Link href={`/kiez/${tipDistrict.slug}`} className="press block rounded-[18px] bg-paper px-4 py-3.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <Icon name={tipCat?.icon ?? "tip"} size={14} /> {tipCat?.label ?? "Tipp"} · {tipDistrict.name.split(" (")[0]}
            </span>
            <span className="mt-1.5 block text-[15px] leading-snug">{tip.body}</span>
          </Link>
        </section>
      )}
    </div>
  );
}
