// Liste der vorzuberechnenden Städte (beliebte Ziele + geprüfte Städte) als JSON auf stdout.
import { POPULAR } from "../../src/lib/popular";

// Geprüfte Städte aus der Datenbank (Mittelpunkt wie in cities.lat/lng), mit größerem Raster
const VERIFIED = [
  { slug: "berlin", ort: "Berlin", land: "Deutschland", lat: 52.51, lon: 13.405 },
  { slug: "bangkok", ort: "Bangkok", land: "Thailand", lat: 13.745, lon: 100.53 },
];

const out = [
  ...VERIFIED.map((c) => ({ ...c, radius: 6000 })),
  ...POPULAR.map((p) => ({ slug: p.slug, ort: p.ort, land: p.land, lat: p.lat, lon: p.lon, radius: 3500 })),
];
process.stdout.write(JSON.stringify(out));
