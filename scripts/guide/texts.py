"""Reiseführer-Texte (Wikivoyage, CC BY-SA 4.0) mit einer kleinen KI in Werte übersetzen.

Für jede vorberechnete Stadt:
  1. Wikivoyage-Artikel rund um die Stadt holen (Englisch, Deutsch) und nur den Fließtext behalten:
     Einleitung, Hintergrund/Orientierung, Stadtteile, Ausgehen, Unterkunft, Sicherheit (keine Einträge, keine Preise).
  2. Claude Haiku liest NUR diesen Text (keine Websuche, kein eigenes Wissen) und sagt pro Gegend,
     was der Text über Nachtleben, Ruhe, Essen, Preise, Sicherheit, Anbindung und Grün sagt – jeweils mit wörtlichem Zitat.
  3. Jedes Zitat wird geprüft: Steht es wirklich so im Text? Wenn nicht, wird der Wert verworfen.
  4. Gegenden bekommen ihre Lage nie von der KI: aus Wikivoyage-Stadtteilartikeln, aus unseren Vierteln
     oder über die Ortssuche Photon (OpenStreetMap) innerhalb der Stadt. Was sich nicht finden lässt, fällt weg.
Ergebnis: data/insights/<stadt>.json (Gegenden mit Werten, Zitat als Begründung und Link zum Artikel).

Läuft als Sammelauftrag (Batch, halber Preis). Kostenbremse: MAX_USD (Standard 3).
Umgebung: ANTHROPIC_API_KEY, NUR=slug,slug, MAX_USD, DRY_RUN=1 (nur Texte sammeln und Kosten schätzen).
"""

import datetime as dt
import glob
import gzip
import json
import math
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wikivoyage import api, city_articles, clean, dist, fetch_texts, split_params, status_of, templates, STATUS_W  # noqa: E402

KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MODEL = os.environ.get("MODEL", "claude-haiku-5-5")
ONLY = [s.strip() for s in os.environ.get("NUR", "").split(",") if s.strip()]
MAX_USD = float(os.environ.get("MAX_USD", "3"))
DRY = os.environ.get("DRY_RUN") == "1"
# Batch-Preise Haiku 5.5 (bis 100.000 Tokens pro Anfrage): 0,05 $ / 0,25 $ je Million Tokens
PRICE_IN, PRICE_OUT = 0.05 / 1e6, 0.25 / 1e6
MAX_CHARS = 280_000  # bleibt sicher unter 100.000 Tokens pro Stadt
KEYS = ["nightlife", "quiet", "food", "budget", "safety", "transit", "nature"]
KEEP = re.compile(
    r"^(understand|orientation|districts|drink|sleep|stay safe|get around|"
    r"hintergrund|orientierung|stadtteile|nachtleben|unterkunft|sicherheit|mobilität)$",
    re.I,
)
UA = "StayCheck/1.0 (https://github.com/zockerhausen/staycheck-v2; Reiseführer-Auswertung)"


