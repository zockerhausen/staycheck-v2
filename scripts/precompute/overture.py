"""Orte aus Overture Maps (Lizenz CDLA Permissive 2.0) für eine Stadt holen und in OSM-ähnliche Merkmale übersetzen.

Aufruf: python3 overture.py <release> <minlon,minlat,maxlon,maxlat> <ausgabe.geojsonseq>
Schreibt nur Bars, Essen und günstige Unterkünfte (Hostels, Gästehäuser). Bei jedem Fehler entsteht eine leere Datei,
damit die Vorberechnung trotzdem mit OpenStreetMap allein weiterläuft.
"""

import json
import re
import sys

import duckdb

MIN_CONFIDENCE = 0.75  # unsichere Einträge (oft geschlossen oder doppelt) weglassen

NIGHT = {
    "bar", "pub", "night_club", "nightclub", "cocktail_bar", "beer_bar", "wine_bar", "sports_bar", "dive_bar",
    "lounge", "beer_garden", "brewpub", "gay_bar", "hookah_bar", "irish_pub", "speakeasy", "rooftop_bar",
}
CLUB = {"night_club", "nightclub", "dance_club"}
FOOD = {
    "restaurant", "cafe", "coffee_shop", "fast_food_restaurant", "casual_eatery", "food_court", "food_stand",
    "street_food", "noodle_shop", "diner", "bistro", "tea_room",
}
HOSTEL = {"hostel"}
GUEST = {"guest_house", "bed_and_breakfast", "homestay"}

SAFE_RELEASE = re.compile(r"^\d{4}-\d{2}-\d{2}\.\d+$")


def tokens(*vals):
    out = set()
    for v in vals:
        if v is None:
            continue
        if isinstance(v, (list, tuple)):
            out.update(str(x).lower() for x in v if x)
        else:
            out.add(str(v).lower())
    return out


def classify(tok):
    if tok & NIGHT:
        return {"amenity": "nightclub" if tok & CLUB else "bar"}
    if tok & HOSTEL:
        return {"tourism": "hostel"}
    if tok & GUEST:
        return {"tourism": "guest_house"}
    if tok & FOOD:
        return {"amenity": "cafe" if tok & {"cafe", "coffee_shop", "tea_room"} else "restaurant"}
    return None


def main():
    release, bbox, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    if not SAFE_RELEASE.match(release):
        raise SystemExit(f"Unerwartete Release-Bezeichnung: {release!r}")
    minlon, minlat, maxlon, maxlat = (float(x) for x in bbox.split(","))
    src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*"

    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    where = "bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ? AND confidence >= ?"
    args = [minlon, maxlon, minlat, maxlat, MIN_CONFIDENCE]
    # Neues Schema (taxonomy/basic_category); falls nicht vorhanden, das alte (categories)
    queries = [
        f"SELECT names.primary, bbox.xmin, bbox.ymin, basic_category, taxonomy.primary, taxonomy.hierarchy, "
        f"addresses[1].freeform, operating_status FROM read_parquet('{src}', hive_partitioning=1) WHERE {where}",
        f"SELECT names.primary, bbox.xmin, bbox.ymin, categories.primary, NULL, NULL, addresses[1].freeform, NULL "
        f"FROM read_parquet('{src}', hive_partitioning=1) WHERE {where}",
    ]
    rows = None
    for q in queries:
        try:
            rows = con.execute(q, args).fetchall()
            break
        except duckdb.Error as e:  # Spalte fehlt → nächste Variante
            print(f"Overture-Abfrage: {str(e)[:200]}", file=sys.stderr)
    rows = rows or []

    # Viertel-Namen aus Overture Divisions (Stadtteile, Viertel, Kieze) als zusätzliche Namen für die Viertel
    hoods = []
    try:
        dsrc = f"s3://overturemaps-us-west-2/release/{release}/theme=divisions/type=division/*"
        hoods = con.execute(
            f"SELECT names.primary, bbox.xmin, bbox.ymin, subtype FROM read_parquet('{dsrc}', hive_partitioning=1) "
            "WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ? AND subtype IN ('neighborhood', 'microhood')",
            [minlon, maxlon, minlat, maxlat],
        ).fetchall()
    except duckdb.Error as e:
        print(f"Overture-Viertel: {str(e)[:200]}", file=sys.stderr)
    PLACE = {"neighborhood": "quarter", "microhood": "neighbourhood"}  # ganze Bezirke kennt OSM schon

    n = {"bar": 0, "food": 0, "stay": 0, "place": 0}
    with open(out_path, "w", encoding="utf8") as f:
        for name, lon, lat, basic, primary, hier, addr, status in rows:
            if not name or lon is None or lat is None:
                continue
            if status and "closed" in str(status).lower():
                continue
            tags = classify(tokens(basic, primary, hier))
            if not tags:
                continue
            tags["name"] = str(name)[:120]
            tags["src"] = "overture"
            if addr:
                tags["addr:full"] = str(addr)[:120]
            kind = "stay" if "tourism" in tags else ("bar" if tags.get("amenity") in ("bar", "nightclub") else "food")
            n[kind] += 1
            f.write(json.dumps({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": tags}, ensure_ascii=False) + "\n")
        for name, lon, lat, subtype in hoods:
            if not name or lon is None or lat is None or subtype not in PLACE:
                continue
            n["place"] += 1
            props = {"place": PLACE[subtype], "name": str(name)[:80], "src": "overture"}
            f.write(json.dumps({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": props}, ensure_ascii=False) + "\n")
    print(f"Overture {release}: {n['bar']} Bars, {n['food']} Essen, {n['stay']} Hostels/Gästehäuser, {n['place']} Viertel-Namen (vor dem Abgleich mit OSM)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # nie die ganze Vorberechnung stoppen
        print(f"::warning title=Overture::{str(e)[:300]}")
        open(sys.argv[3], "w").close()
