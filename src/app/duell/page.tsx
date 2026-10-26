import { CITY_RADIUS, VERIFIED_RADIUS } from "@/lib/popular";
import Link from "next/link";
import { getChosenCity, getChosenZiel, getCities, getCriteria, getDistricts, resolveWeights } from "@/lib/data";
import DuelTabs from "@/components/DuelTabs";
import CitySwitcher from "@/components/CitySwitcher";
import StillLoading from "@/components/StillLoading";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import { cityDataQuick, DEFAULT_WEIGHTS } from "@/lib/geo";
import { findSpots } from "@/lib/zones";
import { weightedMatch } from "@/lib/profile";
import { parseZiel, zielQuery, type Ziel } from "@/lib/ziel";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const selectClass = "w-full appearance-none rounded-[18px] bg-paper px-3 py-3 text-center font-display text-base font-bold";

type Contestant = { key: string; name: string; kind: "Ecke" | "Viertel"; scores: Record<string, number | null>; href: string };

/**
 * Viertel-Duell für das aktuelle Reiseziel – jede Stadt, nicht nur die geprüften.
 * Gegeneinander antreten können Bezirke und die kleinen Ecken aus dem Raster.
 */
export default async function DuellPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [criteria, allCities, chosenCity, chosenZiel] = await Promise.all([getCriteria(), getCities(), getChosenCity(), getChosenZiel()]);
  const verified = allCities.filter((c) => c.districtCount > 0);
  const { weights } = await resolveWeights(params, criteria);
  const w = weights ?? DEFAULT_WEIGHTS;

  // Welche Stadt? Adresse > gewähltes Reiseziel > erste geprüfte Stadt
  const urlCity = typeof params.stadt === "string" ? verified.find((c) => c.slug === params.stadt) : undefined;
  const urlZiel = parseZiel(params);
  const city = urlCity ?? (urlZiel ? undefined : verified.find((c) => c.slug === chosenCity));
  const ziel: Ziel | null = city ? null : (urlZiel ?? chosenZiel);
  const fallback = !city && !ziel ? verified[0] : undefined;
  const active = city ?? fallback;

  const cityName = active?.name ?? ziel?.ort ?? "";
  const lat = active ? active.lat : ziel!.lat;
  const lon = active ? active.lng : ziel!.lon;
  const radius = active ? VERIFIED_RADIUS : CITY_RADIUS;
  const zq = active
    ? zielQuery({ ort: active.name, land: active.country, lat: Number(active.lat.toFixed(4)), lon: Number(active.lng.toFixed(4)) })
    : zielQuery(ziel!);

  const [dbDistricts, cd] = await Promise.all([active ? getDistricts(active.slug) : Promise.resolve([]), cityDataQuick(lat, lon, radius, 6000)]);

  const spotHref = (name: string, la: number, lo: number) =>
    `/ziel/viertel?${zq}&${new URLSearchParams({ name, vlat: la.toFixed(5), vlon: lo.toFixed(5), ...(radius === VERIFIED_RADIUS ? { rad: String(VERIFIED_RADIUS) } : {}) })}`;
  const contestants: Contestant[] = [
    ...(cd ? findSpots(cd.zones, w, cd.places, cd.step, 8) : []).map((s) => ({
      key: `e-${s.slug}`,
      name: s.name,
      kind: "Ecke" as const,
      scores: s.scores,
      href: spotHref(s.name, s.lat, s.lon),
    })),
    ...(active
      ? dbDistricts.map((d) => ({
          key: `v-${d.slug}`,
          name: d.name.split(" (")[0],
          kind: "Viertel" as const,
          scores: d.scores,
          href: `/kiez/${d.slug}?stadt=${d.city}`,
        }))
      : (cd?.districts ?? []).map((d) => ({
          key: `v-${d.slug}`,
          name: d.name,
          kind: "Viertel" as const,
          scores: d.scores,
          href: spotHref(d.name, d.lat, d.lon),
        }))),
  ];

  const header = (
    <>
      <DuelTabs active="kieze" />
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="mega text-[2.1rem]">Viertel-Duell</h1>
          <p className="mt-1 text-muted">Zwei Gegenden, eine Entscheidung.</p>
        </div>
        <CitySwitcher current={cityName} verified={verified.map((c) => ({ slug: c.slug, name: c.name, country: c.country }))} />
      </div>
    </>
  );

  if (contestants.length < 2) {
    return (
      <div className="pt-2">
        {header}
        <StillLoading
          title={`Wir erkunden ${cityName} …`}
          text="Für das Duell brauchen wir die Gegenden der Stadt. Beim ersten Mal dauert das etwas, die Seite lädt von selbst neu."
        />
      </div>
    );
  }

  const a = contestants.find((c) => c.key === params.a) ?? contestants[0];
  const b = contestants.find((c) => c.key === params.b && c.key !== a.key) ?? contestants.find((c) => c.key !== a.key)!;

  // Nur Runden, für die beide Seiten Daten haben
  const rounds = criteria.filter((c) => a.scores[c.key] != null && b.scores[c.key] != null);
  const winsA = rounds.filter((c) => (a.scores[c.key] as number) > (b.scores[c.key] as number)).length;
  const winsB = rounds.filter((c) => (b.scores[c.key] as number) > (a.scores[c.key] as number)).length;
  const matchA = weightedMatch(a.scores, w);
  const matchB = weightedMatch(b.scores, w);
  const winner = matchA === matchB ? null : matchA > matchB ? a : b;
  const options = (["Ecke", "Viertel"] as const).map((kind) => ({ kind, list: contestants.filter((c) => c.kind === kind) })).filter((g) => g.list.length);

  return (
    <div className="pt-2">
      {header}

      <form className="mt-5">
        {active ? <input type="hidden" name="stadt" value={active.slug} /> : null}
        {!active &&
          Object.entries(Object.fromEntries(new URLSearchParams(zq))).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {(["a", "b"] as const).map((side, i) => (
            <div key={side} className="contents">
              {i === 1 && <span className="text-sm font-extrabold text-faint">VS</span>}
              <select name={side} defaultValue={side === "a" ? a.key : b.key} className={selectClass} aria-label={side === "a" ? "Erste Gegend" : "Zweite Gegend"}>
                {options.map((g) => (
                  <optgroup key={g.kind} label={g.kind === "Ecke" ? "Ecken" : "Viertel"}>
                    {g.list.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>
        <button className="btn-chunky mt-3 w-full">
          <Icon name="duel" size={22} fill="#ffffff55" /> Duell starten
        </button>
      </form>

      <section className="mt-6">
        <div className="pop-in grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {[
            { c: a, m: matchA },
            { c: b, m: matchB },
          ].map(({ c, m }, i) => (
            <div key={c.key} className="contents">
              {i === 1 && <span className="text-sm font-extrabold text-faint">VS</span>}
              <div
                className={`min-w-0 rounded-3xl px-3 py-4 text-center ${
                  winner?.key === c.key ? "bg-gradient-to-br from-[#3a1c0e] to-paper outline outline-[1.5px] outline-sun" : "bg-paper"
                }`}
              >
                <b className="block font-display text-[40px] font-extrabold leading-none tracking-tight">{m}</b>
                <span className="mt-1 block truncate text-sm font-bold">{c.name}</span>
                <span className="block text-[11px] text-muted">{c.kind}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-sm text-muted">
          {winner ? `${winner.name} gewinnt${weights ? " für dich" : ""}` : "Unentschieden"} · Runden {winsA}:{winsB}
        </p>
      </section>

      <section className="card mt-5 p-5">
        <div className="space-y-3">
          {rounds.map((c) => {
            const sa = Math.round(a.scores[c.key] as number);
            const sb = Math.round(b.scores[c.key] as number);
            return (
              <div key={c.key}>
                <p className="mb-1 flex items-center justify-center gap-1 text-xs font-semibold text-muted">
                  <Icon name={CRITERION_ICON[c.key]} size={16} /> {c.label}
                </p>
                <div className="grid grid-cols-2 items-center gap-2">
                  <Bar value={sa} win={sa > sb} side="left" />
                  <Bar value={sb} win={sb > sa} side="right" />
                </div>
              </div>
            );
          })}
        </div>
        {rounds.length < criteria.length && (
          <p className="mt-4 text-center text-xs text-muted">Runden ohne Daten auf einer Seite (z. B. Sicherheit) zählen nicht.</p>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[a, b].map((c) => (
          <Link key={c.key} href={c.href} className="press flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-tan px-3 py-3 text-sm font-bold">
            <Icon name="hotel" size={18} className="shrink-0" /> <span className="truncate">Unterkünfte {c.name}</span>
          </Link>
        ))}
      </div>

      {!weights && (
        <p className="mt-4 text-center text-sm text-muted">
          Tipp:{" "}
          <Link href={active ? `/quiz?stadt=${active.slug}` : `/quiz?${zq}`} className="font-semibold text-sun-soft underline underline-offset-4">
            Mach zuerst das Quiz
          </Link>
          , dann entscheidet dein persönlicher Match das Duell.
        </p>
      )}
    </div>
  );
}

function Bar({ value, win, side }: { value: number; win: boolean; side: "left" | "right" }) {
  return (
    <div className={`flex items-center gap-2 ${side === "left" ? "flex-row-reverse" : ""}`}>
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-raised" style={{ justifyContent: side === "left" ? "flex-end" : "flex-start" }}>
        <div className={`h-full rounded-full ${win ? "bg-sun" : "bg-faint"}`} style={{ width: `${value * 10}%` }} />
      </div>
      <span className={`w-5 text-center text-sm tabular-nums ${win ? "font-extrabold text-sun-soft" : "font-semibold"}`}>{value}</span>
    </div>
  );
}
