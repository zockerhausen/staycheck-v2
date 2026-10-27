"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import { applyStayCheckTheme, MAP_STYLE } from "@/lib/mapTheme";
import { isDarkNow } from "@/components/ThemeSwitch";
import type { ZonePoint } from "@/lib/zones";

export type MapPoint = { slug: string; name: string; lat: number; lng: number; match: number; label?: string };

/** Karte mit Match-Punkten: je höher der Match, desto größer und kräftiger der Punkt. */
function MapCanvas({
  points,
  highlight,
  onSelect,
  center = [13.405, 52.51],
  zoom = 10.3,
  height = "h-64",
  zones,
  zoneStep = 350,
  full = false,
  fit = false,
  flush = false,
  legend,
}: {
  points: MapPoint[];
  highlight?: string;
  onSelect?: (slug: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  /** Passende Stellen (Raster), werden als weiche orange Flächen gezeichnet */
  zones?: ZonePoint[];
  zoneStep?: number;
  full?: boolean;
  /** Ausschnitt so wählen, dass alle Punkte sichtbar sind */
  fit?: boolean;
  /** Randlos, unten geht es nahtlos in die Liste über (die Liste überlappt die Karte etwas) */
  flush?: boolean;
  /** Kurzer Hinweis oben links auf der Karte (z. B. was Orange bedeutet) */
  legend?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !ref.current) return;
      const m = new maplibregl.Map({
        container: ref.current,
        // Kostenlose Karte ohne API-Schlüssel (OpenFreeMap / OpenStreetMap)
        style: isDarkNow() ? MAP_STYLE.dark : MAP_STYLE.light,
        center,
        zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        // In der Seite: mit zwei Fingern bewegen, damit Scrollen die Karte nicht verschiebt. Im Vollbild normal.
        cooperativeGestures: !full,
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": "Strg + Scrollen zum Zoomen",
          "CooperativeGesturesHandler.MacHelpText": "⌘ + Scrollen zum Zoomen",
          "CooperativeGesturesHandler.MobileHelpText": "Mit zwei Fingern bewegen, oder oben rechts vergrößern",
        },
        // Nah dran leicht geneigt, damit die 3D-Gebäude wirken
        pitch: zoom >= 14 ? 35 : 0,
        maxPitch: 60,
      });
      map = m;
      if (fit && points.length > 1) {
        const lons = points.map((p) => p.lng);
        const lats = points.map((p) => p.lat);
        m.fitBounds(
          [
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)],
          ],
          { padding: { top: flush ? 70 : 50, bottom: flush ? 80 : 50, left: 50, right: 50 }, duration: 0, maxZoom: 12.6 },
        );
      }
      if (full) m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      // Quellenangabe als kleines „i“ statt eines breiten Balkens über der Karte (antippen zeigt den Text)
      m.once("load", () => ref.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"));
      // Darstellung gewechselt (hell/dunkel): passenden Kartenstil laden
      const onTheme = () => m.setStyle(isDarkNow() ? MAP_STYLE.dark : MAP_STYLE.light);
      window.addEventListener("sc-theme", onTheme);
      m.on("remove", () => window.removeEventListener("sc-theme", onTheme));
      m.on("style.load", () => {
        applyStayCheckTheme(m, isDarkNow());
        if (zones?.length) addZones(m, zones, zoneStep, center[1]);
      });

      const max = Math.max(...points.map((p) => p.match), 1);
      const min = Math.min(...points.map((p) => p.match), max);

      const select = (slug: string) => {
        if (onSelectRef.current) onSelectRef.current(slug);
        else document.getElementById(`kiez-${slug}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      };
      // Namen (Viertel-Übersicht) als Kartenbeschriftung: überlappende Namen blendet die Karte selbst aus,
      // statt dass sich Kästchen stapeln. Zahlen (Match) bleiben Knöpfe.
      const labeled = points.filter((p) => p.label && p.slug !== highlight);
      m.on("style.load", () => addLabels(m, labeled, select));

      for (const p of points) {
        if (p.label && p.slug !== highlight) continue;
        const t = max === min ? 1 : (p.match - min) / (max - min);
        const isTop = p.slug === highlight;
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", p.label ? p.name : `${p.name}, ${p.match}% Match`);
        el.className = isTop ? "sc-pin sc-pin-top" : "sc-pin";
        el.style.setProperty("--t", String(0.55 + t * 0.45));
        el.textContent = p.label ?? `${p.match}`;
        el.addEventListener("click", () => select(p.slug));
        new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, highlight, zones, full, fit]);

  return <div ref={ref} className={`${height} w-full overflow-hidden bg-paper ${flush ? "sc-flush" : ""} ${full || flush ? "" : "rounded-3xl"}`} />;
}

type KiezMapProps = Parameters<typeof MapCanvas>[0];

/** Karte mit Knopf zum Vergrößern: öffnet dieselbe Karte bildschirmfüllend. */
export default function KiezMap(props: KiezMapProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Antippen eines Punkts in der Vollansicht: erst schließen, dann wie gewohnt reagieren
  const selectFromFull = (slug: string) => {
    setOpen(false);
    setTimeout(() => {
      if (props.onSelect) props.onSelect(slug);
      else document.getElementById(`kiez-${slug}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "center" });
    }, 50);
  };

  return (
    <div className="relative">
      <MapCanvas {...props} />
      {props.legend && (
        <span className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[70%] items-center gap-1.5 rounded-full bg-sand/90 px-3 py-1.5 text-[12px] font-extrabold shadow-soft backdrop-blur">
          <span className="h-2.5 w-4 shrink-0 rounded-full bg-sun/60 blur-[1px]" />
          {props.legend}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Karte vergrößern"
        className="press absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-sand/85 text-ink shadow-soft backdrop-blur"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-sand" role="dialog" aria-modal="true" aria-label="Karte">
            <MapCanvas {...props} height="h-full" onSelect={selectFromFull} full flush={false} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Karte schließen"
              className="press absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sand/85 text-ink shadow-soft backdrop-blur"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Weiche Leuchtflächen (Heatmap): Nachbarpunkte verschmelzen zu Zonen. Radius in Metern, auf jeder Zoomstufe gleich groß.
 */
function addZones(m: import("maplibre-gl").Map, zones: ZonePoint[], step: number, lat: number) {
  const metersPerPx0 = 156543.03 * Math.cos((lat * Math.PI) / 180); // bei Zoom 0
  const px = (zoom: number) => (step * 2.8) / (metersPerPx0 / 2 ** zoom); // Radius > Rasterabstand: Nachbarn verschmelzen
  const before = m.getStyle().layers?.find((l) => l.type === "symbol")?.id;
  try {
    m.addSource("sc-zones", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: zones.map((z) => ({ type: "Feature", properties: { w: z.w }, geometry: { type: "Point", coordinates: [z.lon, z.lat] } })),
      },
    });
    m.addLayer(
      {
        id: "sc-zones",
        type: "heatmap",
        source: "sc-zones",
        paint: {
          "heatmap-weight": ["get", "w"],
          "heatmap-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, px(8), 18, px(18)],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 1.4, 15, 1],
          // Nur Orange, von durchsichtig bis kräftig – darunter bleibt die Karte lesbar
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(242,102,47,0)",
            0.06, "rgba(242,102,47,0.12)",
            0.25, "rgba(242,102,47,0.32)",
            0.55, "rgba(255,122,69,0.48)",
            1, "rgba(255,138,92,0.62)",
          ],
          "heatmap-opacity": 1,
        },
      },
      before,
    );
  } catch {
    // ohne Zonen weiter
  }
}

