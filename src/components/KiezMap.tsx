"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { applyStayCheckTheme } from "@/lib/mapTheme";

export type MapPoint = { slug: string; name: string; lat: number; lng: number; match: number; label?: string };

/** Karte mit Match-Punkten: je höher der Match, desto größer und kräftiger der Punkt. */
export default function KiezMap({
  points,
  highlight,
  onSelect,
  center = [13.405, 52.51],
  zoom = 10.3,
  height = "h-64",
}: {
  points: MapPoint[];
  highlight?: string;
  onSelect?: (slug: string) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
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
      m.on("style.load", () => applyStayCheckTheme(m));

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
  }, [points, highlight]);

  return <div ref={ref} className={`${height} w-full overflow-hidden rounded-3xl bg-paper`} />;
}
