import Link from "next/link";
import Icon from "@/components/Icon";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
      <p className="font-display text-2xl font-extrabold text-sun">StayCheck</p>

      <section className="mt-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1 text-sm font-semibold text-peach-ink">
          <Icon name="check" size={16} fill="#fff" /> Berlin · Bangkok · Lage-Check weltweit
        </span>
        <h1 className="mt-4 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight">
          Schlaf da, wo
          <br />
          es <span className="text-sun">passt.</span>
        </h1>
        <p className="mt-4 text-lg text-muted">
          Finde den richtigen Kiez und die Unterkunft mit der besten Lage für deine Reise.
        </p>
      </section>

      <div className="mt-8 space-y-3">
        <Link href="/check" className="group flex items-center gap-4 rounded-3xl border-2 border-b-[6px] border-sun-dark bg-sun p-5 text-white transition active:translate-y-[3px] active:border-b-2">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Icon name="check" size={34} fill="#ffffff55" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold">Ich hab schon ein Hotel</span>
            <span className="block text-sm text-white/85">Lage checken: liegt es richtig für mich?</span>
          </span>
          <Icon name="forward" size={24} />
        </Link>

        <Link href="/reise" className="flex items-center gap-4 rounded-3xl border-2 border-b-[6px] border-line bg-paper p-5 transition active:translate-y-[3px] active:border-b-2">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-peach text-sun">
            <Icon name="discover" size={34} fill="#ffffff" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl font-extrabold">Ich suche noch</span>
            <span className="block text-sm text-muted">Erst den Kiez finden, dann das Hotel</span>
          </span>
          <Icon name="forward" size={24} className="text-muted" />
        </Link>
      </div>

      <div className="mt-auto pt-8">
        <Link href="/duell/hotels" className="flex items-center justify-center gap-2 text-sm font-bold text-muted">
          <Icon name="duel" size={20} /> Mehrere Hotels im Blick? Lage-Duell starten
        </Link>
      </div>
    </div>
  );
}
