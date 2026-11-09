// Die „gute Lage“ rund um einen Ort als echte Fläche (statt eines Kreises):
// Messpunkte im Umkreis bewerten, vom Ort aus die zusammenhängenden guten Punkte einsammeln, Umriss weich zeichnen.
import { profileMatch, type NoGo, type Weights } from "./profile";
import { ZONE_KEYS } from "./zones";

type RawZone = { lat: number; lon: number; s: number[] };
export type GoodArea = {
  /** Umriss(e) als [lon, lat] (für die Karte) */
  rings: [number, number][][];
  /** Liegt dieser Punkt in der Fläche? (gleiche Rasterzellen wie der Umriss) */
  inside: (lat: number, lon: number) => boolean;
};

const meters = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lon - b.lon) * 111_320 * Math.cos((b.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

/** Kleinster Rasterabstand in einer Liste von Koordinaten */
function gridStep(values: number[]) {
  const u = [...new Set(values.map((v) => v.toFixed(6)))].map(Number).sort((a, b) => a - b);
  let d = Infinity;
  for (let k = 1; k < u.length; k++) if (u[k] - u[k - 1] > 1e-6) d = Math.min(d, u[k] - u[k - 1]);
  return d;
}

export function goodArea(zones: RawZone[], center: { lat: number; lon: number }, radius: number, weights: Weights, nogo?: NoGo[]): GoodArea | null {
  const near = zones.filter((z) => meters(z, center) <= radius * 1.1);
  if (near.length < 6) return null;
  const dLat = gridStep(near.map((z) => z.lat));
  const dLon = gridStep(near.map((z) => z.lon));
  if (!Number.isFinite(dLat) || !Number.isFinite(dLon)) return null;
  const lat0 = Math.min(...near.map((z) => z.lat));
  const lon0 = Math.min(...near.map((z) => z.lon));
  const idx = (lat: number, lon: number) => [Math.round((lat - lat0) / dLat), Math.round((lon - lon0) / dLon)] as const;
  const key = (i: number, j: number) => `${i},${j}`;

  // Jede Zelle mit ihrem Match (gleiche Formel wie überall: Gewichte, No-Gos)
  const cell = new Map<string, { m: number; d: number }>();
  for (const z of near) {
    const [i, j] = idx(z.lat, z.lon);
    const m = profileMatch(Object.fromEntries(ZONE_KEYS.map((k, n) => [k, z.s[n]])), weights, nogo);
    cell.set(key(i, j), { m, d: meters(z, center) });
  }
  const values = [...cell.values()].map((c) => c.m).sort((a, b) => a - b);
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))];

  // Start: die Zelle am Ort selbst (oder die beste ganz in der Nähe, falls der Platz selbst schwach ist)
  const [ci, cj] = idx(center.lat, center.lon);
  const grow = (t: number) => {
    let seed = key(ci, cj);
    if (!cell.has(seed) || cell.get(seed)!.m < t) {
      const alt = [...cell.entries()].filter(([, c]) => c.d <= 450 && c.m >= t).sort((a, b) => b[1].m - a[1].m)[0];
      if (alt) seed = alt[0];
      else if (!cell.has(seed)) return new Set<string>();
    }
    const set = new Set([seed]);
    const queue = [seed];
    while (queue.length) {
      const [i, j] = queue.pop()!.split(",").map(Number);
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        const k = key(a, b);
        const c = cell.get(k);
        // „gut“ = mindestens die Schwelle; liegt die Schwelle am unteren Ende, muss es echt besser sein
        if (!set.has(k) && c && (c.m > t || (c.m === t && t > values[0])) && c.d <= radius) {
          set.add(k);
          queue.push(k);
        }
      }
    }
    return set;
  };
  let cells = grow(q(0.45));
  if (cells.size < 5) cells = grow(q(0.3));
  if (cells.size < 3) return null;

  // Löcher füllen: alles, was von außen nicht erreichbar ist, gehört dazu (eine ruhige Fläche statt Schweizer Käse)
  const all = [...cells].map((k) => k.split(",").map(Number));
  const [iMin, iMax] = [Math.min(...all.map((c) => c[0])) - 1, Math.max(...all.map((c) => c[0])) + 1];
  const [jMin, jMax] = [Math.min(...all.map((c) => c[1])) - 1, Math.max(...all.map((c) => c[1])) + 1];
  const outside = new Set<string>([key(iMin, jMin)]);
  const stack = [[iMin, jMin]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (a < iMin || a > iMax || b < jMin || b > jMax) continue;
      const k = key(a, b);
      if (cells.has(k) || outside.has(k)) continue;
      outside.add(k);
      stack.push([a, b]);
    }
  }
  for (let i = iMin; i <= iMax; i++) for (let j = jMin; j <= jMax; j++) if (!outside.has(key(i, j))) cells.add(key(i, j));

  // Umriss: Kanten im doppelten Raster (Zelle (i,j) hat Ecken (2i±1, 2j±1)), nur wo der Nachbar fehlt
  const has = (i: number, j: number) => cells.has(key(i, j));
  const next = new Map<string, string[]>();
  const add = (a: string, b: string) => (next.get(a) ?? next.set(a, []).get(a)!).push(b);
  for (const k of cells) {
    const [i, j] = k.split(",").map(Number);
    const c = (di: number, dj: number) => key(2 * i + di, 2 * j + dj);
    if (!has(i - 1, j)) add(c(-1, -1), c(-1, 1));
    if (!has(i, j + 1)) add(c(-1, 1), c(1, 1));
    if (!has(i + 1, j)) add(c(1, 1), c(1, -1));
    if (!has(i, j - 1)) add(c(1, -1), c(-1, -1));
  }
  const loops: number[][][] = [];
  const used = new Set<string>();
  for (const [start, outs] of next) {
    for (const first of outs) {
      if (used.has(`${start}>${first}`)) continue;
      const loop = [start];
      let from = start;
      let to = first;
      while (!used.has(`${from}>${to}`)) {
        used.add(`${from}>${to}`);
        loop.push(to);
        const cand = (next.get(to) ?? []).filter((n) => !used.has(`${to}>${n}`));
        if (!cand.length) break;
        from = to;
        to = cand[0];
      }
      if (loop.length > 3) loops.push(loop.slice(0, -1).map((k) => k.split(",").map(Number)));
    }
  }
  // Ecken weich machen (Chaikin, 3 Durchgänge): wirkt wie eine Gegend, nicht wie Kästchen
  const smooth = (pts: number[][]) => {
    let p = pts;
    for (let r = 0; r < 3; r++) {
      const out: number[][] = [];
      for (let k = 0; k < p.length; k++) {
        const [a1, b1] = p[k];
        const [a2, b2] = p[(k + 1) % p.length];
        out.push([0.75 * a1 + 0.25 * a2, 0.75 * b1 + 0.25 * b2], [0.25 * a1 + 0.75 * a2, 0.25 * b1 + 0.75 * b2]);
      }
      p = out;
    }
    return [...p, p[0]];
  };
  const rings = loops.map((l) =>
    smooth(l).map(([a, b]) => [Math.round((lon0 + (b / 2) * dLon) * 1e6) / 1e6, Math.round((lat0 + (a / 2) * dLat) * 1e6) / 1e6] as [number, number]),
  );
  const inside = (lat: number, lon: number) => {
    const [i, j] = idx(lat, lon);
    return cells.has(key(i, j));
  };
  return { rings, inside };
}
