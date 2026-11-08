"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { applyAnswer, BASE_WEIGHTS, cityQuestions, DETAILS, FOLLOW, QUIZ, type CityQuizInfo, type QuizAnswer, type QuizQuestion } from "@/lib/quiz";
import { EXTRAS, NOGOS, persona, type ExtraKey, type NoGo, type TravelWith, type Weights } from "@/lib/profile";
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

type Step = { kind: "q"; q: QuizQuestion } | { kind: "prio" } | { kind: "nogo" } | { kind: "extras" };
type Answers = Record<string, number[]>; // Frage → gewählte Antworten (leer = „Ist mir egal“)
type ExtraState = "off" | "on" | "must";

const asList = (x: ExtraKey | ExtraKey[] | undefined) => (x ? (Array.isArray(x) ? x : [x]) : []);

/** Ablauf aus den bisherigen Antworten: Grundfragen, direkt dahinter passende Folgefragen, Reise-Details, Stadt-Fragen, dann der Rest */
function buildSteps(answers: Answers, cityQs: QuizQuestion[]): Step[] {
  const steps: Step[] = [];
  for (const q of [...QUIZ, ...DETAILS, ...cityQs]) {
    steps.push({ kind: "q", q });
    for (const i of answers[q.key] ?? []) {
      const f = q.answers[i]?.follow;
      if (f && FOLLOW[f] && !steps.some((s) => s.kind === "q" && s.q.key === f)) steps.push({ kind: "q", q: FOLLOW[f] });
    }
  }
  steps.push({ kind: "prio" }, { kind: "nogo" }, { kind: "extras" });
  return steps;
}

/** Gewichte und Vormerkungen aus allen Antworten der Reihe nach (zwei Antworten auf eine Frage = Mitte) */
function derive(steps: Step[], answers: Answers, prio: string[]) {
  let w: Weights = { ...BASE_WEIGHTS };
  let wer: TravelWith | null = null;
  let preis: 1 | 2 | 3 | null = null;
  const suggested = new Set<ExtraKey>();
  let must: ExtraKey | null = null;
  for (const s of steps) {
    if (s.kind !== "q") continue;
    const picks = (answers[s.q.key] ?? []).map((i) => s.q.answers[i]).filter(Boolean) as QuizAnswer[];
    if (!picks.length) continue;
    if (picks.length === 1) w = applyAnswer(w, picks[0]);
    else {
      const x = applyAnswer(w, picks[0]);
      const y = applyAnswer(w, picks[1]);
      w = Object.fromEntries([...new Set([...Object.keys(x), ...Object.keys(y)])].map((k) => [k, Math.round(((x[k] ?? 0) + (y[k] ?? 0)) / 2)]));
    }
    for (const a of picks) {
      if (a.wer) wer = a.wer;
      // Zwei Budget-Antworten: die großzügigere zählt (sonst fallen passende Unterkünfte raus)
      if (a.preis) preis = Math.max(preis ?? 0, a.preis) as 1 | 2 | 3;
      for (const e of asList(a.suggest)) suggested.add(e);
      if (a.must) must = a.must;
    }
  }
  // Das Wichtigste: höchstens 2 Dinge zählen voll (5), alles andere höchstens normal (3)
  if (prio.length) w = { ...w, ...Object.fromEntries(PRIO_KEYS.map((k) => [k, prio.includes(k) ? 5 : Math.min(w[k] ?? 0, 3)])) };
  return { weights: w, wer, preis, suggested, must };
}

/**
 * Reise-Profil in gut einer Minute: Szenen statt Skalen, Folgefragen je nach Antwort, Reise-Details,
 * Fragen nur für diese Stadt, das Wichtigste, No-Gos, Extras in Laufweite – am Ende der Reise-Typ.
 */
