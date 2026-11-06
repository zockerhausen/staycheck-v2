// Fußwege-Netz für die Vorberechnung: Was ist von einer Unterkunft aus wirklich zu Fuß erreichbar?
// Liest begehbare Wege aus OpenStreetMap (osmium export → geojsonseq, Zeile für Zeile, auch für große Städte)
// und rechnet kürzeste Wege (Dijkstra). Orte, die nur mit großem Umweg erreichbar sind
// (z. B. auf der anderen Flussseite ohne Brücke, hinter Gleisen oder einer Autobahn), zählen dann nicht mit.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { distance, type Poi } from "../../src/lib/score";

const MAX_VERTICES = 3_000_000; // darüber zu viel Speicher: dann ohne Fußwege-Netz (wie bisher Luftlinie)
const NOT_WALKABLE = /^(motorway|motorway_link|trunk|trunk_link|construction|proposed|raceway|bus_guideway|platform)$/;

export type WalkGraph = {
  lat: Float64Array;
  lon: Float64Array;
  off: Int32Array;
  to: Int32Array;
  w: Float32Array;
  grid: Map<string, number[]>;
  /** Nur Punkte im großen, zusammenhängenden Netz (keine abgeschnittenen Hof- oder Parkwege) */
  big: Uint8Array;
};

const GCELL = 0.0006; // ca. 65 m
const gkey = (lat: number, lon: number) => `${Math.floor(lat / GCELL)}:${Math.floor(lon / GCELL)}`;

export async function loadWalkGraph(path: string): Promise<WalkGraph | null> {
  const ids = new Map<string, number>();
  const lat: number[] = [];
  const lon: number[] = [];
  const ea: number[] = [];
  const eb: number[] = [];
  const ew: number[] = [];
  const id = (x: number, y: number) => {
    const k = `${y.toFixed(6)},${x.toFixed(6)}`;
    let v = ids.get(k);
    if (v === undefined) {
      v = lat.length;
      ids.set(k, v);
      lat.push(y);
      lon.push(x);
    }
    return v;
  };
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const raw of rl) {
    const line = raw.replace(/^\x1e/, "").trim();
    if (!line) continue;
    let f: { geometry?: { type: string; coordinates: number[][] }; properties?: Record<string, string> };
    try {
      f = JSON.parse(line);
    } catch {
      continue;
    }
    const t = f.properties ?? {};
    if (f.geometry?.type !== "LineString" || !t.highway) continue;
    const footOk = t.foot === "yes" || t.foot === "designated";
    if (NOT_WALKABLE.test(t.highway) && !footOk) continue;
    if ((t.foot === "no" || t.access === "private" || t.access === "no") && !footOk) continue;
    const c = f.geometry.coordinates;
    for (let i = 1; i < c.length; i++) {
      const a = id(c[i - 1][0], c[i - 1][1]);
      const b = id(c[i][0], c[i][1]);
      if (a === b) continue;
      ea.push(a);
      eb.push(b);
      ew.push(distance(lat[a], lon[a], lat[b], lon[b]));
    }
    if (lat.length > MAX_VERTICES) {
      rl.close();
      return null;
    }
  }
  const n = lat.length;
  if (n < 50) return null;
  // Kompakte Nachbarliste (beide Richtungen)
  const deg = new Int32Array(n + 1);
  for (let i = 0; i < ea.length; i++) {
    deg[ea[i] + 1]++;
    deg[eb[i] + 1]++;
  }
  for (let i = 1; i <= n; i++) deg[i] += deg[i - 1];
  const off = deg;
  const fill = off.slice(0, n);
  const to = new Int32Array(ea.length * 2);
  const w = new Float32Array(ea.length * 2);
  for (let i = 0; i < ea.length; i++) {
    to[fill[ea[i]]] = eb[i];
    w[fill[ea[i]]++] = ew[i];
    to[fill[eb[i]]] = ea[i];
    w[fill[eb[i]]++] = ew[i];
  }
  // Zusammenhängende Teile des Netzes: kleine Inseln (Innenhöfe, Wege ohne Anschluss in den Daten) nicht nutzen
  const comp = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let v = 0; v < n; v++) {
    if (comp[v] !== -1) continue;
    const c = sizes.length;
    let size = 0;
    comp[v] = c;
    stack.push(v);
    while (stack.length) {
      const x = stack.pop()!;
      size++;
      for (let k = off[x]; k < off[x + 1]; k++) {
        const u = to[k];
        if (comp[u] === -1) {
          comp[u] = c;
          stack.push(u);
        }
      }
    }
    sizes.push(size);
  }
  const big = new Uint8Array(n);
  for (let v = 0; v < n; v++) big[v] = sizes[comp[v]] >= 2000 ? 1 : 0;
  const grid = new Map<string, number[]>();
  for (let v = 0; v < n; v++) {
    if (!big[v]) continue;
    const k = gkey(lat[v], lon[v]);
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(v);
  }
  return { lat: Float64Array.from(lat), lon: Float64Array.from(lon), off, to, w, grid, big };
}

