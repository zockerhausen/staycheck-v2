"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import Icon from "@/components/Icon";
import { applyStayCheckTheme, MAP_STYLE } from "@/lib/mapTheme";
import { isDarkNow } from "@/components/ThemeSwitch";

/** Eine Unterkunft aus der Liste, so wie sie auf der Karte erscheint (Nummer = Platz in der Liste) */
export type StayPin = { name: string; lat: number; lon: number; match: number; meta: string; rating?: string; href: string; booking?: string; /** knapp außerhalb der guten Lage (grau) */ out?: boolean };

/**
 * Die Karte zu den Unterkünften: die gute Lage rund um den Ort als violette Fläche (echte Form, kein Kreis),
 * darin die Unterkünfte violett mit Lage-Wert, knapp außerhalb grau. Eine Unterkunft gewählt (Liste oder Karte):
 * nur sie bleibt, die Karte fliegt hin, unten eine Karte mit Preis-Knopf. Die Fläche bleibt immer sichtbar.
 */
export default function StayMap({
  stays,
  area,
  sel,
  onSel,
}: {
  stays: StayPin[];
  area: { lat: number; lon: number; radius: number; name: string; rings?: [number, number][][] };
  sel: number | null;
  onSel: (i: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const pinsRef = useRef<HTMLButtonElement[]>([]);
  const onSelRef = useRef(onSel);
  onSelRef.current = onSel;
  const [ready, setReady] = useState(false);
  const inside = stays.filter((s) => !s.out).length;

  // Ausschnitt: die ganze Fläche und alle Unterkünfte
  const fitAll = (m: import("maplibre-gl").Map, animate: boolean) => {
    const pts: number[][] = [...(area.rings ?? []).flat(), ...stays.map((s) => [s.lon, s.lat])];
    if (!area.rings?.length) {
      const dLat = area.radius / 111_320;
      const dLon = dLat / Math.cos((area.lat * Math.PI) / 180);
      pts.push([area.lon - dLon, area.lat - dLat], [area.lon + dLon, area.lat + dLat]);
    }
    if (pts.length < 2) pts.push([area.lon - 0.005, area.lat - 0.004], [area.lon + 0.005, area.lat + 0.004]);
    m.fitBounds(
      [
        [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))],
        [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))],
      ],
      { padding: { top: 64, bottom: 36, left: 28, right: 64 }, maxZoom: 16, duration: animate ? 700 : 0 },
    );
  };

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let map: import("maplibre-gl").Map | undefined;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !ref.current) return;
      maplibregl.setWorkerUrl(`/maplibre/worker-${maplibregl.getVersion()}.mjs`);
      const m = new maplibregl.Map({
        container: ref.current,
        style: isDarkNow() ? MAP_STYLE.dark : MAP_STYLE.light,
        center: [area.lon, area.lat],
        zoom: 14,
        attributionControl: { compact: true },
        dragRotate: false,
        cooperativeGestures: true,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Strg + Scrollen zum Zoomen",
          "CooperativeGesturesHandler.MacHelpText": "⌘ + Scrollen zum Zoomen",
          "CooperativeGesturesHandler.MobileHelpText": "Mit zwei Fingern bewegen",
        },
      });
      map = m;
      mapRef.current = m;
      fitAll(m, false);
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      // Zahlen an den kleinen Punkten, sobald man etwa eine Stufe näher ist als die Startansicht (oder sowieso nah dran)
      const base = m.getZoom();
      const onZoom = () => m.getContainer().classList.toggle("sc-zoomed", m.getZoom() >= Math.min(base + 0.9, 15.5));
      m.on("zoom", onZoom);
      m.once("load", onZoom);
      m.once("load", () => ref.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
      const onTheme = () => m.setStyle(isDarkNow() ? MAP_STYLE.dark : MAP_STYLE.light);
      window.addEventListener("sc-theme", onTheme);
      m.on("remove", () => window.removeEventListener("sc-theme", onTheme));
      m.on("style.load", () => {
        applyStayCheckTheme(m, isDarkNow());
        addArea(m, area);
      });
      // Rangfolge fürs Auge: die 3 besten groß und kräftig, die nächsten 7 klein mit Zahl, der Rest als blasse Punkte
      // (Zahl erst beim Hineinzoomen), knapp außerhalb als graue Punkte. Wichtige liegen immer obenauf.
      const rank = new Map([...stays.keys()].filter((i) => !stays[i].out).sort((a, b) => stays[b].match - stays[a].match).map((i, r) => [i, r]));
      pinsRef.current = stays.map((s, i) => {
        const el = document.createElement("button");
        el.type = "button";
        const r = rank.get(i) ?? 999;
        const tier = s.out ? "sc-pin sc-pin-dot sc-pin-out" : r < 3 ? "sc-pin sc-pin-best" : r < 10 ? "sc-pin sc-pin-mid" : "sc-pin sc-pin-dot";
        el.className = tier;
        el.dataset.tier = tier;
        el.dataset.z = String(s.out ? 1 : r < 3 ? 40 - r : r < 10 ? 20 : 10);
        el.style.zIndex = el.dataset.z;
        el.textContent = String(s.match);
        el.setAttribute("aria-label", `${s.name}, Lage ${s.match}${s.out ? ", knapp außerhalb der guten Lage" : ""}`);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelRef.current(i);
        });
        new maplibregl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(m);
        return el;
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      setReady(false);
      pinsRef.current = [];
      mapRef.current = null;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stays, area.lat, area.lon, area.radius, area.rings]);

  // Auswahl: nur diese Unterkunft zeigen und hinfliegen; ohne Auswahl wieder alle
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    pinsRef.current.forEach((el, i) => {
      el.style.display = sel === null || sel === i ? "" : "none";
      el.classList.toggle("sc-pin-top", sel === i);
      if (sel === i) el.style.zIndex = "60";
      else if (el.dataset.z) el.style.zIndex = el.dataset.z;
    });
    const s = sel !== null ? stays[sel] : null;
    if (s) m.flyTo({ center: [s.lon, s.lat], zoom: 16, padding: { top: 40, bottom: 150, left: 0, right: 0 }, duration: 900 });
    else fitAll(m, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, ready]);

  const s = sel !== null ? stays[sel] : null;
  return (
    <div className="relative h-full w-full">
      {/* Höhe direkt setzen: das Karten-CSS macht den Behälter „position: relative“, „absolute inset-0“ hätte dann Höhe 0 */}
      <div ref={ref} className="h-full w-full" />
      {s ? (
        <>
          <button
            type="button"
            onClick={() => onSel(null)}
            className="press glass absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-[var(--sc-glass-line)] py-2 pl-2.5 pr-3.5 text-[13px] font-extrabold shadow-soft"
          >
            <Icon name="back" size={15} /> Alle {stays.length} zeigen
          </button>
          <div className="glass absolute inset-x-3 bottom-3 z-10 rounded-[22px] border border-[var(--sc-glass-line)] p-3 shadow-soft">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full text-white ${s.out ? "bg-[#8a87a3]" : "bg-sun"}`}>
                <b className="text-[15px] font-extrabold leading-none">{s.match}</b>
                <span className="text-[8px] font-extrabold uppercase leading-none tracking-wide opacity-80">Lage</span>
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[16px] font-extrabold leading-snug">{s.name}</b>
                <span className="block truncate text-[13px] font-semibold text-muted">
                  {[s.out ? "Knapp außerhalb" : null, s.rating ? `★ ${s.rating}` : null, s.meta].filter(Boolean).join(" · ")}
                </span>
              </span>
              <button type="button" onClick={() => onSel(null)} aria-label="Auswahl schließen" className="press -m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <Icon name="close" size={16} />
              </button>
            </div>
            <div className="mt-2.5 flex gap-2">
              <Link href={s.href} className="press flex flex-1 items-center justify-center rounded-full bg-tan py-2.5 text-[14px] font-extrabold">
                Lage-Details
              </Link>
              {s.booking && (
                <a
                  href={s.booking}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="press flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-sun py-2.5 text-[14px] font-extrabold text-white"
                >
                  Preis ansehen <Icon name="external" size={14} fill="transparent" />
                </a>
              )}
            </div>
            {s.booking && (
              <p className="mt-2 px-1 text-[11.5px] font-semibold leading-snug text-muted">Anzeige. Wir suchen sie bei Booking, Agoda, Expedia und Hotels.com und öffnen den passenden Anbieter.</p>
            )}
          </div>
        </>
      ) : (
        <span className="glass pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-[var(--sc-glass-line)] px-3 py-[7px] text-[12.5px] font-extrabold shadow-soft">
          <span className="h-3 w-3 shrink-0 rounded-full border-2 border-[#5340f2] bg-[#5340f2]/25" />
          <span className="truncate">
            {area.name} · {area.rings?.length ? `${inside} drin${stays.length > inside ? `, ${stays.length - inside} knapp daneben` : ""}` : `${stays.length} ${stays.length === 1 ? "Unterkunft" : "Unterkünfte"}`}
          </span>
        </span>
      )}
    </div>
  );
}


/** Die gute Lage als Fläche: zart gefüllt, kräftig umrandet. Ohne Umriss: der Suchkreis, gestrichelt. */
function addArea(m: import("maplibre-gl").Map, area: { lat: number; lon: number; radius: number; rings?: [number, number][][] }) {
  let rings: [number, number][][] = area.rings ?? [];
  const circle = !rings.length;
  if (circle) {
    const ring: [number, number][] = [];
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * 2 * Math.PI;
      const dLat = (area.radius * Math.sin(a)) / 111_320;
      const dLon = (area.radius * Math.cos(a)) / (111_320 * Math.cos((area.lat * Math.PI) / 180));
      ring.push([area.lon + dLon, area.lat + dLat]);
    }
    rings = [ring];
  }
  const before = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;
  try {
    m.addSource("sc-area", {
      type: "geojson",
      data: { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) } },
    });
    m.addLayer({ id: "sc-area-fill", type: "fill", source: "sc-area", paint: { "fill-color": "#5340f2", "fill-opacity": circle ? 0.06 : 0.16 } }, before);
    m.addLayer(
      {
        id: "sc-area-line",
        type: "line",
        source: "sc-area",
        layout: { "line-join": "round" },
        paint: { "line-color": "#6d5cff", "line-width": circle ? 2 : 3, "line-opacity": 0.9, ...(circle ? { "line-dasharray": [2, 1.5] } : {}) },
      },
      before,
    );
  } catch {
    // ohne Fläche weiter
  }
}
