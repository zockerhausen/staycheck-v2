"""Reiseführer-Wissen aus Wikivoyage (Lizenz CC BY-SA 4.0) für eine vorberechnete Stadt.

Holt alle Wikivoyage-Artikel rund um die Stadt (Englisch und Deutsch), liest die Einträge der Reisenden
(Essen, Trinken/Ausgehen, Schlafen) mit Koordinaten, Preis und Prüfdatum und rechnet daraus Werte
für jeden Rasterpunkt der Stadt:
  - Nachtleben: vom Reiseführer empfohlene Bars und Clubs in 600 m
  - Essen: empfohlene Restaurants und Cafés in 500 m
  - Günstig: Preise der empfohlenen Unterkünfte in 900 m im Vergleich zur ganzen Stadt

Gewicht (0–1) je Wert: Artikel-Qualität (Stern/Reiseführer 1, brauchbar 0,75, Gliederung zählt nicht)
und Alter der Einträge (seit mehr als 4 Jahren nicht geprüft = 0,6). Zu wenige Einträge in der Stadt = kein Wert.

Aufruf: python3 wikivoyage.py <stadt.json.gz> <ausgabe.json>
"""

import datetime as dt
import gzip
import json
import math
import re
import statistics
import sys
import time
import urllib.parse
import urllib.request

UA = "StayCheck/1.0 (https://github.com/zockerhausen/staycheck-v2; Reiseführer-Auswertung)"
YEAR = dt.date.today().year
FRESH_YEARS = 4

# Einträge nach Art (Englisch: eigene Vorlagen, Deutsch: vCard mit type=…)
EN_TYPES = {"eat": "eat", "drink": "drink", "sleep": "sleep"}
DE_TYPES = {
    "bar": "drink", "pub": "drink", "nightclub": "drink", "disco": "drink", "club": "drink", "kneipe": "drink", "biergarten": "drink",
    "restaurant": "eat", "cafe": "eat", "café": "eat", "imbiss": "eat", "fast food": "eat", "food court": "eat", "bistro": "eat",
    "hostel": "sleep", "hotel": "sleep", "guest house": "sleep", "pension": "sleep", "apartment": "sleep", "guesthouse": "sleep", "b&b": "sleep",
}
STATUS_W = {"star": 1.0, "guide": 1.0, "usable": 0.75, "outline": 0.0}
MIN_CITY = {"drink": 12, "eat": 15}  # so viele Einträge mit Koordinaten braucht die Stadt mindestens
RADIUS = {"drink": 600, "eat": 500, "sleep": 900}


def api(lang, params, tries=3):
    q = urllib.parse.urlencode({"format": "json", "formatversion": "2", **params})
    url = f"https://{lang}.wikivoyage.org/w/api.php?{q}"
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                return json.load(r)
        except Exception as e:  # kurz warten, dann nochmal
            if i == tries - 1:
                raise
            time.sleep(2 + 3 * i)
    return {}


def dist(a_lat, a_lon, b_lat, b_lon):
    r = 6371000
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = p2 - p1
    dl = math.radians(b_lon - a_lon)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def templates(text):
    """Alle Vorlagen {{name|a=b|…}} der obersten Ebene, mit sauber getrennten Parametern."""
    out = []
    i = 0
    n = len(text)
    while True:
        i = text.find("{{", i)
        if i < 0:
            break
        depth, j = 0, i
        while j < n - 1:
            two = text[j : j + 2]
            if two == "{{":
                depth += 1
                j += 2
                continue
            if two == "}}":
                depth -= 1
                j += 2
                if depth == 0:
                    break
                continue
            j += 1
        body = text[i + 2 : j - 2]
        out.append(body)
        # Verschachtelte Vorlagen (z. B. Einträge in Listen) mit durchsuchen
        if "{{" in body:
            out.extend(templates(body))
        i = j
    return out


