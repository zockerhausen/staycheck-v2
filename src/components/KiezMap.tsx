"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPoint = { slug: string; name: string; lat: number; lng: number; match: number };

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
      });
      map = m;

      const max = Math.max(...points.map((p) => p.match), 1);
      const min = Math.min(...points.map((p) => p.match), max);

      for (const p of points) {
        const t = max === min ? 1 : (p.match - min) / (max - min);
        const isTop = p.slug === highlight;
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `${p.name}, ${p.match}% Match`);
        el.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          min-width:${isTop ? 46 : 30 + t * 8}px;height:${isTop ? 30 : 24}px;padding:0 9px;
          border-radius:999px;border:1px solid ${isTop ? "#f2662f" : "#2a2a2e"};
          background:${isTop ? "#f2662f" : "#1c1c1f"};
          color:${isTop ? "#fff" : `rgba(245,245,245,${0.6 + t * 0.4})`};
          font:800 ${isTop ? 13 : 12}px var(--font-body), system-ui, sans-serif;
          box-shadow:0 4px 14px rgba(0,0,0,.45);cursor:pointer;`;
        el.textContent = `${p.match}`;
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
