import Link from "next/link";
import { getCities, getCriteria, getLastCity, getProfile } from "@/lib/data";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import CityButton from "@/components/CityButton";

export const dynamic = "force-dynamic";

/** „Ich suche noch“: erst Stadt wählen, dann Quiz (nur beim ersten Mal) oder direkt zum Ergebnis. */
export default async function ReisePage() {
  const [cities, criteria] = await Promise.all([getCities(), getCriteria()]);
  const [{ weights }, last] = await Promise.all([getProfile(criteria), getLastCity()]);
  const ready = cities.filter((c) => c.districtCount > 0);

  return (
    <div className="space-y-7 pt-2">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-semibold text-peach-ink">
          <Icon name="discover" size={16} fill="rgba(242,102,47,.22)" /> Ich suche noch
        </span>
        <h1 className="mt-3 font-display text-[2.3rem] font-extrabold leading-[1.05] tracking-tight">
          Wohin geht <span className="text-sun">die Reise?</span>
        </h1>
        <p className="mt-2 text-muted">
          {weights
            ? "Wir nutzen dein gespeichertes Reise-Profil. Wähl einfach die Stadt."
            : "Wähl deine Stadt. Danach kommt ein kurzes Quiz, das du nur einmal machst."}
        </p>
      </div>

      <div className="space-y-3">
        {ready.map((c) => (
          <CityButton
            key={c.slug}
            city={c.slug}
            href={weights ? `/ergebnis?stadt=${c.slug}&neu=1` : `/quiz?stadt=${c.slug}`}
            name={c.name}
            country={c.country}
            count={c.districtCount}
            highlight={c.slug === last}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted">
        Deine Stadt ist nicht dabei? Der{" "}
        <Link href="/check" className="font-semibold text-sun underline underline-offset-4">
          Lage-Check
        </Link>{" "}
        funktioniert für jedes Hotel weltweit.
      </p>

      {weights && (
        <section className="rounded-3xl border-2 border-b-[5px] border-line bg-paper p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Dein Reise-Profil</h2>
            <Link href="/profil" className="text-sm font-bold text-sun">
              Anpassen
            </Link>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
            {criteria.map((c) => (
              <li key={c.key} className="flex items-center gap-2 text-sm">
                <Icon name={CRITERION_ICON[c.key]} size={18} className="text-muted" />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                <span className="flex gap-0.5" aria-label={`${weights[c.key]} von 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={`h-2 w-2 rounded-full ${n <= weights[c.key] ? "bg-sun" : "bg-tan"}`} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/quiz" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted">
            <Icon name="refresh" size={16} /> Quiz nochmal machen
          </Link>
        </section>
      )}
    </div>
  );
}
