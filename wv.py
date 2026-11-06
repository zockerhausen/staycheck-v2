import json, re, sys, urllib.request, urllib.parse
UA = "StayCheck/1.0 (https://github.com/zockerhausen/staycheck-v2)"
T = {
 "en": ["Bangkok","Bangkok/Rattanakosin","Bangkok/Banglamphu","Bangkok/Chinatown","Bangkok/Silom","Bangkok/Siam","Bangkok/Sukhumvit","Bangkok/Phahonyothin","Bangkok/Riverside",
        "Berlin","Berlin/Mitte","Berlin/Friedrichshain","Berlin/Kreuzberg","Berlin/Neukölln","Berlin/Prenzlauer Berg","Berlin/Schöneberg","Berlin/City West","Berlin/Moabit","Berlin/Wedding","Berlin/Treptow-Köpenick"],
 "de": ["Bangkok","Bangkok/Rattanakosin","Bangkok/Banglamphu","Bangkok/Chinatown","Bangkok/Silom","Bangkok/Sukhumvit",
        "Berlin","Berlin/Mitte","Berlin/Friedrichshain","Berlin/Kreuzberg","Berlin/Neukölln","Berlin/Prenzlauer Berg","Berlin/Schöneberg","Berlin/Charlottenburg","Berlin/Moabit","Berlin/Wedding","Berlin/Treptow"],
}
HEAD = re.compile(r"^(stay safe|sicherheit|stay healthy|gesundheit|safety)$", re.I)
for lang, titles in T.items():
    for t in titles:
        q = urllib.parse.urlencode({"format":"json","formatversion":"2","action":"query","prop":"extracts","explaintext":"1","exsectionformat":"wiki","titles":t,"redirects":"1"})
        r = urllib.request.urlopen(urllib.request.Request(f"https://{lang}.wikivoyage.org/w/api.php?{q}", headers={"User-Agent":UA}), timeout=20)
        p = json.load(r)["query"]["pages"][0]
        if p.get("missing"): print(f"### {lang} {t}: FEHLT"); continue
        out=[]; keep=False
        for line in p.get("extract","").split("\n"):
            m = re.match(r"^(=+)\s*(.*?)\s*=+$", line)
            if m:
                if len(m.group(1))==2: keep = bool(re.match(r"^(stay safe|sicherheit)$", m.group(2), re.I))
                continue
            if keep and line.strip(): out.append(line.strip())
        print(f"### {lang} {p['title']}: {len(' '.join(out))} Zeichen")
        print(" ".join(out)[:2500])
