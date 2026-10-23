import Link from "next/link";

const kieze = ["Kreuzberg", "Neukölln", "Friedrichshain", "Prenzlauer Berg", "Wedding", "Mitte"];

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <p className="font-display text-2xl font-extrabold text-sun">StayCheck</p>

      <section className="mt-10">
        <span className="inline-block rounded-full bg-peach px-3 py-1 text-sm font-semibold text-peach-ink">
          📍 Jetzt für Berlin
        </span>
        <h1 className="mt-4 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">
          Welcher Kiez
          <br />
          passt zu <span className="text-sun">dir?</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          7 schnelle Fragen. Danach weißt du, wo du in Berlin am besten wohnst.
        </p>
      </section>

      <div className="-mx-4 mt-8 overflow-hidden">
        <div className="flex gap-2 px-4">
          {kieze.map((k, i) => (
            <span
              key={k}
              className="shrink-0 rounded-full border-2 border-line bg-paper px-4 py-2 text-sm font-semibold"
              style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
            >
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-10">
        <Link href="/quiz" className="btn-chunky w-full text-lg">
          Los geht&apos;s
        </Link>
        <Link href="/duell" className="btn-chunky btn-chunky-light w-full">
          Zwei Kieze vergleichen
        </Link>
        <p className="text-center text-xs text-muted">Dauert unter einer Minute. Kein Konto nötig.</p>
      </div>
    </div>
  );
}
