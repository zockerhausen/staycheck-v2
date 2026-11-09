// VORÜBERGEHEND, nur Vorschau: wohin leiten Stay22-Allez-Links weiter? (Test der Hotel-Zuordnung)
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return new Response("nein", { status: 404 });
  const tests: [string, string, number, number][] = [
    ["Pegasus Hostel Berlin", "Berlin, Germany", 52.51594, 13.44004],
    ["Kiez Hostel Berlin", "Berlin, Germany", 52.50984, 13.44742],
    ["UBI KLiZ Mieterladen", "Berlin, Germany", 52.5135, 13.4605],
    ["Circus Hostel", "Berlin, Germany", 52.5296, 13.4018],
    ["Lub d Bangkok Siam", "Bangkok, Thailand", 13.7466, 100.5293],
  ];
  const variant = new URL(request.url).searchParams.get("v") ?? "a";
  const out: string[] = [];
  for (const [name, addr, lat, lng] of tests) {
    const p = new URLSearchParams({ aid: "staycheck", campaign: "test_zuordnung", hotelname: name, address: addr, checkin: "2026-12-01", checkout: "2026-12-03", adults: "1", currency: "EUR", lang: "de" });
    if (variant === "b") { p.set("lat", String(lat)); p.set("lng", String(lng)); }
    let url = `https://www.stay22.com/allez/${variant === "c" ? "agoda" : "roam"}?${p}`;
    const chain: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await fetch(url, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1", "accept-language": "de-DE" } }).catch((e) => ({ status: 0, headers: new Headers(), text: async () => String(e) }) as unknown as Response);
      const loc = r.headers.get("location");
      if (!loc) { const body = r.status === 200 ? (await r.text()).slice(0, 4000) : ""; const m = body.match(/https?:\/\/[^"'\s<>]*(booking|expedia|hotels|agoda|vrbo|trip)\.[^"'\s<>]*/i); chain.push(`${r.status} ${m ? "META→ " + m[0].slice(0, 300) : "(Ende)"}`); break; }
      chain.push(`${r.status} → ${loc.slice(0, 300)}`);
      url = new URL(loc, url).toString();
      if (!/stay22/.test(new URL(url).host)) break;
    }
    out.push(`## ${name}\n${chain.join("\n")}`);
  }
  return new Response(out.join("\n\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
