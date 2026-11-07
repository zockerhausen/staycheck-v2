import json, re, urllib.request, urllib.parse
UA = "StayCheck/1.0 (https://github.com/zockerhausen/staycheck-v2)"
def get(lang, params):
    q = urllib.parse.urlencode({"format":"json","formatversion":"2",**params})
    return json.load(urllib.request.urlopen(urllib.request.Request(f"https://{lang}.wikivoyage.org/w/api.php?{q}", headers={"User-Agent":UA}), timeout=30))
for lang, title in [("en","Chiang Mai"),("de","Chiang Mai"),("en","Bangkok"),("en","Lisbon"),("en","Berlin/Kreuzberg")]:
    r = get(lang, {"action":"query","prop":"revisions|info","rvprop":"content|timestamp","rvslots":"main","titles":title,"redirects":"1"})
    p = r["query"]["pages"][0]
    if p.get("missing"): print(f"### {lang} {title}: FEHLT"); continue
    txt = p["revisions"][0]["slots"]["main"]["content"]; ts = p["revisions"][0]["timestamp"]
    status = re.findall(r"\{\{\s*(outline|usable|guide|star)\w*", txt, re.I)
    heads = re.findall(r"^==\s*([^=]+?)\s*==\s*$", txt, re.M)
    subs = re.findall(r"^===\s*([^=]+?)\s*===\s*$", txt, re.M)
    def count(t): return len(re.findall(r"\{\{\s*"+t+r"\s*\|", txt, re.I))
    prices = re.findall(r"\|\s*price\s*=\s*([^|\n}]+)", txt)
    lastedit = re.findall(r"\|\s*lastedit\s*=\s*(\d{4})", txt)
    years = {}
    for y in lastedit: years[y]=years.get(y,0)+1
    print(f"### {lang} {p['title']}: {len(txt)} Zeichen, Status {status[:2]}, letzte Änderung {ts}")
    print("  Abschnitte:", heads)
    print("  Unterabschnitte:", subs[:40])
    print(f"  Einträge: sleep {count('sleep')}, eat {count('eat')}, drink {count('drink')}, see {count('see')}, mit Preis {len([x for x in prices if x.strip()])}")
    print("  lastedit-Jahre:", dict(sorted(years.items())))
    m = re.search(r"==\s*(Districts|Stadtteile|Orientation|Orientierung|Understand)\s*==(.*?)(?=\n==[^=])", txt, re.S)
    if m: print("  Auszug", m.group(1), ":", re.sub(r"\s+"," ", m.group(2))[:1500])
