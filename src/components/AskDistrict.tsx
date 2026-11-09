"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/Icon";

type Target =
  | { art: "kiez"; slug: string; stadt?: string }
  | { art: "auto"; ort: string; land: string; lat: number; lon: number; name: string; vlat: number; vlon: number }
  | { art: "stadt"; ort: string; land: string; lat: number; lon: number; rad: number };
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

/**
 * „Frag das Viertel“, bewusst zurückhaltend: auf der Seite nur eine schlanke Frage-Zeile.
 * Antippen öffnet den Chat von unten (Vorschläge, Antwort Wort für Wort, Quellen). Das Gespräch bleibt beim Schließen erhalten.
 */
export default function AskDistrict({ target, place, enabled }: { target: Target; place: string; enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fenster: Einblenden, Seite festhalten, Esc schließt
  useEffect(() => {
    if (!open) return;
    const r = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(r);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  function close() {
    setShown(false);
    setTimeout(() => setOpen(false), 280);
  }

  const city = target.art === "stadt";
  const suggestions = city
    ? [
        "Wo sollte ich beim ersten Besuch schlafen?",
        "Welche Ecke ist zentral, aber nachts ruhig?",
        "Wo wohnen Backpacker am liebsten?",
        "Wo ist es günstig und trotzdem gut gelegen?",
        "Wie komme ich vom Flughafen in die Stadt?",
      ]
    : ["Wie sieht ein perfekter Tag hier aus?", "Ist es hier nachts laut?", "Wie komme ich vom Flughafen hierher?", "Was sollte ich hier unbedingt essen?", "Ist die Gegend abends sicher?"];

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

  if (!enabled) return null; // ohne KI gar nichts zeigen (statt „bald verfügbar“)

  const title = city ? `Frag StayCheck zu ${place}` : `Frag zu ${place}`;
  return (
    <>
      {/* Auf der Seite: nur eine schlanke Zeile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex w-full items-center gap-2.5 rounded-full border border-line bg-paper py-1.5 pl-4 pr-1.5 text-left"
        aria-haspopup="dialog"
      >
        <Spark className="shrink-0 text-sun-soft" size={19} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-muted">
          {msgs.length ? `Weiter fragen zu ${place} …` : city ? `Frag etwas zu ${place} …` : `Frag etwas zu ${place} …`}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tan text-sun-soft">
          <Icon name="forward" size={16} />
        </span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
            <button
              type="button"
              aria-label="Schließen"
              onClick={close}
              className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
            />
            <div
              className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-md flex-col rounded-t-[28px] border-t border-line bg-sand shadow-[0_-20px_60px_rgba(0,0,0,.3)] transition-transform duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)] ${
                shown ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="shrink-0 px-4 pt-3">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-peach" />
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-sun text-white">
                    <Spark size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[17px] font-extrabold leading-tight tracking-[-0.025em]">{title}</h2>
                    <p className="truncate text-[13px] font-semibold text-muted">Mit Live-Suche im Internet</p>
                  </div>
                  <button type="button" onClick={close} aria-label="Schließen" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tan">
                    <Icon name="close" size={16} />
                  </button>
                </div>
              </div>
              {/* Verlauf und Vorschläge: scrollt für sich */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-4">
                {msgs.length === 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 4).map((s) => (
                      <button key={s} type="button" onClick={() => ask(s)} className="press min-h-[38px] rounded-full bg-peach px-3.5 py-2 text-left text-[14px] font-bold text-sun-soft">
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3" aria-live="polite">
                    {msgs.map((m, i) =>
                      m.rolle === "du" ? (
                        <p key={i} className="fade-up ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-sun px-3.5 py-2.5 text-[15px] font-bold text-white">
                          {m.text}
                        </p>
                      ) : (
                        <div
                          key={i}
                          className={`fade-up max-w-[95%] rounded-2xl rounded-bl-md px-3.5 py-3 text-[15px] leading-relaxed ${m.fehler ? "bg-peach text-peach-ink" : "bg-paper text-ink shadow-soft"}`}
                        >
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
                              {m.quellen.map((src) => (
                                <a
                                  key={src.url}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer nofollow"
                                  className="max-w-full truncate rounded-full bg-peach px-2.5 py-1 text-[11px] font-semibold text-muted"
                                >
                                  {new URL(src.url).hostname.replace(/^www\./, "")}
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
              </div>

              {/* Eingabe: immer unten, über der Tastatur */}
              <div className="shrink-0 border-t border-line px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask(q);
                  }}
                  className="flex items-center gap-2 rounded-full border border-line bg-paper py-1.5 pl-4 pr-1.5 focus-within:border-sun"
                >
                  <label htmlFor="frag-input" className="sr-only">
                    Deine Frage
                  </label>
                  <input
                    ref={inputRef}
                    id="frag-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    maxLength={300}
                    placeholder={msgs.length ? "Noch eine Frage …" : city ? "Frag etwas zur Stadt …" : "Frag etwas zu diesem Viertel …"}
                    autoComplete="off"
                    enterKeyHint="send"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    disabled={busy || q.trim().length < 2}
                    aria-label="Senden"
                    className="press flex h-[2.6rem] w-[2.6rem] shrink-0 items-center justify-center rounded-full bg-sun text-white disabled:opacity-40"
                  >
                    <Icon name="chevron" size={18} />
                  </button>
                </form>
                <p className="mt-2 px-1 text-[11.5px] font-semibold text-muted">KI kann sich irren. Wichtiges (Preise, Öffnungszeiten) bitte vor Ort prüfen.</p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Funkel-Zeichen für die KI (klein und ruhig) */
function Spark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z" />
      <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </svg>
  );
}