def prose(text):
    """Nur Fließtext der wichtigen Abschnitte, Stadtteil-Beschreibungen aus Regionlist dazu."""
    out, keep, head = [], True, "Einleitung"
    regions = []
    for body in templates(text):
        name, p = split_params(body)
        if name == "regionlist":
            for k, v in p.items():
                m = re.fullmatch(r"region(\d+)name", k)
                if m:
                    desc = p.get(f"region{m.group(1)}description", "")
                    if desc:
                        regions.append(f"{clean(v)}: {clean(desc)}")
    for line in text.split("\n"):
        h = re.match(r"^(=+)\s*(.*?)\s*=+\s*$", line)
        if h:
            if len(h.group(1)) == 2:
                keep = bool(KEEP.match(clean(h.group(2))))
                head = clean(h.group(2))
                if keep:
                    out.append(f"\n## {head}")
            elif keep:
                out.append(f"### {clean(h.group(2))}")
            continue
        if not keep or line.lstrip().startswith(("*", "{{", "|", "}}", "[[File", "[[Datei", "[[Image")):
            continue
        t = clean(line)
        if len(t) > 30:
            out.append(t)
    if regions:
        out.insert(0, "## Stadtteile (Übersicht)\n" + "\n".join(regions))
    return "\n".join(out).strip()


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").lower()
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[“”„\"'’`]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def photon(name, lat, lon, radius):
    q = urllib.parse.urlencode({"q": name, "lat": lat, "lon": lon, "limit": 5})
    try:
        with urllib.request.urlopen(urllib.request.Request(f"https://photon.komoot.io/api/?{q}", headers={"User-Agent": UA}), timeout=20) as r:
            feats = json.load(r).get("features", [])
    except Exception:
        return None
    for f in feats:
        lo, la = f["geometry"]["coordinates"]
        if dist(lat, lon, la, lo) <= radius:
            return la, lo
    return None


PROMPT = """Du bekommst Auszüge aus dem freien Reiseführer Wikivoyage über {ort}. Nutze NUR diesen Text, kein eigenes Wissen.

Aufgabe: Für jede Gegend der Stadt, über die der Text etwas Konkretes sagt, schätze diese Werte von 1 (sehr schlecht/wenig) bis 10 (sehr gut/viel) – aber NUR, wenn der Text dazu etwas Klares sagt:
- nightlife: Bars, Clubs, Ausgehen (10 = Ausgehviertel)
- quiet: Ruhe zum Schlafen (10 = sehr ruhig, 1 = sehr laut)
- food: Essen in der Nähe (Auswahl, Qualität)
- budget: wie günstig Unterkünfte und Essen sind (10 = sehr günstig)
- safety: Sicherheit für Reisende (10 = sehr sicher; Abzocke, Diebstahl, Überfälle senken den Wert)
- transit: Anbindung mit Bahn/Bus/Boot (10 = sehr gut)
- nature: Parks, Wasser, Grün

Für JEDEN Wert brauchst du ein wörtliches Zitat aus dem Text (genau so geschrieben, 5–25 Wörter, keine Auslassungen). Kein Zitat = kein Wert.
Höchstens 20 Gegenden, die wichtigsten für Reisende zuerst. Halte summary, why, goodFor und watchOut kurz.
Bekannte Gegenden (nimm diese Namen, wenn sie passen): {known}
Andere Gegenden nur, wenn der Text sie klar als Teil von {ort} beschreibt (z. B. ein Viertel, eine Straße, ein Ufer).

Antworte nur mit JSON:
{{"areas":[{{"name":"…","summary":"1 Satz auf Deutsch, was die Gegend für Reisende ausmacht","goodFor":["kurz, Deutsch"],"watchOut":["kurz, Deutsch"],
"values":{{"nightlife":{{"v":8,"quote":"…","why":"kurz auf Deutsch"}}}}}}]}}

TEXT:
{text}"""


def collect(city):
    slug, lat, lon, radius, ort = city["slug"], city["lat"], city["lon"], city["radius"], city["ort"]
    docs, district_pts = [], {}
    for lang in ("en", "de"):
        try:
            geo = api(lang, {"action": "query", "list": "geosearch", "gscoord": f"{lat}|{lon}", "gsradius": str(min(10000, radius + 2000)), "gslimit": "500", "gsnamespace": "0"})
            hits = geo.get("query", {}).get("geosearch", [])
            for h in hits:
                if "/" in h["title"]:
                    district_pts.setdefault(norm(h["title"].split("/")[-1]), (h["lat"], h["lon"]))
            for t, text in fetch_texts(lang, [h["title"] for h in hits]).items():
                st = status_of(text) if lang == "en" else None
                w = STATUS_W.get(st, 0.75) if st else 0.75
                if w <= 0:
                    continue
                body = prose(text)
                if len(body) > 300:
                    docs.append({"lang": lang, "title": t, "w": w, "text": body,
                                 "url": f"https://{lang}.wikivoyage.org/wiki/{urllib.parse.quote(t.replace(' ', '_'), safe='/')}"})
        except Exception as e:
            print(f"::warning title={slug}::Wikivoyage {lang}: {str(e)[:200]}")
    # Größte Artikel zuerst, bis zur Längengrenze
    docs.sort(key=lambda d: (-d["w"], -len(d["text"])))
    keep, total = [], 0
    for d in docs:
        if total + len(d["text"]) > MAX_CHARS:
            continue
        keep.append(d)
        total += len(d["text"])
    return keep, district_pts


def build_request(city, docs):
    known = sorted({d["name"] for d in city["city"]["districts"]} | {p["n"] for p in (city["city"].get("places") or [])})[:80]
    text = "\n\n".join(f"=== [{i}] {d['title']} ({d['lang']}) ===\n{d['text']}" for i, d in enumerate(docs))
    prompt = PROMPT.format(ort=city["ort"], known=", ".join(known) or "(keine)", text=text)
    return {"custom_id": city["slug"], "params": {"model": MODEL, "max_tokens": 16000, "messages": [{"role": "user", "content": prompt}]}}


def http(method, url, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read().decode()
    return raw


def run_batch(requests):
    b = json.loads(http("POST", "https://api.anthropic.com/v1/messages/batches", {"requests": requests}))
    bid = b["id"]
    print(f"Sammelauftrag {bid} mit {len(requests)} Städten gestartet")
    while True:
        time.sleep(60)
        st = json.loads(http("GET", f"https://api.anthropic.com/v1/messages/batches/{bid}"))
        if st.get("processing_status") == "ended":
            break
        print("  läuft …", st.get("request_counts"))
    out = {}
    for line in http("GET", st["results_url"]).splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        res = r.get("result", {})
        if res.get("type") == "succeeded":
            msg = res["message"]
            txt = "".join(c.get("text", "") for c in msg.get("content", []) if c.get("type") == "text")
            out[r["custom_id"]] = (txt, msg.get("usage", {}))
        else:
            print(f"::warning title={r['custom_id']}::KI-Auswertung fehlgeschlagen: {json.dumps(res)[:200]}")
    return out


def parse_answer(answer):
    """JSON aus der Antwort lesen; ist sie abgeschnitten, die vollständigen Gegenden davor retten."""
    start = answer.find("{")
    if start < 0:
        return None
    body = answer[start:]
    end = body.rfind("}")
    try:
        return json.loads(body[: end + 1])
    except json.JSONDecodeError:
        pass
    cuts = [m.start() for m in re.finditer(r',\s*\{\s*"name"', body)]
    for pos in reversed(cuts):
        try:
            return json.loads(body[:pos] + "]}")
        except json.JSONDecodeError:
            continue
    return None


def short(x, n):
    x = str(x).strip()
    return x if len(x) <= n else x[:n].rsplit(" ", 1)[0] + " …"


def check(city, docs, district_pts, answer):
    """Antwort prüfen: Zitate müssen wörtlich im Text stehen, Gegenden müssen sich in der Stadt finden lassen."""
    data = parse_answer(answer)
    if data is None:
        print(f"::warning title={city['slug']}::KI-Antwort nicht lesbar")
        return []
    ntexts = [(d, norm(d["text"])) for d in docs]
    ours = {norm(d["name"]): (d["lat"], d["lon"]) for d in city["city"]["districts"]}
    for p in city["city"].get("places") or []:
        ours.setdefault(norm(p["n"]), (p["lat"], p["lon"]))
    areas, dropped = [], 0
    for a in data.get("areas", [])[:40]:
        name = str(a.get("name", ""))[:60].strip()
        if not name:
            continue
        pt = ours.get(norm(name)) or district_pts.get(norm(name)) or photon(f"{name}, {city['ort']}", city["lat"], city["lon"], city["radius"] + 1500)
        if not pt:
            dropped += 1
            continue
        values, sources = {}, []
        for k in KEYS:
            v = (a.get("values") or {}).get(k)
            if not isinstance(v, dict):
                continue
            try:
                val = int(round(float(v.get("v"))))
            except (TypeError, ValueError):
                continue
            q = str(v.get("quote", "")).strip()
            nq = norm(q)
            if not (1 <= val <= 10) or len(nq) < 20:
                continue
            doc = next((d for d, t in ntexts if nq in t), None)
            if not doc:
                dropped += 1
                continue
            if doc["url"] not in [s["url"] for s in sources]:
                sources.append({"url": doc["url"], "title": f"Wikivoyage ({doc['lang']}): {doc['title']}"})
            why = str(v.get("why", ""))[:160].strip()
            values[k] = {"v": val, "why": f"{why} – „{q[:220]}“", "src": [[s["url"] for s in sources].index(doc["url"])], "w": doc["w"]}
        if values:
            areas.append({"name": name, "kind": "viertel", "lat": pt[0], "lon": pt[1], "checked": dt.date.today().isoformat(), "found": True,
                          "summary": str(a.get("summary", ""))[:240], "goodFor": [short(x, 50) for x in (a.get("goodFor") or [])][:4],
                          "watchOut": [short(x, 60) for x in (a.get("watchOut") or [])][:4], "values": values, "sources": sources})
    print(f"{city['slug']}: {len(areas)} Gegenden mit belegten Werten, {dropped} Angaben verworfen (Zitat oder Ort nicht gefunden)")
    return areas


def main():
    if not KEY and not DRY:
        print("::notice::ANTHROPIC_API_KEY fehlt – KI-Auswertung übersprungen (Wikivoyage-Einträge zählen trotzdem).")
        return
    cities, requests, est = {}, [], 0.0
    for f in sorted(glob.glob("data/cities/*.json.gz")):
        c = json.load(gzip.open(f))
        if ONLY and c["slug"] not in ONLY:
            continue
        docs, pts = collect(c)
        if not docs:
            print(f"{c['slug']}: keine brauchbaren Wikivoyage-Texte")
            continue
        req = build_request(c, docs)
        chars = len(req["params"]["messages"][0]["content"])
        est += chars / 3.5 * PRICE_IN + 6000 * PRICE_OUT
        print(f"{c['slug']}: {len(docs)} Artikel, {chars} Zeichen Text")
        cities[c["slug"]] = (c, docs, pts)
        requests.append(req)
    print(f"Geschätzte Kosten: {est:.2f} $ (Grenze {MAX_USD} $)")
    if DRY or not requests:
        return
    if est > MAX_USD:
        raise SystemExit(f"Geschätzte Kosten {est:.2f} $ über der Grenze {MAX_USD} $ – abgebrochen.")
    results = run_batch(requests)
    os.makedirs("data/insights", exist_ok=True)
    used_in = used_out = 0
    for slug, (txt, usage) in results.items():
        c, docs, pts = cities[slug]
        used_in += usage.get("input_tokens", 0)
        used_out += usage.get("output_tokens", 0)
        areas = check(c, docs, pts, txt)
        out = f"data/insights/{slug}.json"
        if not areas and os.path.exists(out):
            print(f"{slug}: keine neuen Werte – alte Auswertung bleibt")
            continue
        res = {"v": 1, "slug": slug, "generated": dt.date.today().isoformat(), "model": f"{MODEL} (nur Wikivoyage-Text, Zitate geprüft)", "areas": areas}
        json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
    print(f"Verbrauch: {used_in} Tokens Eingabe, {used_out} Ausgabe ≈ {used_in * PRICE_IN + used_out * PRICE_OUT:.2f} $")


if __name__ == "__main__":
    main()
