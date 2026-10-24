// StayCheck-Score: nachvollziehbar und ehrlich.
// Jeder Wert (1–10) kommt mit den Fakten, aus denen er berechnet wurde, und mit seiner Quelle.
// Die gleichen Regeln stehen in Klartext auf /methode – bitte beides zusammen ändern.

export type Tags = Record<string, string>;
/** Punkt aus OpenStreetMap. Bei Flächen (Parks …) zusätzlich der Umriss als Rechteck (bbox). */
export type Poi = { lat: number; lon: number; tags: Tags; bbox?: [number, number, number, number]; area?: number };
/** Linie aus OpenStreetMap (Straße, Gleis) mit Verlauf. */
export type Line = { tags: Tags; points: { lat: number; lon: number }[] };

export type Source = "messung" | "viertel" | "gemischt" | "keine";
export type Detail = { score: number | null; source: Source; reasons: string[] };
export type Coverage = { level: "gut" | "mittel" | "duenn"; text: string };
export type ScoreDistrict = { name: string; scores: Record<string, number> };

export type Highlight = { icon: "transit" | "nightlife" | "food" | "nature" | "walk" | "hotel" | "quiet"; text: string };

export type ScoreResult = {
  scores: Record<string, number | null>;
  details: Record<string, Detail>;
  highlights: Highlight[];
  coverage: Coverage;
  counts: { bars: number; clubs: number; food: number; hostels: number };
  nearestRail: { name: string; dist: number } | null;
};

// ---------- Geometrie ----------