function addLabels(m: import("maplibre-gl").Map, points: MapPoint[], select: (slug: string) => void) {
  if (!points.length) return;
  try {
    m.addSource("sc-labels", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          properties: { slug: p.slug, label: p.label ?? p.name },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
      },
    });
    m.addLayer({
      id: "sc-label-dots",
      type: "circle",
      source: "sc-labels",
      paint: { "circle-radius": 4.5, "circle-color": "#ff5a2c", "circle-stroke-color": isDarkNow() ? "#131417" : "#ffffff", "circle-stroke-width": 2 },
    });
    m.addLayer({
      id: "sc-label-text",
      type: "symbol",
      source: "sc-labels",
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 13,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-max-width": 8,
        "text-padding": 4,
      },
      paint: { "text-color": isDarkNow() ? "#f4f4f6" : "#17171b", "text-halo-color": isDarkNow() ? "#131417" : "#ffffff", "text-halo-width": 2 },
    });
    for (const id of ["sc-label-dots", "sc-label-text"]) {
      m.on("click", id, (e) => {
        const slug = e.features?.[0]?.properties?.slug;
        if (typeof slug === "string") select(slug);
      });
      m.on("mouseenter", id, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", id, () => (m.getCanvas().style.cursor = ""));
    }
  } catch {
    // ohne Beschriftung weiter
  }
}
