"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";

type Target =
  | { art: "kiez"; slug: string; stadt?: string }
  | { art: "auto"; ort: string; land: string; lat: number; lon: number; name: string; vlat: number; vlon: number };
type Msg = { rolle: "du" | "ki"; text: string; quellen?: { url: string; title: string }[]; fehler?: boolean };

/** **fett** und Listen „- “ – mehr Formatierung gibt es nicht (und kein HTML von außen). */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((l, i) => {
        const bullet = /^\s*[-•]\s+/.test(l);
        const parts = l.replace(/^\s*[-•]\s+/, "").split(/(\*\*[^*]+\*\*)/g);
        const body = parts.map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <b key={j} className="text-ink">{p.slice(2, -2)}</b> : <span key={j}>{p}</span>));
        if (!l.trim()) return <span key={i} className="block h-2" />;
        return bullet ? (
          <span key={i} className="flex gap-2">
            <span className="text-sun-soft">•</span>
            <span>{body}</span>
          </span>
        ) : (
          <span key={i} className="block">
            {body}
          </span>
        );
      })}
    </>
  );
}

/** „Frag das Viertel“: kurze Fragen, Antwort erscheint Wort für Wort, Quellen darunter. */
export default function AskDistrict({ target, place, enabled }: { target: Target; place: string; enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const suggestions = ["Ist es hier nachts laut?", "Wie komme ich vom Flughafen hierher?", "Was sollte ich hier unbedingt essen?", "Ist die Gegend abends sicher?"];

  async function ask(frage: string) {
    const text = frage.trim().slice(0, 300);
    if (!text || busy || !enabled) return;
    if ("vibrate" in navigator) navigator.vibrate(8);
    const verlauf = msgs.filter((m) => !m.fehler).slice(-6).map((m) => ({ rolle: m.rolle, text: m.text }));
    setMsgs((m) => [...m, { rolle: "du", text }, { rolle: "ki", text: "" }]);
    setQ("");
    setBusy(true);
    const update = (fn: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);
    try {
      const res = await fetch("/api/frag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ziel: target, frage: text, verlauf }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        update((m) => ({ ...m, text: (j as { error?: string }).error ?? "Das hat nicht geklappt. Versuch es gleich nochmal.", fehler: true }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { t: string; v?: string; url?: string; title?: string };
          if (ev.t === "text" && ev.v) {
            setSearching(false);
            update((m) => ({ ...m, text: m.text + ev.v }));
          } else if (ev.t === "search") setSearching(true);
          else if (ev.t === "src" && ev.url) update((m) => ({ ...m, quellen: [...(m.quellen ?? []), { url: ev.url!, title: ev.title ?? ev.url! }] }));
          else if (ev.t === "error") update((m) => ({ ...m, text: m.text || (ev.v ?? "Fehler"), fehler: !m.text }));
        }
        endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } catch {
      update((m) => ({ ...m, text: m.text || "Keine Verbindung. Versuch es gleich nochmal.", fehler: !m.text }));
    } finally {
      setBusy(false);
      setSearching(false);
    }
  }

  return (
    <section className="card overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
          <Icon name="discover" size={22} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[18px] font-extrabold leading-tight">Frag das Viertel</h2>
          <p className="truncate text-[13px] text-muted">Alles zu {place}, mit unseren Daten und Websuche</p>
        </div>
      </div>

      {!enabled ? (
        <p className="mt-4 rounded-2xl bg-tan px-3.5 py-3 text-sm text-muted">Bald verfügbar: Hier kannst du dann Fragen zum Viertel stellen.</p>
      ) : (
        <>
          {msgs.length > 0 && (
            <div className="mt-4 space-y-3" aria-live="polite">
              {msgs.map((m, i) =>
                m.rolle === "du" ? (
                  <p key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sun px-3.5 py-2.5 text-[15px] font-medium text-white">
                    {m.text}
                  </p>
                ) : (
                  <div key={i} className={`max-w-[95%] rounded-2xl rounded-bl-md px-3.5 py-3 text-[15px] leading-relaxed ${m.fehler ? "bg-peach text-peach-ink" : "bg-tan text-[#dcdce0]"}`}>
                    {m.text ? (
                      <Rich text={m.text} />
                    ) : (
                      <span className="flex items-center gap-2 text-muted">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-raised border-t-sun" />
                        {searching && i === msgs.length - 1 ? "Suche im Internet …" : "Denkt nach …"}
                      </span>
                    )}
                    {m.quellen && m.quellen.length > 0 && (
                      <span className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.quellen.map((s) => (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="max-w-full truncate rounded-full bg-raised px-2.5 py-1 text-[11px] font-semibold text-muted"
                          >
                            {new URL(s.url).hostname.replace(/^www\./, "")}
                          </a>
                        ))}
                      </span>
                    )}
                  </div>
                ),
              )}
              <div ref={endRef} />
            </div>
          )}

          {msgs.length === 0 && (
            <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="press shrink-0 rounded-full bg-tan px-3.5 py-2.5 text-[13px] font-semibold">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(q);
            }}
            className="mt-3 flex items-center gap-2 rounded-[18px] border border-line bg-paper py-1.5 pl-4 pr-1.5 focus-within:border-sun"
          >
            <label htmlFor="frag-input" className="sr-only">
              Deine Frage
            </label>
            <input
              id="frag-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              maxLength={300}
              placeholder={msgs.length ? "Noch eine Frage …" : "Frag etwas zu diesem Viertel …"}
              autoComplete="off"
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={busy || q.trim().length < 2}
              aria-label="Senden"
              className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun text-white disabled:opacity-40"
            >
              <Icon name="chevron" size={18} />
            </button>
          </form>
          <p className="mt-2 px-1 text-[11px] text-faint">KI kann sich irren. Wichtiges (Preise, Öffnungszeiten) bitte vor Ort prüfen.</p>
        </>
      )}
    </section>
  );
}
