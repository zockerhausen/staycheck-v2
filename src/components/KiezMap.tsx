"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { applyStayCheckTheme } from "@/lib/mapTheme";
import type { ZonePoint } from "@/lib/zones";

export type MapPoint = { slug: string; name: string; lat: number; lng: number; match: number; label?: string };

/** Karte mit Match-Punkten: je höher der Match, desto größer und kräftiger der Punkt. */
export default function KiezMap({
  points,
  highlight,
  onSelect,
  center = [13.405, 52.51],
  zoom = 10.3,
  height = "h-64",
  zones,
  zoneStep = 350,
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
        style: "https://tiles.openfreemap.org/styles/dark",
        center,
        zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        // Nah dran leicht geneigt, damit die 3D-Gebäude wirken
        pitch: zoom >= 14 ? 35 : 0,
        maxPitch: 60,
      });
      map = m;
      m.on("style.load", () => {
        applyStayCheckTheme(m);
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
  }, [points, highlight, zones]);

  return <div ref={ref} className={`${height} w-full overflow-hidden rounded-3xl bg-paper`} />;
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
      paint: { "circle-radius": 4, "circle-color": "#ff8a5c", "circle-stroke-color": "#0c0c0e", "circle-stroke-width": 2 },
    });
    m.addLayer({
      id: "sc-label-text",
      type: "symbol",
      source: "sc-labels",
      layout: {
        "text-field": ["get", "label"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 13,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-max-width": 8,
        "text-padding": 4,
      },
      paint: { "text-color": "#f5f5f5", "text-halo-color": "#0c0c0e", "text-halo-width": 2 },
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
