"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import Icon from "@/components/Icon";
import { addZones } from "@/components/KiezMap";
import { applyStayCheckTheme, MAP_STYLE } from "@/lib/mapTheme";
import { isDarkNow } from "@/components/ThemeSwitch";
import type { ZonePoint } from "@/lib/zones";

/** Eine Unterkunft aus der Liste, so wie sie auf der Karte erscheint (Nummer = Platz in der Liste) */
export type StayPin = { name: string; lat: number; lon: number; match: number; meta: string; rating?: string; href: string; booking?: string };

/**
 * Die Karte zu den Unterkünften: das Viertel violett umrandet, darin alle Unterkünfte mit ihrem Lage-Wert,
 * dazu leuchtend die besten Stellen im Viertel. Eine Unterkunft gewählt (Liste oder Karte): nur sie bleibt,
 * die Karte fliegt hin, unten eine Karte mit Preis-Knopf. Viertel und Leuchten bleiben immer sichtbar.
 */
export default function StayMap({
  stays,
  zones: allZones,
  area,
  sel,
  onSel,
}: {
  stays: StayPin[];
  zones: ZonePoint[];
  area: { lat: number; lon: number; radius: number; name: string };
  sel: number | null;
  onSel: (i: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const pinsRef = useRef<HTMLButtonElement[]>([]);
  const onSelRef = useRef(onSel);
  onSelRef.current = onSel;
  const [ready, setReady] = useState(false);
  const center = area;
  // Leuchten nur im Viertel (sonst lenkt es zu Stellen, an denen wir gar nichts anbieten)
  const zones = allZones.filter((z) => distM(z, area) <= area.radius);

  // Ausschnitt: das ganze Viertel
  const fitAll = (m: import("maplibre-gl").Map, animate: boolean) => {
    const dLat = area.radius / 111_320;
    const dLon = dLat / Math.cos((area.lat * Math.PI) / 180);
    m.fitBounds(
      [
        [area.lon - dLon, area.lat - dLat],
        [area.lon + dLon, area.lat + dLat],
      ],
      { padding: { top: 56, bottom: 24, left: 16, right: 16 }, duration: animate ? 700 : 0 },
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
        center: [center.lon, center.lat],
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
      m.once("load", () => ref.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
      const onTheme = () => m.setStyle(isDarkNow() ? MAP_STYLE.dark : MAP_STYLE.light);
      window.addEventListener("sc-theme", onTheme);
      m.on("remove", () => window.removeEventListener("sc-theme", onTheme));
      m.on("style.load", () => {
        applyStayCheckTheme(m, isDarkNow());
        addArea(m, area);
        if (zones.length) addZones(m, zones, 350, center.lat);
      });
      // Jede Unterkunft mit ihrem Lage-Wert; die drei besten kräftig, der Rest kleiner
      const rank = new Map([...stays.keys()].sort((a, b) => stays[b].match - stays[a].match).map((i, r) => [i, r]));
      pinsRef.current = stays.map((s, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = (rank.get(i) ?? 99) < 3 ? "sc-pin sc-pin-good" : "sc-pin sc-pin-dim";
        el.textContent = String(s.match);
        el.setAttribute("aria-label", `${i + 1}. ${s.name}, Lage ${s.match}`);
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
  }, [stays, allZones, area.lat, area.lon, area.radius]);

  // Auswahl: nur diese Unterkunft zeigen und hinfliegen; ohne Auswahl wieder alle
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !ready) return;
    pinsRef.current.forEach((el, i) => {
      el.style.display = sel === null || sel === i ? "" : "none";
      el.classList.toggle("sc-pin-top", sel === i);
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
              <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full bg-sun text-white">
                <b className="text-[15px] font-extrabold leading-none">{s.match}</b>
                <span className="text-[8px] font-extrabold uppercase leading-none tracking-wide opacity-80">Lage</span>
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[16px] font-extrabold leading-snug">{s.name}</b>
                <span className="block truncate text-[13px] font-semibold text-muted">
                  {[s.rating ? `★ ${s.rating}` : null, s.meta].filter(Boolean).join(" · ")}
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
            {area.name} · {stays.length} {stays.length === 1 ? "Unterkunft" : "Unterkünfte"}
          </span>
        </span>
      )}
    </div>
  );
}

const distM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lon - b.lon) * 111_320 * Math.cos((b.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

/** Das Viertel als Fläche: zart gefüllt, kräftig umrandet */
function addArea(m: import("maplibre-gl").Map, area: { lat: number; lon: number; radius: number }) {
  const ring: [number, number][] = [];
  for (let k = 0; k <= 72; k++) {
    const a = (k / 72) * 2 * Math.PI;
    const dLat = (area.radius * Math.sin(a)) / 111_320;
    const dLon = (area.radius * Math.cos(a)) / (111_320 * Math.cos((area.lat * Math.PI) / 180));
    ring.push([area.lon + dLon, area.lat + dLat]);
  }
  const before = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;
  try {
    m.addSource("sc-area", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } } });
    m.addLayer({ id: "sc-area-fill", type: "fill", source: "sc-area", paint: { "fill-color": "#5340f2", "fill-opacity": 0.07 } }, before);
    m.addLayer(
      { id: "sc-area-line", type: "line", source: "sc-area", paint: { "line-color": "#5340f2", "line-width": 2.5, "line-opacity": 0.85, "line-dasharray": [2, 1.5] } },
      before,
    );
  } catch {
    // ohne Fläche weiter
  }
}
