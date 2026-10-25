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

      for (const p of points) {
        const t = max === min ? 1 : (p.match - min) / (max - min);
        const isTop = p.slug === highlight;
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", p.label ? p.name : `${p.name}, ${p.match}% Match`);
        el.className = isTop ? "sc-pin sc-pin-top" : "sc-pin";
        el.style.setProperty("--t", String(0.55 + t * 0.45));
        el.textContent = p.label ?? `${p.match}`;
        el.addEventListener("click", () => {
          if (onSelectRef.current) onSelectRef.current(p.slug);
          else document.getElementById(`kiez-${p.slug}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        });
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
