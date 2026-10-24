// Reiseziel in der Adresse (URL): ?ort=Lissabon&land=Portugal&lat=38.72&lon=-9.14
// Alles wird geprüft, bevor es benutzt wird (Zahlenbereiche, Länge der Namen).

export type Ziel = { ort: string; land: string; lat: number; lon: number };

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max) : "";

export function parseZiel(params: Record<string, string | string[] | undefined>, prefix = ""): Ziel | null {
  const lat = Number(params[`${prefix}lat`]);
  const lon = Number(params[`${prefix}lon`]);
  const ort = clean(params[`${prefix}ort`], 80);
  if (!ort || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85 || Math.abs(lon) > 180) return null;
  return { ort, land: clean(params[`${prefix}land`], 60), lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4 };
}

export function zielQuery(z: Ziel, prefix = "") {
  return new URLSearchParams({
    [`${prefix}ort`]: z.ort,
    [`${prefix}land`]: z.land,
    [`${prefix}lat`]: z.lat.toFixed(4),
    [`${prefix}lon`]: z.lon.toFixed(4),
  }).toString();
}