def split_params(body):
    parts, cur, d1, d2 = [], [], 0, 0
    k = 0
    while k < len(body):
        two = body[k : k + 2]
        if two in ("{{", "[[", "}}", "]]"):
            if two == "{{":
                d1 += 1
            elif two == "[[":
                d2 += 1
            elif two == "}}":
                d1 -= 1
            else:
                d2 -= 1
            cur.append(two)
            k += 2
            continue
        c = body[k]
        if c == "|" and d1 == 0 and d2 == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
        k += 1
    parts.append("".join(cur))
    name = parts[0].strip().lower()
    params = {}
    for p in parts[1:]:
        if "=" in p:
            a, b = p.split("=", 1)
            params[a.strip().lower()] = b.strip()
    return name, params


def clean(s):
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s or "")
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"'{2,}", "", s)
    return re.sub(r"\s+", " ", s).strip()


CUR = [("฿", "THB"), ("baht", "THB"), ("thb", "THB"), ("€", "EUR"), ("eur", "EUR"), ("£", "GBP"), ("us$", "USD"), ("usd", "USD"), ("$", "USD"),
       ("¥", "JPY"), ("yen", "JPY"), ("₫", "VND"), ("dong", "VND"), ("rp", "IDR"), ("rm", "MYR"), ("kč", "CZK"), ("czk", "CZK"), ("zł", "PLN"),
       ("pln", "PLN"), ("ft", "HUF"), ("huf", "HUF"), ("kr", "KR"), ("r$", "BRL"), ("₩", "KRW"), ("won", "KRW"), ("riel", "KHR"), ("dh", "MAD"),
       ("mad", "MAD"), ("lari", "GEL"), ("₾", "GEL"), ("s/", "PEN"), ("nt$", "TWD"), ("hk$", "HKD"), ("s$", "SGD"), ("a$", "AUD"), ("nz$", "NZD"),
       ("₺", "TRY"), ("tl", "TRY"), ("zar", "ZAR"), ("cop", "COP"), ("mxn", "MXN"), ("ars", "ARS")]


def price(raw):
    """Erster Preis eines Eintrags (Zahl und Währung), sonst None. Spannen wie „300–500“ = untere Grenze."""
    s = clean(raw).lower()
    if not s or re.search(r"\bfree\b|kostenlos|gratis", s):
        return None
    m = re.search(r"(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d{1,2})?)", s)
    if not m:
        return None
    num = m.group(1).replace(" ", "")
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", num):
        num = re.sub(r"[.,]", "", num)
    else:
        num = num.replace(",", ".")
    try:
        v = float(num)
    except ValueError:
        return None
    if v <= 0:
        return None
    cur = next((c for sym, c in CUR if sym in s), None)
    return v, cur


def year_of(params):
    m = re.search(r"(20\d{2}|19\d{2})", params.get("lastedit", ""))
    return int(m.group(1)) if m else None


def coord(params):
    try:
        la = float(params.get("lat", "").strip())
        lo = float((params.get("long") or params.get("lon") or "").strip())
    except ValueError:
        return None
    if not (-90 <= la <= 90 and -180 <= lo <= 180) or (la == 0 and lo == 0):
        return None
    return la, lo


def status_of(text):
    m = re.search(r"\{\{\s*(star|guide|usable|outline)(?:city|district|park|airport|region|country|itinerary|topic|)\s*[|}]", text, re.I)
    return m.group(1).lower() if m else None


def listings_from(lang, title, text):
    st = status_of(text) if lang == "en" else None
    w_article = STATUS_W.get(st, 0.75) if st else 0.75
    out = []
    for body in templates(text):
        name, p = split_params(body)
        if lang == "en":
            kind = EN_TYPES.get(name) or (EN_TYPES.get(p.get("type", "").lower()) if name == "listing" else None)
        else:
            kind = DE_TYPES.get(p.get("type", "").lower()) if name in ("vcard", "listing") else None
        if not kind:
            continue
        c = coord(p)
        if not c:
            continue
        nm = clean(p.get("name", ""))[:80]
        if not nm:
            continue
        y = year_of(p)
        fresh = 1.0 if (y and YEAR - y <= FRESH_YEARS) else 0.6
        pr = price(p.get("price", "")) if kind == "sleep" else None
        out.append({"t": kind, "n": nm, "lat": c[0], "lon": c[1], "y": y, "w": round(w_article * fresh, 2), "p": pr, "a": title, "l": lang})
    return out, st, w_article