/** Nächster Wegpunkt (bis maxM Meter), sonst null */
function snap(g: WalkGraph, la: number, lo: number, maxM: number): { v: number; d: number } | null {
  const bi = Math.floor(la / GCELL);
  const bj = Math.floor(lo / GCELL);
  let best: { v: number; d: number } | null = null;
  const r = Math.ceil(maxM / 60);
  for (let i = bi - r; i <= bi + r; i++)
    for (let j = bj - r; j <= bj + r; j++)
      for (const v of g.grid.get(`${i}:${j}`) ?? []) {
        const d = distance(la, lo, g.lat[v], g.lon[v]);
        if (d <= maxM && (!best || d < best.d)) best = { v, d };
      }
  return best;
}

/** Kürzeste Fußwege ab einem Punkt bis maxM Meter (Dijkstra mit kleinem Heap) */
function walkFrom(g: WalkGraph, start: number, maxM: number): Map<number, number> {
  const dist = new Map<number, number>([[start, 0]]);
  const hv: number[] = [start];
  const hd: number[] = [0];
  const push = (v: number, d: number) => {
    let i = hv.length;
    hv.push(v);
    hd.push(d);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hd[p] <= hd[i]) break;
      [hv[p], hv[i]] = [hv[i], hv[p]];
      [hd[p], hd[i]] = [hd[i], hd[p]];
      i = p;
    }
  };
  const pop = () => {
    const v = hv[0];
    const d = hd[0];
    const lv = hv.pop()!;
    const ld = hd.pop()!;
    if (hv.length) {
      hv[0] = lv;
      hd[0] = ld;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < hv.length && hd[l] < hd[m]) m = l;
        if (r < hv.length && hd[r] < hd[m]) m = r;
        if (m === i) break;
        [hv[m], hv[i]] = [hv[i], hv[m]];
        [hd[m], hd[i]] = [hd[i], hd[m]];
        i = m;
      }
    }
    return [v, d] as const;
  };
  while (hv.length) {
    const [v, d] = pop();
    if (d > (dist.get(v) ?? Infinity)) continue;
    for (let k = g.off[v]; k < g.off[v + 1]; k++) {
      const u = g.to[k];
      const nd = d + g.w[k];
      if (nd > maxM) continue;
      if (nd < (dist.get(u) ?? Infinity)) {
        dist.set(u, nd);
        push(u, nd);
      }
    }
  }
  return dist;
}

const DETOUR = 1.6; // Fußweg darf bis 60 % länger als die Luftlinie sein (+150 m) – normaler Stadtumweg
const CHECK_FROM = 150; // ganz nahe Orte immer zählen
const CHECK_TO = 900; // weiter weg zählt der Score ohnehin kaum

/**
 * Orte aussortieren, die zu Fuß nur mit großem Umweg erreichbar sind.
 * Flächen (Parks, Wasser) und Orte ohne nahen Weg bleiben drin. Ohne Netz: alles bleibt (wie bisher).
 */
export function reachable(g: WalkGraph | null, la: number, lo: number, pois: Poi[]): { pois: Poi[]; dropped: number; checked: number } {
  if (!g) return { pois, dropped: 0, checked: 0 };
  const s = snap(g, la, lo, 120);
  if (!s) return { pois, dropped: 0, checked: 0 };
  const dist = walkFrom(g, s.v, CHECK_TO * DETOUR + 150);
  let dropped = 0;
  let checked = 0;
  const out = pois.filter((p) => {
    if (p.bbox) return true;
    const straight = distance(la, lo, p.lat, p.lon);
    if (straight < CHECK_FROM || straight > CHECK_TO) return true;
    const t = snap(g, p.lat, p.lon, 80);
    if (!t) return true;
    checked++;
    const walk = s.d + (dist.get(t.v) ?? Infinity) + t.d;
    const ok = walk <= straight * DETOUR + 150;
    if (!ok) dropped++;
    return ok;
  });
  // Fällt sehr viel weg, stimmt eher das Netz an dieser Stelle nicht (Lücke in den Daten): dann lieber nichts aussortieren
  if (checked >= 20 && dropped > checked * 0.35) return { pois, dropped: 0, checked };
  return { pois: out, dropped, checked };
}
