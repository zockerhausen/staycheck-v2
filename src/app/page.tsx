import Link from "next/link";
import { getChosenCity, getCities, getCriteria, getDistricts, getProfile, getUser } from "@/lib/data";
import { rankDistricts } from "@/lib/matching";
import { getTipsForDistrict, TIP_CATEGORIES } from "@/lib/tips";
import Icon from "@/components/Icon";
import RecentChecks from "@/components/RecentChecks";
import DistrictExplorer from "@/components/DistrictExplorer";
import DestinationSearch from "@/components/DestinationSearch";

export const dynamic = "force-dynamic";

/**
 * Start aus Sicht von Reisenden, die einen Trip planen:
 * 1) Wohin geht die Reise?  2) Dort: Viertel finden (Quiz) oder stöbern. Lage-Check gebuchter Unterkünfte: eigener Reiter unten.
 */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [criteria, cities, chosen, user] = await Promise.all([getCriteria(), getCities(), getChosenCity(), getUser()]);
  const ready = cities.filter((c) => c.districtCount > 0);
  const fromUrl = typeof params.ziel === "string" ? params.ziel : null;
  const wantsPicker = fromUrl === "neu";
  const city = wantsPicker ? undefined : ready.find((c) => c.slug === (fromUrl ?? chosen));

  const header = (
    <div className="flex items-center justify-between">
      <Link href={user ? "/konto" : "/login"} aria-label="Konto" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="user" size={20} />
      </Link>
      {city ? (
        <Link href="/?ziel=neu" className="press flex items-center gap-1.5 rounded-full bg-tan px-4 py-2.5 text-sm font-semibold">
          <Icon name="plane" size={15} /> {city.name} <Icon name="down" size={14} />
        </Link>
      ) : (
        <span className="text-base font-bold">StayCheck</span>
      )}
      <Link href="/check" aria-label="Lage-Check" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="search" size={20} />
      </Link>
    </div>
  );

  // Schritt 1: Noch kein Reiseziel gewählt
  if (!city) {
    return (
      <div className="fade-up">
        {header}
        <h1 className="mega mt-7 text-[clamp(2.4rem,11vw,2.9rem)]">
          Wohin geht
          <br />
          deine Reise?
        </h1>
        <p className="mt-3 leading-relaxed text-muted">Egal welche Stadt: Wir zeigen dir, welches Viertel zu dir passt und wo du am besten schläfst.</p>

        <div className="mt-6">
          <DestinationSearch verified={ready.map((c) => ({ slug: c.slug, name: c.name, country: c.country }))} />
        </div>

        <RecentChecks />
      </div>
    );
  }

  // Schritt 2: Reiseziel gewählt
  const [{ weights }, districts] = await Promise.all([getProfile(criteria), getDistricts(city.slug)]);
  const ranked = weights ? rankDistricts(districts, weights) : null;
  const top = ranked?.[0] ?? null;
  const tipDistrict = top ?? districts[0];
  const tip = tipDistrict ? (await getTipsForDistrict(tipDistrict.id).catch(() => []))[0] : undefined;
  const tipCat = tip ? TIP_CATEGORIES.find((c) => c.key === tip.category) : undefined;

  return (
    <div className="fade-up">
      {header}

      <p className="mt-7 text-xs font-bold uppercase tracking-[0.08em] text-[#ffb08f]">Deine Reise · {city.country}</p>
      <h1 className="mega mt-1 text-[clamp(2.2rem,10vw,2.7rem)]">Wo schläfst du in {city.name}?</h1>

      <Link
        href={top ? `/kiez/${top.slug}?stadt=${city.slug}` : `/quiz?stadt=${city.slug}`}
        className="press glow-card mt-6 flex items-center gap-3.5 rounded-[18px] px-3.5 py-3.5"
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
      {top && (
        <div className="mt-2.5 flex items-center justify-center gap-4 text-[13px] font-semibold text-muted">
          <Link href="/profil" className="flex items-center gap-1.5">
            <Icon name="sliders" size={14} /> Reise-Profil ändern
          </Link>
          <span className="text-faint">·</span>
          <Link href={`/quiz?stadt=${city.slug}`} className="flex items-center gap-1.5">
            <Icon name="refresh" size={14} /> Quiz neu machen
          </Link>
        </div>
      )}

      <section className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-extrabold">{top ? "Alle Viertel für dich" : "Oder selbst stöbern"}</h2>
          <Link href={`/ergebnis?stadt=${city.slug}`} className="text-sm font-semibold text-muted">
            Karte
          </Link>
        </div>
        <DistrictExplorer
          variant="cards"
          districts={(ranked ?? districts).map((d) => ({
            slug: d.slug,
            city: d.city,
            name: d.name,
            short: d.short_description,
            scores: d.scores,
            match: "match" in d ? (d as { match: number }).match : undefined,
          }))}
        />
      </section>

      <RecentChecks />

      {tip && tipDistrict && (
        <section className="mt-7">
          <h2 className="mb-3 font-display text-[19px] font-extrabold">Tipp von Reisenden</h2>
          <Link href={`/kiez/${tipDistrict.slug}?stadt=${city.slug}`} className="press block rounded-[18px] bg-paper px-4 py-3.5">
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
