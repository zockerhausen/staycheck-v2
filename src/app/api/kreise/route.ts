import { rateLimit, tooMany } from "@/lib/ratelimit";

/**
 * GPX-Datei mit dem Umriss der besten Lage, damit die Preiskarte unseres Partners (Stay22) ihn als Linie zeichnen kann.
 * Die Rasterpunkte stehen in der Adresse (a=lat0,lon0,dLat,dLon|i.j;i.j;…): keine Datenbank, nichts Persönliches.
 * Aus den Rasterquadraten wird die Außenkante der Fläche berechnet und zu geschlossenen Linien verbunden.
 */
export async function GET(request: Request) {
  if (!rateLimit(request, "kreise", 300)) return tooMany();
  const raw = new URL(request.url).searchParams.get("a") ?? "";
  const [head, list] = raw.split("|");
  const [lat0, lon0, dLat, dLon] = (head ?? "").split(",").map(Number);
  const ok = [lat0, lon0, dLat, dLon].every(Number.isFinite) && Math.abs(lat0) <= 85 && Math.abs(lon0) <= 180 && dLat > 0 && dLat < 0.05 && dLon > 0 && dLon < 0.05;
  const cells = new Set(
    (ok ? (list ?? "").split(";").slice(0, 400) : [])
      .map((x) => x.split(".").map(Number))
      .filter(([i, j]) => Number.isInteger(i) && Number.isInteger(j) && Math.abs(i) < 500 && Math.abs(j) < 500)
      .map(([i, j]) => `${i},${j}`),
  );

  // Aufräumen: einzelne Lücken füllen, einzelne Inseln weglassen (ruhiger Umriss)
  const n4 = (i: number, j: number) => [cells.has(`${i - 1},${j}`), cells.has(`${i + 1},${j}`), cells.has(`${i},${j - 1}`), cells.has(`${i},${j + 1}`)].filter(Boolean).length;
  const all = [...cells].map((k) => k.split(",").map(Number));
  for (const [i, j] of all)
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) if (!cells.has(`${a},${b}`) && n4(a, b) >= 3) cells.add(`${a},${b}`);
  for (const [i, j] of all) if (n4(i, j) === 0) cells.delete(`${i},${j}`);

  // Ecken im doppelten Raster: Zelle (i,j) hat Ecken (2i±1, 2j±1). Kante nur, wenn der Nachbar nicht dazugehört.
  const has = (i: number, j: number) => cells.has(`${i},${j}`);
  const next = new Map<string, string[]>();
  const add = (a: string, b: string) => (next.get(a) ?? next.set(a, []).get(a)!).push(b);
  for (const key of cells) {
    const [i, j] = key.split(",").map(Number);
    const c = (di: number, dj: number) => `${2 * i + di},${2 * j + dj}`;
    // gegen den Uhrzeigersinn um die Zelle, nur Außenkanten
    if (!has(i - 1, j)) add(c(-1, -1), c(-1, 1)); // unten
    if (!has(i, j + 1)) add(c(-1, 1), c(1, 1)); // rechts
    if (!has(i + 1, j)) add(c(1, 1), c(1, -1)); // oben
    if (!has(i, j - 1)) add(c(1, -1), c(-1, -1)); // links
  }
  const loops: string[][] = [];
  const used = new Set<string>();
  for (const [start, outs] of next) {
    for (const first of outs) {
      const edge = `${start}>${first}`;
      if (used.has(edge)) continue;
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
      if (loop.length > 3) loops.push(loop);
    }
  }
  // Ecken weich machen (Chaikin, 2 Durchgänge): wirkt wie eine Gegend statt wie Kästchen
  const smooth = (pts: number[][]) => {
    let p = pts;
    for (let r = 0; r < 2; r++) {
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
  const pt = ([a, b]: number[]) => `<trkpt lat="${(lat0 + (a / 2) * dLat).toFixed(6)}" lon="${(lon0 + (b / 2) * dLon).toFixed(6)}"/>`;
  const tracks = loops
    .map((l) => smooth(l.slice(0, -1).map((k) => k.split(",").map(Number))))
    .map((l) => `<trk><name>Beste Lage</name><trkseg>${l.map(pt).join("")}</trkseg></trk>`)
    .join("");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="StayCheck" xmlns="http://www.topografix.com/GPX/1/1">${tracks}</gpx>`;
  return new Response(gpx, {
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
