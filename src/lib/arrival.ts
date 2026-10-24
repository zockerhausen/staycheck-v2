// Ankunfts-Check: Wie komme ich vom Flughafen / Bahnhof zur Unterkunft?
// Version 1 ohne kostenpflichtige Routen-API: ehrliche Schätzung + Link zur genauen Verbindung in Google Maps.
// Später austauschbar gegen eine echte ÖPNV-API (z. B. Google Routes oder HERE) – siehe PROJECT.md.

import { distance } from "./geo";
import type { City } from "./data";

export type Hub = { id: string; name: string; kind: "airport" | "train" | "bus"; lat: number; lon: number };

export const HUBS: Record<string, Hub[]> = {
  berlin: [
    { id: "ber", name: "Flughafen BER", kind: "airport", lat: 52.3667, lon: 13.5033 },
    { id: "hbf", name: "Berlin Hauptbahnhof", kind: "train", lat: 52.5251, lon: 13.3694 },
    { id: "zob", name: "ZOB Fernbusbahnhof", kind: "bus", lat: 52.507, lon: 13.279 },
  ],
  bangkok: [
    { id: "bkk", name: "Flughafen Suvarnabhumi (BKK)", kind: "airport", lat: 13.69, lon: 100.7501 },
    { id: "dmk", name: "Flughafen Don Mueang (DMK)", kind: "airport", lat: 13.9126, lon: 100.6068 },
    { id: "kta", name: "Bahnhof Krung Thep Aphiwat", kind: "train", lat: 13.8045, lon: 100.54 },
    { id: "mochit", name: "Busbahnhof Mo Chit 2", kind: "bus", lat: 13.8106, lon: 100.5496 },
  ],
};

export type ArrivalEstimate = {
  hub: Hub;
  km: number;
  minMinutes: number;
  maxMinutes: number;
  mapsUrl: string;
};

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** Zu welcher unserer Städte gehört dieser Punkt? (bis 45 km vom Zentrum) */
export function cityForPoint(lat: number, lon: number, cities: City[]): City | null {
  let best: City | null = null;
  let bestDist = Infinity;
  for (const c of cities) {
    const d = distance(lat, lon, c.lat, c.lng);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best && bestDist < 45000 && HUBS[best.slug] ? best : null;
}

export function estimateArrival(hub: Hub, lat: number, lon: number): ArrivalEstimate {
  const km = distance(hub.lat, hub.lon, lat, lon) / 1000;
  // Faustregel: Umwege (×1,25); lange Strecken meist mit Express-/S-Bahn (~40 km/h), kurze ~22 km/h;
  // plus ~10 Min. für Warten, Umsteigen und Laufen.
  const speed = km > 8 ? 40 : 22;
  const base = 10 + ((km * 1.25) / speed) * 60;
  return {
    hub,
    km: Math.round(km * 10) / 10,
    minMinutes: round5(base * 0.85),
    maxMinutes: round5(base * 1.2),
    mapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${hub.lat},${hub.lon}&destination=${lat},${lon}&travelmode=transit`,
  };
}

/** Letzter Fußweg mit Gepäck (langsamer als normal: ~65 m pro Minute) */
export function luggageWalk(distMeters: number) {
  return Math.max(1, Math.round(distMeters / 65));
}