export default function QuizClient({
  city,
  cityName,
  cityInfo = null,
  next: nextUrl,
}: {
  city: string;
  cityName: string;
  cityInfo?: CityQuizInfo | null;
  next?: string;
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [hint, setHint] = useState("");
  const [prio, setPrio] = useState<string[]>([]);
  const [nogo, setNogo] = useState<NoGo[]>([]);
  const [extraOverride, setExtraOverride] = useState<Partial<Record<ExtraKey, ExtraState>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const cityQs = useMemo(() => cityQuestions(cityName, cityInfo), [cityName, cityInfo]);
  const steps = useMemo(() => buildSteps(answers, cityQs), [answers, cityQs]);
  const { weights, wer, preis, suggested, must: derivedMust } = useMemo(() => derive(steps, answers, prio), [steps, answers, prio]);

  // Extras: Vormerkungen aus den Antworten, vom Nutzer jederzeit änderbar
  const extraState = (k: ExtraKey): ExtraState => extraOverride[k] ?? (derivedMust === k ? "must" : suggested.has(k) ? "on" : "off");
  const items = EXTRAS.map((e) => e.key).filter((k) => extraState(k) !== "off");
  const must = items.find((k) => extraState(k) === "must") ?? null;

  const total = steps.length;
  const isReveal = step >= total;
  const current = steps[Math.min(step, total - 1)];
  const q = current.kind === "q" ? current.q : null;

  function back() {
    clearTimeout(timer.current);
    setHint("");
    setPicked([]);
    if (step === 0) return router.back();
    // Antwort der vorigen (und der gerade angetippten) Frage zurücksetzen
    const prev = steps[Math.min(step - 1, total - 1)];
    setAnswers((a) => {
      const n = { ...a };
      if (prev?.kind === "q") delete n[prev.q.key];
      if (q && picked.length) delete n[q.key];
      return n;
    });
    setStep(Math.min(step - 1, total - 1));
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
    if (!q) return;
    if (index === null) {
      if (picked.length) return;
      buzz();
      setAnswers((a) => ({ ...a, [q.key]: [] })); // „Ist mir egal“: Startwert bleibt
      setStep(step + 1);
      return;
    }
    if (picked.includes(index) || picked.length >= 2) return;
    buzz();
    const next = [...picked, index];
    setPicked(next);
    setAnswers((a) => ({ ...a, [q.key]: next }));
    if (next.length === 1) {
      setHint(q.answers[index].hint);
      advance(1500); // etwas Zeit für eine zweite Antwort
    } else {
      setHint("Mal so, mal so. Wir nehmen die Mitte.");
      advance(1100);
    }
  }

  function togglePrio(k: string) {
    buzz(6);
    setPrio((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length >= 2 ? [p[1], k] : [...p, k]));
  }

  function toggleNogo(k: NoGo) {
    buzz(6);
    setNogo((n) => (n.includes(k) ? n.filter((x) => x !== k) : [...n, k]));
  }

  // Extras: antippen = wichtig, nochmal antippen = Muss (nur eins), drittes Mal = weg
  function toggleExtra(k: ExtraKey) {
    buzz(6);
    const s = extraState(k);
    setExtraOverride((o) => {
      const n: Partial<Record<ExtraKey, ExtraState>> = { ...o, [k]: s === "off" ? "on" : s === "on" ? "must" : "off" };
      // Nur ein Muss: ein anderes Muss wird zu „wichtig“
      if (s === "on") for (const e of EXTRAS) if (e.key !== k && extraState(e.key) === "must") n[e.key] = "on";
      return n;
    });
  }

  function nextStep() {
    buzz();
    setStep(step + 1);
  }

  function finish() {
    buzz([12, 40, 18]);
    setStep(total);
    startSaving(async () => {
      await storeProfile(weights, city || undefined, { wer, items, must, preis, nogo });
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
          {nogo.map((k) => (
            <span key={k} className="flex items-center gap-1.5 rounded-full bg-bad/10 px-3 py-1.5 text-[13px] font-semibold text-bad">
              <Icon name="close" size={14} /> {NOGOS.find((n) => n.key === k)!.label}
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

  const label =
    step === 0
      ? `Dein Reise-Profil · ${cityName} · gut 1 Min.`
      : current.kind === "prio"
        ? "Das Wichtigste"
        : current.kind === "nogo"
          ? "Was gar nicht geht"
          : current.kind === "extras"
            ? "Fast geschafft"
            : q && FOLLOW[q.key]
              ? "Kurze Nachfrage"
              : q && cityQs.some((c) => c.key === q.key)
                ? `Nur für ${cityName}`
                : `Frage ${step + 1} von ${total}`;

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

      <p className="mt-7 text-[13px] font-extrabold text-muted">{label}</p>

      {current.kind === "prio" ? (
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
            <button type="button" onClick={nextStep} className="btn-chunky w-full">
              {prio.length ? "Weiter" : "Überspringen"}
            </button>
          </div>
        </>
      ) : current.kind === "nogo" ? (
        <>
          <h1 className="pop-in mega mt-2 text-[1.9rem] leading-tight">Was geht für dich gar nicht?</h1>
          <p className="mt-2 text-sm text-muted">Solche Ecken landen bei dir ganz unten, egal wie gut der Rest ist.</p>
          <div className="mt-6 space-y-2.5">
            {NOGOS.map((n) => {
              const on = nogo.includes(n.key);
              return (
                <button key={n.key} type="button" onClick={() => toggleNogo(n.key)} aria-pressed={on} className="tile py-3.5" data-selected={on}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${on ? "bg-bad/15 text-bad" : "bg-peach text-sun-soft"}`}>
                    <Icon name={on ? "close" : n.icon} size={22} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[16px] font-bold leading-snug">{n.label}</span>
                    <span className="block text-[13px] font-medium text-muted">{n.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="card mt-6 p-4 text-sm leading-relaxed text-muted">
            {nogo.length
              ? "Trifft ein No-Go zu, ist der Match für dich höchstens 45. Wo uns Daten fehlen, schließen wir nichts aus."
              : "Nichts davon schlimm? Dann einfach weiter."}
          </div>
          <div className="mt-auto pt-8">
            <button type="button" onClick={nextStep} className="btn-chunky w-full">
              {nogo.length ? "Weiter" : "Überspringen"}
            </button>
          </div>
        </>
      ) : current.kind === "extras" ? (
        <>
          <h1 className="pop-in mega mt-2 text-[1.9rem] leading-tight">Was muss in Laufweite sein?</h1>
          <p className="mt-2 text-sm text-muted">
            {suggested.size ? "Ein paar haben wir aus deinen Antworten vorgemerkt. " : ""}Tippe an, was dir wichtig ist. Tippe ein zweites Mal für ein
            echtes Muss.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {EXTRAS.map((e) => {
              const state = extraState(e.key);
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
        q && (
          <>
            <h1 key={q.key} className="pop-in mega mt-2 text-[1.9rem] leading-tight">
              {q.question}
            </h1>
            {q.sub && <p className="mt-2 text-sm text-muted">{q.sub}</p>}

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

            <button
              type="button"
              onClick={() => choose(null)}
              disabled={picked.length > 0}
              className="mt-auto pt-6 text-center text-sm font-semibold text-muted disabled:opacity-40"
            >
              {step === 0 ? "Überspringen" : "Ist mir egal"}
            </button>
          </>
        )
      )}
    </div>
  );
}
