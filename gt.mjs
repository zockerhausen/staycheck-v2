// scripts/precompute/stubs/cache.js
var unstable_cache = (fn) => fn;

// src/lib/wikivoyage.ts
var UA = "StayCheck/1.0 (https://staycheck-v2-git-main-passt.vercel.app; pauljonas.beth@me.com)";
async function api(lang, params) {
  const url = `https://${lang}.wikivoyage.org/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6e3), cache: "no-store" });
  if (!r.ok) throw new Error(`wikivoyage ${r.status}`);
  return r.json();
}
function tidy(text) {
  const t = text.replace(/\s*\([^)]*\b(Koordinaten|coordinates)\b[^)]*\)/gi, "").replace(/\s+/g, " ").trim();
  if (t.length <= 480) return t;
  const cut = t.slice(0, 480);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 120 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")} \u2026`;
}
var OVERVIEW = /^(hintergrund|orientierung|understand|orientation|overview)$/i;
function overview(full) {
  const out = [];
  let keep = true;
  for (const line of full.split("\n")) {
    const h = line.match(/^=+\s*(.*?)\s*=+$/);
    if (h) {
      keep = OVERVIEW.test(h[1]);
      continue;
    }
    if (keep && line.trim()) out.push(line.trim());
  }
  return out.join(" ");
}
async function findIn(lang, lat, lon) {
  const geo = await api(lang, { action: "query", list: "geosearch", gscoord: `${lat}|${lon}`, gsradius: "4000", gslimit: "30" });
  const hits = (geo?.query?.geosearch ?? []).filter((h) => typeof h?.title === "string" && typeof h?.dist === "number");
  const district = hits.filter((h) => h.title.includes("/") && !/\/(Umgebung|Anreise|Get in)/i.test(h.title)).sort((a, b) => a.dist - b.dist)[0];
  if (!district || district.dist > 3500) return null;
  const ex = await api(lang, { action: "query", prop: "extracts", explaintext: "1", exsectionformat: "wiki", titles: district.title, redirects: "1" });
  const page = ex?.query?.pages?.[0];
  const text = typeof page?.extract === "string" ? tidy(overview(page.extract)) : "";
  if (text.length < 60) return null;
  return {
    title: String(page.title ?? district.title),
    text,
    url: `https://${lang}.wikivoyage.org/wiki/${encodeURIComponent(String(page.title ?? district.title).replace(/ /g, "_"))}`,
    lang,
    distKm: Math.round(district.dist / 100) / 10
  };
}
var cached = unstable_cache(
  async (lat, lon) => await findIn("de", lat, lon) ?? await findIn("en", lat, lon),
  ["wikivoyage-v2"],
  { revalidate: 60 * 60 * 24 * 30 }
);
function guideNear(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve(null);
  return cached(Number(lat.toFixed(3)), Number(lon.toFixed(3))).catch(() => null);
}

// gt.ts
for (const [la, lo] of [[52.5265, 13.401], [38.7114, -9.13], [13.7246, 100.5293]]) console.log(la, lo, JSON.stringify(await guideNear(la, lo)));