export function distance(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Abstand zu einer Fläche: 0, wenn der Punkt drin liegt, sonst bis zum Rand des Rechtecks. */
function distToPoi(lat: number, lon: number, p: Poi) {
  if (!p.bbox) return distance(lat, lon, p.lat, p.lon);
  const [minLat, minLon, maxLat, maxLon] = p.bbox;
  const cLat = Math.min(maxLat, Math.max(minLat, lat));
  const cLon = Math.min(maxLon, Math.max(minLon, lon));
  return distance(lat, lon, cLat, cLon);
}

/** Kürzester Abstand zu einer Linie (Straße/Gleis), lokal in Metern gerechnet. */
function distToLine(lat: number, lon: number, line: Line) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110540;
  let best = Infinity;
  const pts = line.points;
  for (let i = 0; i < pts.length; i++) {
    const ax = (pts[i].lon - lon) * kx;
    const ay = (pts[i].lat - lat) * ky;
    if (i === pts.length - 1) {
      best = Math.min(best, Math.hypot(ax, ay));
      break;
    }
    const bx = (pts[i + 1].lon - lon) * kx;
    const by = (pts[i + 1].lat - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

// Luftlinie → Fußweg: Straßen sind nie gerade, im Schnitt ca. 25 % länger. Gehtempo 80 m pro Minute.
export const WALK_FACTOR = 1.25;
export const walkMinutes = (meters: number) => Math.max(1, Math.round((meters * WALK_FACTOR) / 80));

const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)));
const step = (value: number, table: [number, number][], fallback: number) => {
  for (const [limit, score] of table) if (value <= limit) return score;
  return fallback;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** Lesbarer Name: erst Deutsch, dann Englisch, dann Originalschrift (z. B. Thai) */
// Namen nur in lateinischer Schrift anzeigen, sonst allgemeine Bezeichnung (z. B. „Park“)
const latin = (s: string | undefined) => (s && /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u.test(s) ? s : undefined);
const nameOf = (t: Tags) => t["name:de"] ?? t["name:en"] ?? latin(t.name);

/** Station oder Anleger, die (noch) nicht in Betrieb sind, zählen nicht. */
const YEAR = new Date().getFullYear();
function inService(t: Tags) {
  if (t.disused === "yes" || t.abandoned === "yes" || t.construction || t.proposed) return false;
  if (Object.keys(t).some((k) => /^(disused|abandoned|construction|proposed):/.test(k))) return false;
  if (/not operated|geschlossen|closed|under construction|im bau/i.test(`${t.name ?? ""} ${t["name:en"] ?? ""} ${t.note ?? ""}`)) return false;
  const opens = Number((t.opening_date ?? t.start_date ?? "").slice(0, 4));
  return !(opens && opens > YEAR);
}

/** Fläche des Umriss-Rechtecks in m² (grob, reicht um Mini-Grünflächen auszusortieren) */
function bboxArea(p: Poi) {
  if (p.area !== undefined) return p.area; // echter Umriss bekannt
  if (!p.bbox) return 0;
  const [minLat, minLon, maxLat, maxLon] = p.bbox;
  const h = (maxLat - minLat) * 110540;
  const w = (maxLon - minLon) * 111320 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  // Bei Relationen kennen wir nur das Rechteck: die echte Fläche ist meist deutlich kleiner
  return Math.max(0, h * w) * 0.5;
}

// ---------- Kategorien ----------

const isBar = (t: Tags) => /^(bar|pub|biergarten)$/.test(t.amenity ?? "");
const isClub = (t: Tags) => t.amenity === "nightclub";
const isFood = (t: Tags) => /^(restaurant|cafe|fast_food|food_court)$/.test(t.amenity ?? "");
const isBoat = (t: Tags) => t.amenity === "ferry_terminal" || t.ferry === "yes";
const isTrainStation = (t: Tags) =>
  !isBoat(t) &&
  (/^(station|halt)$/.test(t.railway ?? "") ||
    (t.public_transport === "station" && t.railway !== "tram_stop" && t.bus !== "yes" && t.highway !== "bus_stop"));
const isTram = (t: Tags) => t.railway === "tram_stop";
const isBus = (t: Tags) => t.highway === "bus_stop";
const isGreen = (t: Tags) =>
  /^(park|garden|nature_reserve)$/.test(t.leisure ?? "") || /^(water|beach|wood)$/.test(t.natural ?? "") || t.landuse === "forest";
// Mini-Flächen (Verkehrsinsel, Vorgarten, Tiergehege) zählen nicht: mindestens 0,5 ha, Strände immer
const MIN_GREEN_M2 = 5_000;
const BIG_GREEN_M2 = 50_000; // 5 ha echte Fläche
const isBudgetStay = (t: Tags) => /^(hostel|guest_house)$/.test(t.tourism ?? "");
const isMainRoad = (t: Tags) => /^(motorway|trunk|primary)$/.test(t.highway ?? "");
const isSecondaryRoad = (t: Tags) => t.highway === "secondary";
// Extras (nur wer sie im Reise-Profil wählt, bekommt sie in seinen Match eingerechnet)
const isSupermarket = (t: Tags) => /^(supermarket|convenience)$/.test(t.shop ?? "");
const isLaundry = (t: Tags) => t.shop === "laundry";
const isCafe = (t: Tags) => t.amenity === "cafe" || t.amenity === "coworking_space" || t.office === "coworking";
const isBeach = (t: Tags) => t.natural === "beach";
const isGym = (t: Tags) => t.leisure === "fitness_centre";
const isSight = (t: Tags) =>
  /^(attraction|museum|viewpoint|gallery|zoo)$/.test(t.tourism ?? "") || /^(monument|castle|ruins|city_gate|archaeological_site)$/.test(t.historic ?? "");
const isRailLine = (t: Tags) => /^(rail|light_rail|subway|tram)$/.test(t.railway ?? "") && t.tunnel !== "yes";

// ---------- Berechnung ----------

export function scoreFromData(lat: number, lon: number, pois: Poi[], lines: Line[], district: ScoreDistrict | null): ScoreResult {
  const near = (r: number, test: (t: Tags) => boolean) =>
    pois
      .filter((p) => test(p.tags) && inService(p.tags))
      .map((p) => ({ p, d: distToPoi(lat, lon, p) }))
      .filter((x) => x.d <= r)
      .sort((a, b) => a.d - b.d);

  const details: Record<string, Detail> = {};

  // Anbindung: nächster Bahnhof (S-/U-Bahn, Zug, Metro). Straßenbahn zählt etwas weniger, Bus nur als Notlösung.
  const train = near(900, isTrainStation)[0];
  const tram = near(600, isTram)[0];
  const boat = near(600, isBoat)[0];
  const buses = near(400, isBus).length;
  {
    const reasons: string[] = [];
    let score: number;
    if (train) {
      const min = walkMinutes(train.d);
      score = step(min, [[3, 10], [5, 9], [7, 8], [9, 7], [12, 5]], 4);
      reasons.push(`${nameOf(train.p.tags) ?? "Bahnhof"}: ca. ${min} Min. zu Fuß`);
    } else score = 0;
    if (tram) {
      const min = walkMinutes(tram.d);
      const tramScore = step(min, [[3, 7], [6, 6]], 5);
      if (tramScore > score) score = tramScore;
      reasons.push(`Straßenbahn ${nameOf(tram.p.tags) ?? ""}: ca. ${min} Min.`.replace("  ", " "));
    }
    if (boat) {
      // Boote fahren seltener und kürzer als Bahnen: zählen höchstens wie eine Straßenbahn
      const min = walkMinutes(boat.d);
      const boatScore = step(min, [[4, 6], [8, 5]], 4);
      if (boatScore > score) score = boatScore;
      reasons.push(`Bootsanleger ${nameOf(boat.p.tags) ?? ""}: ca. ${min} Min. (zählt weniger als Bahn)`.replace("  ", " "));
    }
    if (buses > 0) {
      if (score < 3) score = 3;
      reasons.push(`${plural(buses, "Bushaltestelle", "Bushaltestellen")} in 400 m`);
    }
    if (score === 0) {
      score = 1;
      reasons.push("Kein Bahnhof in Laufweite (900 m) und keine Bushaltestelle in 400 m");
    }
    details.transit = { score, source: "messung", reasons };
  }

  // Nachtleben: Bars, Kneipen und Clubs im Umkreis von 600 m
  const bars = near(600, isBar);
  const clubs = near(600, isClub);
  {
    const n = bars.length + clubs.length * 2; // Ein Club zählt wie zwei Bars
    const score = step(n, [[0, 1], [2, 3], [5, 5], [10, 7], [20, 9]], 10);
    const reasons = [
      bars.length || clubs.length
        ? `${plural(bars.length, "Bar oder Kneipe", "Bars und Kneipen")}${clubs.length ? `, ${plural(clubs.length, "Club", "Clubs")}` : ""} in 600 m`
        : "Keine Bars oder Clubs in 600 m",
    ];
    details.nightlife = { score, source: "messung", reasons };
  }

  // Essen: Restaurants, Cafés, Imbisse im Umkreis von 500 m
  const food = near(500, isFood);
  {
    const score = step(food.length, [[0, 1], [3, 3], [8, 5], [15, 7], [30, 9]], 10);
    details.food = {
      score,
      source: "messung",
      reasons: [food.length ? `${plural(food.length, "Restaurant oder Café", "Restaurants und Cafés")} in 500 m` : "Keine Restaurants oder Cafés in 500 m"],
    };
  }

  // Grün & Wasser: Abstand zum Rand des nächsten Parks / Gewässers
  const greens = near(800, isGreen).filter((g) => g.p.tags.natural === "beach" || bboxArea(g.p) >= MIN_GREEN_M2);
  const bigGreen = greens.find((g) => bboxArea(g.p) >= BIG_GREEN_M2 || g.p.tags.natural === "beach");
  const green = greens[0];
  {
    const label = (g: { p: Poi }) => nameOf(g.p.tags) ?? (g.p.tags.natural === "water" ? "Gewässer" : "Park");
    // Größe mit angeben, damit man sieht, ob es ein großer Park oder ein kleiner Platz ist
    const size = (g: { p: Poi }) => {
      const ha = bboxArea(g.p) / 10_000;
      return g.p.tags.natural === "beach" ? "" : ` (ca. ${ha >= 10 ? Math.round(ha) : ha.toFixed(1).replace(".", ",")} ha)`;
    };
    const where = (g: { p: Poi; d: number }) =>
      g.d < 20 ? `Direkt an ${label(g)}${size(g)}` : `${label(g)}${size(g)}: ca. ${walkMinutes(g.d)} Min. zu Fuß`;
    if (green) {
      const reasons: string[] = [];
      // Großer Park zählt voll; kleine Grünfläche höchstens 7
      const bigScore = bigGreen ? step(bigGreen.d, [[150, 10], [300, 9], [450, 8], [600, 7]], 6) : 0;
      const smallScore = Math.min(7, step(green.d, [[150, 7], [300, 6], [600, 5]], 4));
      const score = Math.max(bigScore, smallScore);
      if (bigGreen) reasons.push(where(bigGreen));
      if (!bigGreen || (green !== bigGreen && green.d < bigGreen.d - 100)) reasons.push(`${where(green)}, kleinere Grünfläche`);
      details.nature = { score, source: "messung", reasons };
    } else details.nature = { score: 2, source: "messung", reasons: ["Kein Park und kein Wasser (ab 0,5 ha) in 800 m"] };
  }

  // Ruhe: Lärmquellen nach Entfernung gewichtet. Je näher, desto lauter.
  {
    const reasons: string[] = [];
    let noise = 0;
    const loudBars = near(250, isBar);
    for (const b of loudBars) noise += 0.25 + 0.45 * (1 - b.d / 250);
    const loudClubs = near(300, isClub);
    for (const c of loudClubs) noise += 0.8 + 1.2 * (1 - c.d / 300);
    if (loudBars.length) reasons.push(`${plural(loudBars.length, "Bar", "Bars")} in 250 m`);
    if (loudClubs.length) reasons.push(`${plural(loudClubs.length, "Club", "Clubs")} in 300 m`);

    const roadDist = Math.min(Infinity, ...lines.filter((l) => isMainRoad(l.tags)).map((l) => distToLine(lat, lon, l)));
    if (roadDist <= 25) noise += 3.5;
    else if (roadDist <= 60) noise += 2.5;
    else if (roadDist <= 120) noise += 1;
    if (roadDist <= 120) reasons.push(`Hauptstraße ca. ${Math.max(5, Math.round(roadDist / 5) * 5)} m entfernt`);

    const secDist = Math.min(Infinity, ...lines.filter((l) => isSecondaryRoad(l.tags)).map((l) => distToLine(lat, lon, l)));
    if (secDist <= 25) {
      noise += 1.2;
      reasons.push("An einer belebten Straße");
    }

    const railDist = Math.min(Infinity, ...lines.filter((l) => isRailLine(l.tags)).map((l) => distToLine(lat, lon, l)));
    if (railDist <= 60) noise += 2;
    else if (railDist <= 150) noise += 0.8;
    if (railDist <= 150) reasons.push(`Gleise ca. ${Math.max(5, Math.round(railDist / 5) * 5)} m entfernt`);

    if (food.length > 25) noise += Math.min(1.5, (food.length - 25) * 0.05);
    if (!reasons.length) reasons.push("Keine großen Lärmquellen in der Nähe gefunden");
    reasons.push("Lärm im Gebäude (Fenster, Innenhof) können wir nicht sehen");
    details.quiet = { score: clamp(10 - noise), source: "messung", reasons };
  }

  // Sicherheit: nur aus unserer Viertel-Bewertung (OpenStreetMap kennt keine Sicherheit)
  details.safety = district
    ? { score: district.scores.safety ?? null, source: "viertel", reasons: [`Unsere Einschätzung für ${district.name}, nicht für die einzelne Straße`] }
    : { score: null, source: "keine", reasons: ["Für diese Gegend haben wir noch keine Einschätzung. Fließt nicht in den Score ein."] };

  // Günstig: Viertel-Bewertung plus Zahl günstiger Unterkünfte (Hostels, Pensionen) im Umkreis
  const hostels = near(800, isBudgetStay).length;
  {
    const hostelScore = step(hostels, [[0, 4], [2, 6], [5, 8]], 9);
    const reasons = [`${plural(hostels, "Hostel oder Pension", "Hostels und Pensionen")} in 800 m`];
    if (district) reasons.unshift(`Preisniveau ${district.name}: ${district.scores.budget}/10 (unsere Einschätzung)`);
    details.budget = district
      ? { score: clamp((district.scores.budget * 2 + hostelScore) / 3), source: "gemischt", reasons }
      : { score: hostelScore, source: "messung", reasons };
  }

  // Extras: Wie weit ist das Nächste zu Fuß? (bis 3 Min. = 10 … bis 12 Min. = 5, sonst „nicht gefunden“ = 1)
  const extra = (key: string, test: (t: Tags) => boolean, radius: number, what: string, many: string) => {
    const hits = near(radius, test);
    const first = hits[0];
    if (!first) {
      details[key] = { score: 1, source: "messung", reasons: [`Kein ${what} in ${radius} m gefunden (oder nicht in OpenStreetMap eingetragen)`] };
      return;
    }
    const min = walkMinutes(first.d);
    const score = step(min, [[3, 10], [5, 9], [8, 7], [12, 5]], 3);
    const name = nameOf(first.p.tags);
    details[key] = {
      score,
      source: "messung",
      reasons: [`${name ? `${name}: ` : `Nächster ${what}: `}ca. ${min} Min. zu Fuß`, ...(hits.length > 1 ? [`${hits.length} ${many} in ${radius} m`] : [])],
    };
  };
  extra("supermarkt", isSupermarket, 600, "Supermarkt", "Supermärkte und Läden");
  extra("waschsalon", isLaundry, 600, "Waschsalon", "Waschsalons");
  extra("cafe", isCafe, 500, "Café", "Cafés und Coworking-Spaces");
  extra("strand", isBeach, 800, "Strand", "Strände");
  extra("fitness", isGym, 800, "Fitnessstudio", "Fitnessstudios");
  extra("sehenswert", isSight, 800, "Ort zum Anschauen", "Sehenswürdigkeiten");

  // Datenlage: Wie viel weiß OpenStreetMap über diese Gegend?
  const known = near(500, (t) => Boolean(t.amenity || t.shop || t.tourism || t.railway || t.public_transport)).length;
  const coverage: Coverage =
    known >= 15
      ? { level: "gut", text: "Viele Einträge in OpenStreetMap. Der Score ist gut abgesichert." }
      : known >= 5
        ? { level: "mittel", text: "Einige Einträge in OpenStreetMap. Der Score ist eine gute Orientierung." }
        : {
            level: "duenn",
            text: "Kaum Einträge in OpenStreetMap. Entweder ist hier wenig los oder die Karte ist unvollständig. Schau dir die Gegend zusätzlich selbst an.",
          };

  const highlights: Highlight[] = [
    { icon: "transit", text: details.transit.reasons[0] },
    { icon: "nightlife", text: details.nightlife.reasons[0] },
    { icon: "food", text: details.food.reasons[0] },
    { icon: "nature", text: details.nature.reasons[0] },
    { icon: "quiet", text: `Ruhe ${details.quiet.score}/10: ${details.quiet.reasons[0]}` },
  ];

  const scores = Object.fromEntries(Object.entries(details).map(([k, d]) => [k, d.score]));
  return {
    scores,
    details,
    highlights,
    coverage,
    counts: { bars: bars.length, clubs: clubs.length, food: food.length, hostels },
    nearestRail: train
      ? { name: nameOf(train.p.tags) ?? "Bahnhof", dist: Math.round(train.d) }
      : tram
        ? { name: nameOf(tram.p.tags) ?? "Straßenbahn", dist: Math.round(tram.d) }
        : null,
  };
}

/** Wie stark trägt jedes Kriterium zum Match bei? Für die Erklärung „Warum 74?“ */
export function matchBreakdown(scores: Record<string, number | null>, weights: Record<string, number>) {
  const rows = Object.entries(weights)
    .map(([key, w]) => ({ key, weight: w, score: scores[key] ?? null }))
    .sort((a, b) => b.weight - a.weight);
  const used = rows.filter((r) => r.weight > 0 && r.score !== null);
  const total = used.reduce((s, r) => s + r.weight, 0);
  return {
    rows: rows.map((r) => ({ ...r, share: r.weight > 0 && r.score !== null && total ? Math.round((r.weight / total) * 100) : 0 })),
    ignored: rows.filter((r) => r.weight > 0 && r.score === null).map((r) => r.key),
  };
}