def city_articles(lang, lat, lon, radius):
    r = api(lang, {"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": str(min(10000, max(1000, radius))), "gslimit": "500", "gsnamespace": "0"})
    return [h["title"] for h in r.get("query", {}).get("geosearch", [])]


def fetch_texts(lang, titles):
    texts = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i : i + 40]
        r = api(lang, {"action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main", "titles": "|".join(chunk), "redirects": "1"})
        for pg in r.get("query", {}).get("pages", []):
            revs = pg.get("revisions") or []
            if revs:
                texts[pg["title"]] = revs[0]["slots"]["main"]["content"]
        time.sleep(1)
    return texts


def main():
    src, out_path = sys.argv[1], sys.argv[2]
    city = json.load(gzip.open(src))
    slug, lat, lon, radius = city["slug"], city["lat"], city["lon"], city["radius"]
    zones = city["city"]["zones"]

    listings, articles = [], {}
    for lang in ("en", "de"):
        try:
            titles = city_articles(lang, lat, lon, radius + 2000)
            for t, text in fetch_texts(lang, titles).items():
                ls, st, w = listings_from(lang, t, text)
                ls = [x for x in ls if dist(lat, lon, x["lat"], x["lon"]) <= radius + 1500]
                if ls:
                    articles[f"{lang}:{t}"] = {"title": t, "lang": lang, "status": st, "w": w, "n": len(ls)}
                    listings.extend([x for x in ls if x["w"] > 0])
        except Exception as e:
            print(f"::warning title={slug}::Wikivoyage {lang}: {str(e)[:200]}")

    # Doppelte (gleicher Ort auf Englisch und Deutsch) nur einmal zählen
    seen, uniq = [], []
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
    for x in sorted(listings, key=lambda x: (x["l"] != "en", -x["w"])):
        if any(o["t"] == x["t"] and dist(o["lat"], o["lon"], x["lat"], x["lon"]) < 60 and (norm(o["n"]) == norm(x["n"]) or dist(o["lat"], o["lon"], x["lat"], x["lon"]) < 15) for o in seen[-400:]):
            continue
        seen.append(x)
        uniq.append(x)
    listings = uniq

    by = {k: [x for x in listings if x["t"] == k] for k in ("eat", "drink", "sleep")}
    weight_of = {k: sum(x["w"] for x in v) for k, v in by.items()}

    # Preise: nur die häufigste Währung der Stadt (ohne Angabe = Landeswährung)
    priced = [x for x in by["sleep"] if x["p"]]
    curs = [x["p"][1] for x in priced if x["p"][1]]
    main_cur = statistics.mode(curs) if curs else None
    priced = [x for x in priced if (x["p"][1] in (None, main_cur))]
    priced_ids = {id(x) for x in priced}
    city_median = statistics.median([x["p"][0] for x in priced]) if len(priced) >= 12 else None

    # Rasterzellen für schnelles Zählen
    CELL = 0.01
    buckets = {}
    for i, x in enumerate(listings):
        buckets.setdefault((math.floor(x["lat"] / CELL), math.floor(x["lon"] / CELL)), []).append(i)

    def near(la, lo, kind, r):
        bi, bj = math.floor(la / CELL), math.floor(lo / CELL)
        res = []
        for a in range(bi - 1, bi + 2):
            for b in range(bj - 1, bj + 2):
                for i in buckets.get((a, b), []):
                    x = listings[i]
                    if x["t"] == kind and dist(la, lo, x["lat"], x["lon"]) <= r:
                        res.append(x)
        return res

    def step(v, table, top):
        for lim, s in table:
            if v <= lim:
                return s
        return top

    def src_of(xs):
        cnt = {}
        for x in xs:
            cnt[(x["l"], x["a"])] = cnt.get((x["l"], x["a"]), 0) + 1
        top = sorted(cnt.items(), key=lambda kv: -kv[1])[:3]
        return [{"url": f"https://{l}.wikivoyage.org/wiki/{urllib.parse.quote(a.replace(' ', '_'), safe='/')}", "title": f"Wikivoyage: {a}"} for (l, a), _ in top]

    def years(xs):
        ys = sorted(x["y"] for x in xs if x["y"])
        return f", Einträge geprüft {ys[0]}–{ys[-1]}" if len(ys) >= 2 and ys[0] != ys[-1] else (f", Einträge geprüft {ys[0]}" if ys else "")

    # Die größten Artikel der Stadt (Quelle, wenn in der Nähe nichts empfohlen wird)
    top_articles = sorted(articles.values(), key=lambda a: -a["n"])[:2]
    city_src = [{"url": f"https://{a['lang']}.wikivoyage.org/wiki/{urllib.parse.quote(a['title'].replace(' ', '_'), safe='/')}", "title": f"Wikivoyage: {a['title']}"} for a in top_articles]

    areas = []
    for z in zones:
        la, lo = z["lat"], z["lon"]
        values, per_key = {}, {}
        # Nachtleben und Essen: vom Reiseführer empfohlene Orte in der Nähe
        for key, kind, word in (("nightlife", "drink", "Bars und Clubs"), ("food", "eat", "Restaurants und Cafés")):
            if weight_of[kind] < MIN_CITY[kind]:
                continue
            xs = near(la, lo, kind, RADIUS[kind])
            n = sum(x["w"] for x in xs)
            v = step(n, [(0, 2), (0.9, 4), (1.9, 6), (3.9, 7), (6.9, 8), (10.9, 9)], 10)
            q = round(sum(x["w"] for x in xs) / len(xs), 2) if xs else 0.8
            why = f"{len(xs)} vom Reiseführer empfohlene {word} in {RADIUS[kind]} m" + years(xs) if xs else f"Der Reiseführer empfiehlt hier keine {word} (in {RADIUS[kind]} m)"
            values[key] = {"v": v, "why": why, "w": q}
            per_key[key] = src_of(xs)
        # Günstig: Preise der empfohlenen Unterkünfte im Vergleich zur Stadt
        if city_median:
            xs = [x for x in near(la, lo, "sleep", RADIUS["sleep"]) if id(x) in priced_ids]
            if len(xs) >= 3:
                med = statistics.median([x["p"][0] for x in xs])
                ratio = med / city_median
                v = step(ratio, [(0.6, 9), (0.8, 8), (1.0, 6), (1.3, 4), (1.8, 3)], 2)
                pct = round((1 - ratio) * 100)
                cmp = f"{abs(pct)} % günstiger als" if pct > 0 else (f"{abs(pct)} % teurer als" if pct < 0 else "so teuer wie")
                why = f"Unterkünfte laut Reiseführer hier im Schnitt {cmp} in der ganzen Stadt ({len(xs)} mit Preis{years(xs)})"
                values["budget"] = {"v": v, "why": why, "w": round(sum(x["w"] for x in xs) / len(xs), 2)}
                per_key["budget"] = src_of(xs)
        if not values:
            continue
        uniq_src = []
        for key, srcs in per_key.items():
            ids = []
            for sx in srcs:
                if sx not in uniq_src:
                    uniq_src.append(sx)
                ids.append(uniq_src.index(sx))
            values[key]["src"] = ids
        # Ohne Einträge in der Nähe trotzdem die Stadt-Artikel als Quelle nennen
        if not uniq_src:
            uniq_src = city_src
        for v in values.values():
            if not v.get("src"):
                v["src"] = list(range(len(uniq_src)))
        areas.append({
            "name": "Reiseführer", "kind": "raster", "lat": la, "lon": lo, "checked": dt.date.today().isoformat(), "found": True,
            "summary": "", "goodFor": [], "watchOut": [], "values": values, "sources": uniq_src,
        })

    res = {
        "v": 1, "slug": slug, "generated": dt.date.today().isoformat(), "model": "wikivoyage-listings",
        "stats": {"articles": len(articles), "listings": {k: len(v) for k, v in by.items()}, "priced": len(priced), "currency": main_cur,
                  "cityMedian": city_median, "statuses": sorted({a["status"] or "?" for a in articles.values()})},
        "areas": areas,
    }
    json.dump(res, open(out_path, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{slug}: {len(articles)} Artikel, Einträge Essen {len(by['eat'])}, Trinken {len(by['drink'])}, Schlafen {len(by['sleep'])} "
          f"({len(priced)} mit Preis {main_cur or ''}, Mittel {city_median}), {len(areas)} Rasterpunkte mit Reiseführer-Werten")


if __name__ == "__main__":
    main()
