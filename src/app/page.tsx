import Link from "next/link";

const steps = [
  { n: "1", title: "Sag uns, was dir wichtig ist", text: "Budget, Nachtleben, Ruhe, Sicherheit und mehr, jeweils von egal bis sehr wichtig." },
  { n: "2", title: "Bekomm deine Kiez-Rangliste", text: "Wir berechnen für jeden Bezirk, wie gut er zu dir passt, in Prozent." },
  { n: "3", title: "Vergleiche und merke dir Favoriten", text: "Stell zwei Kieze nebeneinander und speichere die besten in deinem Konto." },
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="pt-8 sm:pt-14">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-coral">Jetzt für Berlin</p>
        <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
          Nicht nur die richtige Stadt.
          <br />
          <span className="text-pine">Der richtige Kiez.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          StayCheck zeigt dir in einer Minute, in welchem Bezirk du als Backpacker oder Reisende:r am besten wohnst.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/finden" className="rounded-full bg-pine px-6 py-3 font-medium text-white hover:bg-pine-dark">
            Meinen Kiez finden
          </Link>
          <Link href="/vergleich" className="rounded-full border border-line bg-paper px-6 py-3 font-medium hover:border-pine">
            Kieze vergleichen
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-line bg-paper p-5">
            <div className="font-display text-3xl text-coral">{s.n}</div>
            <h2 className="mt-2 font-semibold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
