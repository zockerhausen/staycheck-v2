"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPoint = { slug: string; name: string; lat: number; lng: number; match: number };

/** Berlin-Karte: je höher der Match, desto größer und kräftiger der Punkt. */
export default function KiezMap({
  points,
  highlight,
  onSelect,
}: {
  points: MapPoint[];
  highlight?: string;
  onSelect?: (slug: string) => void;
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
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [13.405, 52.51],
        zoom: 10.3,
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
          width:${isTop ? 46 : 26 + t * 12}px;height:${isTop ? 46 : 26 + t * 12}px;
          border-radius:999px;border:3px solid #fffaf1;
          background:${isTop ? "#f2662f" : `rgba(242,102,47,${0.25 + t * 0.6})`};
          color:${isTop || t > 0.5 ? "#fff" : "#8a3510"};
          font:700 ${isTop ? 13 : 10}px system-ui, sans-serif;
          box-shadow:0 2px 6px rgba(42,26,16,.25);cursor:pointer;`;
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
  }, [points, highlight]);

  return <div ref={ref} className="h-64 w-full overflow-hidden rounded-3xl border-2 border-line bg-tan" />;
}
