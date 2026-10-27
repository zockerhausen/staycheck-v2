import Link from "next/link";
import Icon from "@/components/Icon";
import { persona, type Extras } from "@/lib/profile";
import type { Weights } from "@/lib/data";

/**
 * Dezente Zeile unter der Suche: zeigt den Reise-Typ und führt zum Bearbeiten.
 * Daneben „Quiz neu“. Ohne Profil steht dort stattdessen die Einladung zum Quiz.
 */
export default function ProfileBar({ weights, extras, quizHref }: { weights: Weights | null; extras: Extras; quizHref: string }) {
  if (!weights) {
    return (
      <Link href={quizHref} className="press mt-4 flex items-center gap-3.5 rounded-[20px] bg-peach px-4 py-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun text-white">
          <Icon name="discover" size={22} fill="transparent" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[16px] font-black">Welche Ecke passt zu dir?</b>
          <span className="block text-[14px] font-semibold text-muted">7 kurze Fragen, dann sortieren wir für dich</span>
        </span>
        <Icon name="chevron" size={16} className="text-muted" />
      </Link>
    );
  }
  const p = persona(weights, extras);
  return (
    <div className="mt-4 flex items-stretch gap-2">
      <Link href="/profil" className="press flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-paper px-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-peach text-sun-soft">
          <Icon name={p.icon} size={19} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[12px] font-bold text-muted">Dein Reise-Profil</span>
          <b className="block truncate text-[15px] font-black">{p.name}</b>
        </span>
        <span className="ml-auto shrink-0 pl-1 text-[13px] font-extrabold text-sun-soft">Ändern</span>
      </Link>
      <Link href={quizHref} className="press flex shrink-0 items-center gap-1.5 rounded-2xl bg-paper px-3.5 text-[13px] font-extrabold">
        <Icon name="refresh" size={16} /> Quiz neu
      </Link>
    </div>
  );
}
