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
 * Unsere Karte zu den Unterkünften: alle aus der Liste als Nummern, dazu violett die beste Lage.
 * Eine Unterkunft gewählt (in der Liste oder auf der Karte): nur sie bleibt, die Karte fliegt hin, unten eine Karte mit Preis-Knopf.
 * Die violette Lage bleibt immer sichtbar.
 */
export default function StayMap({
  stays,
  zones,
  center,
  sel,
  onSel,
}: {
  stays: StayPin[];
  zones: ZonePoint[];
  center: { lat: number; lon: number };
  sel: number | null;
  onSel: (i: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const pinsRef = useRef<HTMLButtonElement[]>([]);
  const onSelRef = useRef(onSel);
  onSelRef.current = onSel;
  const [ready, setReady] = useState(false);

  // Ausschnitt mit allen Unterkünften (und dem Viertel)
  const fitAll = (m: import("maplibre-gl").Map, animate: boolean) => {
    const pts = [...stays.map((s) => [s.lon, s.lat]), [center.lon, center.lat]];
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    if (pts.length < 2) {
      m.easeTo({ center: [center.lon, center.lat], zoom: 14.5, duration: animate ? 600 : 0 });
      return;
    }
    m.fitBounds(
      [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ],
      { padding: { top: 64, bottom: 48, left: 44, right: 44 }, maxZoom: 15.5, duration: animate ? 700 : 0 },
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
        if (zones.length) addZones(m, zones, 350, center.lat);
      });
      // Nummern wie in der Liste; die ersten drei kräftig
      pinsRef.current = stays.map((s, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = i < 3 ? "sc-pin sc-pin-good" : "sc-pin";
        el.textContent = String(i + 1);
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
  }, [stays, zones]);

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
      <div ref={ref} className="absolute inset-0" />
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun text-[15px] font-extrabold text-white">{sel! + 1}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[16px] font-extrabold leading-snug">{s.name}</b>
                <span className="block truncate text-[13px] font-semibold text-muted">
                  Lage {s.match}
                  {s.rating ? ` · ★ ${s.rating}` : ""} · {s.meta}
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
          </div>
        </>
      ) : (
        zones.length > 0 && (
          <span className="glass pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-[var(--sc-glass-line)] px-3 py-[7px] text-[12.5px] font-extrabold shadow-soft">
            <span className="h-3 w-3 shrink-0 rounded-full bg-[#5340f2]/60 blur-[1px]" />
            Violett = beste Lage für dich
          </span>
        )
      )}
    </div>
  );
}
