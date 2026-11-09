import Link from "next/link";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";
import CitySwitcher from "@/components/CitySwitcher";
import ThemeToggle from "@/components/ThemeToggle";

export type PosterBest = { name: string; meta: string; score: number; href: string };

/**
 * Violettes Plakat oben auf der Startseite: Marke, Stadt wechseln und die beste Ecke für dich mit ihrer Lage-Zahl.
 * Ohne Reise-Profil zeigt es die beste Lage allgemein (ehrlich beschriftet).
 */
export default function HomePoster({
  city,
  hint,
  verified,
  loggedIn,
  best,
  personal,
}: {
  city: string;
  hint?: string;
  verified: { slug: string; name: string; country: string }[];
  loggedIn: boolean;
  best: PosterBest | null;
  personal: boolean;
}) {
  const words = best ? best.name.split(" (")[0].split(" ") : [];
  // Lange Namen (z. B. „Scheunenviertel“) bekommen die volle Breite, die Zahl rutscht darunter
  const long = Math.max(0, ...words.map((w) => w.length)) > 9;
  return (
    <section className="relative -mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))] overflow-hidden rounded-b-[34px] bg-[#5340f2] px-5 pb-6 pt-[calc(max(1.25rem,env(safe-area-inset-top))+0.5rem)] text-white">
      {/* feiner Ring als Schmuck */}
      <span aria-hidden className="pointer-events-none absolute -right-24 top-[70px] h-[250px] w-[250px] rounded-full shadow-[inset_0_0_0_1.5px_rgba(140,127,246,.75)]" />
      <div className="relative flex items-center justify-between">
        <Logo size={18} onViolet />
        <span className="flex gap-2">
          <ThemeToggle onViolet className="h-11 w-11" />
          <Link
            href={loggedIn ? "/konto" : "/login"}
            aria-label={loggedIn ? "Konto" : "Anmelden"}
            className="press flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15"
          >
            <Icon name="user" size={21} fill="transparent" />
          </Link>
        </span>
      </div>
      <div className="relative">
        <CitySwitcher variant="poster" current={city} hint={hint} verified={verified} />
      </div>

      {best ? (
        <div className="relative">
          <p className="mt-[22px] text-[15px] font-semibold opacity-85">{personal ? `Für dich in ${city}` : `Beste Lage in ${city}`}</p>
          <div className={`mt-1.5 flex items-end justify-between gap-3 ${long ? "flex-wrap" : ""}`}>
            <div className={long ? "w-full" : "min-w-0"}>
              <p
                lang="de"
                className={`font-extrabold leading-[0.98] tracking-[-0.045em] [hyphens:auto] ${long ? "text-[clamp(2.1rem,10vw,2.6rem)]" : "text-[clamp(2.4rem,11.5vw,3rem)]"}`}
              >
                {words.map((w, i) => (
                  <span key={i}>
                    {w}
                    {i < words.length - 1 ? <br /> : <span className="text-pink">.</span>}
                  </span>
                ))}
              </p>
              {best.meta && !long && <p className="mt-2 max-w-[95%] text-[15.5px] font-medium leading-snug opacity-90">{best.meta}</p>}
            </div>
            {long && best.meta && <p className="min-w-0 flex-1 pb-2 text-[15.5px] font-medium leading-snug opacity-90">{best.meta}</p>}
            <div className="shrink-0 text-right">
              <b className="block text-[4.6rem] font-extrabold leading-[0.9] tracking-[-0.05em] tabular-nums">{best.score}</b>
              <span className="text-[13.5px] font-semibold opacity-85">{personal ? "Lage für dich" : "Lage"}</span>
            </div>
          </div>
          <div className="mt-[18px] grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
            <Link href={best.href} className="press flex min-h-[3.5rem] items-center justify-center rounded-full bg-white px-2 text-center text-[clamp(13px,4vw,15.5px)] leading-tight font-extrabold text-[#5340f2]">
              Unterkünfte ansehen
            </Link>
            <a href="#ecken" className="press flex min-h-[3.5rem] items-center justify-center rounded-full px-2 text-center text-[clamp(13px,4vw,15.5px)] leading-tight font-extrabold text-white shadow-[inset_0_0_0_2px_#fff]">
              Alle Ecken
            </a>
          </div>
        </div>
      ) : (
        <p className="relative mt-[22px] text-[clamp(2.2rem,10vw,2.7rem)] font-extrabold leading-[1] tracking-[-0.045em]">
          Wo schläfst du
          <br />
          in {city}
          <span className="text-pink">?</span>
        </p>
      )}
    </section>
  );
}
