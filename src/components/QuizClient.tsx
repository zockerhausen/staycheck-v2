"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BASE_WEIGHTS, QUIZ } from "@/lib/quiz";
import { EXTRAS, persona, type ExtraKey, type TravelWith, type Weights } from "@/lib/profile";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";
import { storeProfile } from "@/app/actions";

function buzz(ms: number | number[] = 10) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
}

const PRIO_KEYS = ["transit", "nightlife", "quiet", "safety", "food", "budget", "nature"];

const LABEL: Record<string, string> = {
  budget: "Günstig",
  nightlife: "Nachtleben",
  quiet: "Ruhe",
  safety: "Sicherheit",
  transit: "Anbindung",
  food: "Essen",
  nature: "Grün",
};

/**
 * Reise-Profil in ca. 40 Sekunden: Szenen statt Skalen, sofortige Rückmeldung,
 * Extras in Laufweite mit einem echten Muss, am Ende der Reise-Typ als Belohnung.
 */
export default function QuizClient({ city, cityName, next: nextUrl }: { city: string; cityName: string; next?: string }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const [weights, setWeights] = useState<Weights>(BASE_WEIGHTS);
  const [history, setHistory] = useState<Weights[]>([]);
  const [wer, setWer] = useState<TravelWith | null>(null);
  const [items, setItems] = useState<ExtraKey[]>([]);
  const [must, setMust] = useState<ExtraKey | null>(null);
  const [preis, setPreis] = useState<1 | 2 | 3 | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [hint, setHint] = useState("");
  const [prio, setPrio] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const total = QUIZ.length + 2; // + Prioritäten + Extras
  const isPrio = step === QUIZ.length;
  const isExtras = step === QUIZ.length + 1;
  const isReveal = step > QUIZ.length + 1;
  const q = QUIZ[step];

  function back() {
    clearTimeout(timer.current);
    setHint("");
    setPicked([]);
    if (step === 0) return router.back();
    if (step <= QUIZ.length + 1) setWeights(history[step - 1] ?? BASE_WEIGHTS);
    setHistory((h) => h.slice(0, Math.max(0, step - 1)));
    setStep(Math.min(step - 1, QUIZ.length + 1));
  }

  function advance(ms: number) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPicked([]);
      setHint("");
      setStep((s) => s + 1);
    }, ms);
  }

  /**
   * Eine Antwort antippen = übernehmen, nach kurzer Pause geht es weiter.
   * Wird in dieser Pause eine zweite Antwort angetippt, zählen beide: wir nehmen die Mitte.
   */
  function choose(index: number | null) {
    if (index === null) {
      if (picked.length) return;
      buzz();
      setHistory((h) => [...h.slice(0, step), weights]);
      setStep(step + 1); // „Ist mir egal“: Startwert bleibt
      return;
    }
    if (picked.includes(index) || picked.length >= 2) return;
    buzz();
    const a = q.answers[index];

    if (picked.length === 0) {
      setHistory((h) => [...h.slice(0, step), weights]);
      setPicked([index]);
      setHint(a.hint);
      setWeights((w) => ({ ...w, ...a.set }));
      if (a.wer) setWer(a.wer);
      if (a.preis) setPreis(a.preis);
      if (a.suggest && !items.includes(a.suggest)) setItems((x) => [...x, a.suggest!]);
      advance(1500); // etwas Zeit für eine zweite Antwort
      return;
    }

    // Zweite Antwort: Mittelwert aus beiden (Werte, die nur eine Antwort setzt, mitteln wir mit dem Stand davor)
    const first = q.answers[picked[0]];
    const before = history[step] ?? weights;
    const keys = new Set([...Object.keys(first.set), ...Object.keys(a.set)]);
    const mixed: Weights = {};
    for (const k of keys) {
      const x = first.set[k] ?? before[k] ?? 0;
      const y = a.set[k] ?? before[k] ?? 0;
      mixed[k] = Math.round((x + y) / 2);
    }
    // Zwei Budget-Antworten: die großzügigere zählt (sonst fallen passende Unterkünfte raus)
    if (a.preis && first.preis) setPreis(Math.max(a.preis, first.preis) as 1 | 2 | 3);
    setPicked([picked[0], index]);
    setHint("Mal so, mal so. Wir nehmen die Mitte.");
    setWeights({ ...before, ...mixed });
    if (a.suggest && !items.includes(a.suggest)) setItems((x) => [...x, a.suggest!]);
    advance(1100);
  }

  // Prioritäten: höchstens 2 Dinge sind „das Wichtigste“. Die zählen voll (5), alles andere höchstens normal (3).
  // So wird das Profil klar, statt dass alles ein bisschen wichtig ist.
  function togglePrio(k: string) {
    buzz(6);
    setPrio((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= 2 ? [p[1], k] : [...p, k]));
  }
  function confirmPrio() {
    buzz();
    setHistory((h) => [...h.slice(0, step), weights]);
    if (prio.length) {
      setWeights((w) => Object.fromEntries(PRIO_KEYS.map((k) => [k, prio.includes(k) ? 5 : Math.min(w[k] ?? 0, 3)])));
    }
    setStep(step + 1);
  }

  // Extras: antippen = wichtig, nochmal antippen = Muss (nur eins), drittes Mal = weg
  function toggleExtra(k: ExtraKey) {
    buzz(6);
    if (must === k) {
      setMust(null);
      setItems((x) => x.filter((i) => i !== k));
    } else if (items.includes(k)) {
      setMust(k);
    } else {
      setItems((x) => [...x, k]);
    }
  }

  function finish() {
    buzz([12, 40, 18]);
    setStep(QUIZ.length + 2);
    startSaving(async () => {
      await storeProfile(weights, city || undefined, { wer, items, must, preis });
    });
  }

  const p = persona(weights, { wer, items, must });
  const topWeights = Object.entries(weights)
    .filter(([, v]) => v >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // ---------- Ergebnis: Reise-Typ ----------
  if (isReveal) {
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col text-center">
        <p className="mt-10 text-[13px] font-extrabold text-sun-soft">Dein Reise-Typ</p>
        <span className="pop-in mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-peach to-tan text-sun-soft">
          <Icon name={p.icon} size={48} />
        </span>
        <h1 className="pop-in mega mt-5 text-[2.2rem]">{p.name}</h1>
        <p className="mx-auto mt-3 max-w-xs leading-relaxed text-muted">{p.text}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {topWeights.map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-[13px] font-bold text-peach-ink">
              <Icon name={CRITERION_ICON[k]} size={14} /> {LABEL[k]} {"●".repeat(v)}
            </span>
          ))}
          {items.map((k) => (
            <span key={k} className="flex items-center gap-1.5 rounded-full bg-tan px-3 py-1.5 text-[13px] font-semibold">
              <Icon name={EXTRAS.find((e) => e.key === k)!.icon} size={14} /> {EXTRAS.find((e) => e.key === k)!.label}
              {must === k && <b className="text-sun-soft">· Muss</b>}
            </span>
          ))}
        </div>
        <div className="mt-auto space-y-3 pt-10">
          <button
            type="button"
            disabled={saving}
            onClick={() => router.push(nextUrl ?? `/ergebnis?stadt=${city}&neu=1`)}
            className="btn-chunky w-full"
          >
            {saving ? "Speichere …" : `Meine Viertel in ${cityName}`}
          </button>
          <Link href="/profil" className="block py-2 text-sm font-semibold text-muted">
            Feinjustieren
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tan" aria-label="Zurück">
          <Icon name={step === 0 ? "close" : "back"} size={18} />
        </button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-[5px] flex-1 rounded-full transition-colors duration-300 ${i < step ? "bg-sun" : i === step ? "bg-sun/50" : "bg-peach"}`} />
          ))}
        </div>
      </div>

      <p className="mt-7 text-[13px] font-extrabold text-muted">
        {step === 0 ? `Dein Reise-Profil · ${cityName} · 1 Min.` : isExtras ? "Fast geschafft" : isPrio ? "Das Wichtigste" : `Frage ${step + 1} von ${total}`}
      </p>

      {isPrio ? (
        <>
          <h1 className="pop-in mega mt-2 text-[1.9rem] leading-tight">Was ist dir am wichtigsten?</h1>
          <p className="mt-2 text-sm text-muted">Wähl höchstens 2. Die zählen dann am meisten, alles andere nur normal.</p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {PRIO_KEYS.map((k) => {
              const on = prio.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => togglePrio(k)}
                  aria-pressed={on}
                  className={`press flex items-center gap-2 rounded-[18px] border-[1.5px] px-3.5 py-3.5 text-left text-[15px] font-bold transition-colors ${on ? "border-sun bg-sun text-white" : "border-tan bg-tan"}`}
                >
                  <Icon name={CRITERION_ICON[k]} size={20} />
                  {LABEL[k]}
                  {on && <span className="ml-auto text-[12px] font-extrabold">{prio.indexOf(k) + 1}</span>}
                </button>
              );
            })}
          </div>
          <div className="card mt-6 p-4 text-sm leading-relaxed text-muted">
            {prio.length ? (
              <>
                <b className="text-ink">{prio.map((k) => LABEL[k]).join(" und ")}</b> {prio.length > 1 ? "zählen" : "zählt"} bei dir jetzt am meisten. So
                unterscheiden sich die Viertel für dich deutlicher.
              </>
            ) : (
              "Alles gleich wichtig? Dann einfach weiter. Mit 1 oder 2 Favoriten werden deine Ergebnisse aber klarer."
            )}
          </div>
          <div className="mt-auto pt-8">
            <button type="button" onClick={confirmPrio} className="btn-chunky w-full">
              {prio.length ? "Weiter" : "Überspringen"}
            </button>
          </div>
        </>
      ) : isExtras ? (
        <>
          <h1 className="pop-in mega mt-2 text-[1.9rem] leading-tight">Was muss in Laufweite sein?</h1>
          <p className="mt-2 text-sm text-muted">Tippe an, was dir wichtig ist. Tippe ein zweites Mal für ein echtes Muss.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {EXTRAS.map((e) => {
              const state = must === e.key ? "must" : items.includes(e.key) ? "on" : "off";
              return (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => toggleExtra(e.key)}
                  aria-pressed={state !== "off"}
                  className={`press flex items-center gap-1.5 rounded-full border-[1.5px] px-4 py-3 text-[15px] font-semibold transition-colors ${
                    state === "must"
                      ? "border-sun bg-sun text-white"
                      : state === "on"
                        ? "border-sun bg-peach text-sun-soft"
                        : "border-tan bg-tan"
                  }`}
                >
                  <Icon name={state === "must" ? "flag" : e.icon} size={17} /> {state === "must" ? `Muss: ${e.label}` : e.label}
                </button>
              );
            })}
          </div>
          <div className="card mt-6 p-4 text-sm leading-relaxed text-muted">
            {must ? (
              <>
                <b className="text-ink">Muss: {EXTRAS.find((e) => e.key === must)?.label}.</b> Fehlt es in Laufweite, sagen wir es dir deutlich und
                der Match für dich bleibt höchstens bei 60.
              </>
            ) : items.length ? (
              "Gewählte Dinge zählen in deinem Match mit. Wir messen, wie weit das Nächste zu Fuß ist."
            ) : (
              "Nichts davon wichtig? Dann einfach weiter."
            )}
          </div>
          <div className="mt-auto pt-8">
            <button type="button" onClick={finish} className="btn-chunky w-full">
              {items.length ? "Weiter" : "Überspringen"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 key={q.key} className="pop-in mega mt-2 text-[1.9rem] leading-tight">
            {q.question}
          </h1>

          <div key={`a-${q.key}`} className={`mt-6 ${q.layout === "grid" ? "grid grid-cols-2 gap-2.5" : "space-y-2.5"}`}>
            {q.answers.map((a, i) => (
              <button
                key={a.text}
                type="button"
                className={`tile pop-in ${q.layout === "grid" ? "flex-col items-start py-4" : "py-3.5"}`}
                style={{ animationDelay: `${i * 50}ms` }}
                data-selected={picked.includes(i)}
                onClick={() => choose(i)}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
                  <Icon name={a.icon} size={22} />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-[16px] font-bold leading-snug">{a.text}</span>
                  <span className="block text-[13px] font-medium text-muted">{a.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-[52px]">
            {!hint && step < 2 && <p className="px-1 text-[13px] text-muted">Passt beides? Tippe kurz danach eine zweite Antwort an.</p>}
            {hint && (
              <p className="fade-up flex items-center gap-2 rounded-2xl bg-tan px-3.5 py-3 text-sm" role="status">
                <Icon name="check" size={16} className="shrink-0 text-good" /> {hint}
              </p>
            )}
          </div>

          <button type="button" onClick={() => choose(null)} disabled={picked.length > 0} className="mt-auto pt-6 text-center text-sm font-semibold text-muted disabled:opacity-40">
            {step === 0 ? "Überspringen" : "Ist mir egal"}
          </button>
        </>
      )}
    </div>
  );
}
