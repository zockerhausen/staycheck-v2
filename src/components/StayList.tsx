import Icon from "@/components/Icon";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import StaySelect from "@/components/StaySelect";
import { fmtScore } from "@/lib/reviews";
import type { StayItem } from "@/lib/stay-list";

type SaveProps = React.ComponentProps<typeof PlaceSaveButton>;

/**
 * Unterkünfte, Design 2: die drei besten in der guten Lage als Karten zum Wischen (mit kleiner Lage-Karte und Stärken),
 * darunter alle weiteren kompakt, zuletzt grau die knapp daneben. Antippen zeigt die Unterkunft oben auf der Karte.
 * Bewertungen erscheinen nur, wenn sie echt sind (sonst bleibt die Stelle leer).
 */
export default function StayList({
  items,
  rings,
  center,
  radius,
  href,
  save,
  budget,
  limit = Infinity,
  moreHref,
}: {
  /** Höchstens so viele Zeilen in der Liste (die Karte zeigt immer alle); moreHref zeigt dann alle */
  limit?: number;
  moreHref?: string;
  items: StayItem[];
  /** Budget pro Nacht (für die Unterzeile), null = egal */
  budget?: number | null;
  rings?: [number, number][][];
  center: { lat: number; lon: number };
  radius: number;
  href: (i: StayItem) => string;
  save: (i: StayItem) => SaveProps;
}) {
  const inside = items.filter((i) => !i.out);
  const top = inside.slice(0, 3);
  const restAll = inside.slice(3);
  const outAll = items.filter((i) => i.out);
  // Lange Listen kürzen (schnelle Seite), Rest per Knopf
  const room = Math.max(0, limit - top.length);
  const rest = restAll.slice(0, room);
  const out = outAll.slice(0, Math.max(0, room - rest.length));
  const hidden = restAll.length + outAll.length - rest.length - out.length;
  const idx = (i: StayItem) => items.indexOf(i);
  const sources = [...new Set(items.flatMap((i) => i.reviews?.platforms.map((p) => p.platform) ?? []))];

  return (
    <div className="mt-4">
      {top.length > 0 && (
        <>
          <h3 className="px-0.5 text-[19px] font-extrabold tracking-[-0.02em]">{rings?.length ? "Top in der guten Lage" : "Top-Lage"}</h3>
          <p className="px-0.5 text-[13px] font-semibold text-muted">Beste Lage für dich{budget ? `, bis ${budget} € pro Nacht` : ""}</p>
          <div className="stagger -mx-4 mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {top.map((i, n) => (
              <article key={i.key} className="w-[min(78vw,280px)] shrink-0 snap-start overflow-hidden rounded-[24px] border border-line bg-paper">
                <StaySelect n={idx(i)} label={`${i.name} auf der Karte zeigen`} className="press block w-full text-left">
                  <div className="relative h-[112px] bg-tan">
                    <MiniArea rings={rings} center={center} radius={radius} pin={i} />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-sun px-2.5 py-1 text-[13px] font-extrabold text-white shadow-soft">Lage {i.match}</span>
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-sand/85 px-2 py-1 text-[12px] font-extrabold backdrop-blur">#{n + 1}</span>
                  </div>
                  <div className="px-3.5 pt-3">
                    <b className="block truncate text-[17px] font-extrabold tracking-[-0.01em]">{i.name}</b>
                    <Meta i={i} />
                  </div>
                </StaySelect>
                <div className="px-3.5 pb-3.5">
                  {i.bars.length > 0 && (
                    <div className="mt-2.5 grid gap-1.5">
                      {i.bars.map((b) => (
                        <div key={b.label} className="grid grid-cols-[76px_1fr_22px] items-center gap-2 text-[12px] font-bold text-muted">
                          <span className="truncate">{b.label}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-tan">
                            <span className="block h-full rounded-full bg-sun" style={{ width: `${Math.max(4, Math.min(100, b.value * 10))}%` }} />
                          </span>
                          <b className="text-right text-ink">{Math.round(b.value)}</b>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {i.booking ? (
                      <a
                        href={i.booking}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        className="press flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sun py-2.5 text-[14px] font-extrabold text-white"
                      >
                        Preis ansehen <Icon name="external" size={14} fill="transparent" />
                      </a>
                    ) : (
                      <a href={href(i)} className="press flex flex-1 items-center justify-center rounded-full bg-tan py-2.5 text-[14px] font-extrabold">
                        Lage-Details
                      </a>
                    )}
                    <PlaceSaveButton compact {...save(i)} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {(rest.length > 0 || out.length > 0) && (
        <div className="card scroll-in mt-4 px-3.5 py-1">
          {rest.length > 0 && <Label text={`${top.length ? "Weitere" : "Unterkünfte"}${rings?.length ? " in der guten Lage" : ""} · ${restAll.length}`} tone="sun" />}
          <ol className="stagger">
            {rest.map((i) => (
              <Row key={i.key} i={i} n={idx(i)} />
            ))}
          </ol>
          {out.length > 0 && <Label text={`Knapp daneben · ${outAll.length}`} tone="muted" />}
          <ol>
            {out.map((i) => (
              <Row key={i.key} i={i} n={idx(i)} />
            ))}
          </ol>
          {hidden > 0 && moreHref && (
            <a href={moreHref} className="press my-2 flex items-center justify-center rounded-full bg-tan py-3 text-[14px] font-extrabold text-sun-soft">
              Alle {items.length} zeigen (+{hidden})
            </a>
          )}
        </div>
      )}

      <p className="mt-3 px-0.5 text-[12.5px] font-semibold leading-snug text-muted">
        Lage-Werte von StayCheck (OpenStreetMap-Daten).{" "}
        {sources.length
          ? `Bewertungen: ${sources.map((s) => (s === "tripadvisor" ? "Tripadvisor" : s === "stay22" ? "Booking & Co. (über Stay22)" : s)).join(", ")}. `
          : "Bewertungen zeigen wir, sobald echte Daten angeschlossen sind – wir erfinden keine. "}
        „Preis“ öffnet die Unterkunft beim passenden Anbieter (Anzeige).
      </p>
    </div>
  );
}

function Meta({ i }: { i: StayItem }) {
  const r = i.reviews;
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-[13px] font-semibold text-muted">
      {r && (
        <>
          <Icon name="star" size={13} fill="currentColor" className="shrink-0 text-[#ffc94a]" />
          <b className="text-ink">{fmtScore(r.fair)}</b>
          <span>({r.total.toLocaleString("de-DE")})</span>
          <span aria-hidden>·</span>
        </>
      )}
      <span className="truncate">{[i.kindLabel, i.price?.text].filter(Boolean).join(" · ")}</span>
    </span>
  );
}

function Label({ text, tone }: { text: string; tone: "sun" | "muted" }) {
  return <p className={`pb-0.5 pt-3 text-[11.5px] font-extrabold uppercase tracking-[0.06em] ${tone === "sun" ? "text-sun-soft" : "text-muted"}`}>{text}</p>;
}

function Row({ i, n }: { i: StayItem; n: number }) {
  return (
    <li className={`flex items-center gap-3 border-b border-line py-3 last:border-0 ${i.out ? "opacity-65" : ""}`}>
      <StaySelect n={n} label={`${i.name} auf der Karte zeigen`} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[14px] leading-none ${i.out ? "bg-tan text-muted" : "bg-peach text-sun-soft"}`}>
          <b className="text-[16px] font-extrabold">{i.match}</b>
          <span className="mt-0.5 text-[8px] font-extrabold tracking-[0.06em]">LAGE</span>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15.5px] font-extrabold">{i.name}</b>
          <Meta i={i} />
        </span>
      </StaySelect>
      {i.booking && (
        <a
          href={i.booking}
          target="_blank"
          rel="sponsored noopener noreferrer"
          aria-label={`Preis für ${i.name} ansehen (Anzeige)`}
          className="press flex shrink-0 items-center gap-0.5 text-[13.5px] font-extrabold text-sun-soft"
        >
          Preis <Icon name="chevron" size={14} />
        </a>
      )}
    </li>
  );
}

/** Kleine Lage-Karte: die gute Fläche (oder der Suchkreis) und wo die Unterkunft darin liegt */
function MiniArea({ rings, center, radius, pin }: { rings?: [number, number][][]; center: { lat: number; lon: number }; radius: number; pin: { lat: number; lon: number } }) {
  const W = 280;
  const H = 112;
  const k = Math.cos((center.lat * Math.PI) / 180);
  let shapes = rings ?? [];
  if (!shapes.length) {
    const ring: [number, number][] = [];
    for (let a = 0; a <= 48; a++) {
      const t = (a / 48) * 2 * Math.PI;
      ring.push([center.lon + (radius * Math.cos(t)) / (111_320 * k), center.lat + (radius * Math.sin(t)) / 111_320]);
    }
    shapes = [ring];
  }
  const pts = [...shapes.flat(), [pin.lon, pin.lat] as [number, number]];
  const xs = pts.map((p) => p[0] * k);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 12;
  const s = Math.min((W - 2 * pad) / Math.max(1e-9, x1 - x0), (H - 2 * pad) / Math.max(1e-9, y1 - y0));
  const ox = (W - (x1 - x0) * s) / 2;
  const oy = (H - (y1 - y0) * s) / 2;
  const P = ([lon, lat]: [number, number]) => [ox + (lon * k - x0) * s, H - (oy + (lat - y0) * s)] as const;
  const d = shapes.map((r) => r.map((p, n) => `${n ? "L" : "M"}${P(p)[0].toFixed(1)} ${P(p)[1].toFixed(1)}`).join("") + "Z").join("");
  const [px, py] = P([pin.lon, pin.lat]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <g stroke="currentColor" className="text-line" strokeWidth="1">
        {[0.2, 0.45, 0.7].map((f) => (
          <line key={`h${f}`} x1="0" x2={W} y1={H * f} y2={H * f + 8} />
        ))}
        {[0.18, 0.42, 0.66, 0.88].map((f) => (
          <line key={`v${f}`} y1="0" y2={H} x1={W * f} x2={W * f - 10} />
        ))}
      </g>
      <path d={d} fill="#5340f2" fillOpacity={rings?.length ? 0.22 : 0.08} stroke="#6d5cff" strokeWidth="2" strokeDasharray={rings?.length ? undefined : "5 4"} />
      <circle cx={px} cy={py} r="13" fill="#5340f2" fillOpacity="0.3" />
      <circle cx={px} cy={py} r="7" fill="#fff" />
      <circle cx={px} cy={py} r="4.2" fill="#5340f2" />
    </svg>
  );
}
