"""Ordnet jeder Stadt die kleinste Geofabrik-Region zu, die sie (mit Rand) ganz enthält.
Ausgabe: GitHub-Matrix [{region, url, cities: "slug,slug"}]."""
import json, math, sys, urllib.request
from shapely.geometry import shape, box

cities = json.load(open(sys.argv[1]))
req = urllib.request.Request("https://download.geofabrik.de/index-v1.json", headers={"User-Agent": "StayCheck-Vorberechnung (github.com/zockerhausen/staycheck-v2)"})
index = json.load(urllib.request.urlopen(req, timeout=120))
regions = []
for f in index["features"]:
    p = f["properties"]
    url = p.get("urls", {}).get("pbf")
    if not url or f.get("geometry") is None:
        continue
    g = shape(f["geometry"])
    regions.append((g.area, p["id"], url, g))

groups = {}
for c in cities:
    m = (c["radius"] + 2500) / 111000
    cell = box(c["lon"] - m / math.cos(math.radians(c["lat"])), c["lat"] - m, c["lon"] + m / math.cos(math.radians(c["lat"])), c["lat"] + m)
    best = None
    for area, rid, url, g in regions:
        if g.contains(cell) and (best is None or area < best[0]):
            best = (area, rid, url)
    if best is None:
        print(f"Keine Region für {c['slug']}", file=sys.stderr)
        continue
    groups.setdefault(best[1], {"region": best[1], "url": best[2], "cities": []})["cities"].append(c["slug"])

matrix = [{**g, "cities": ",".join(g["cities"])} for g in groups.values()]
print(json.dumps(matrix))
