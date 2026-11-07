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
      <Link href={quizHref} className="press glass-card mt-[18px] flex items-center gap-3.5 !rounded-[24px] px-3.5 py-3">
        <span className="shadow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-sun text-white">
          <Icon name="discover" size={22} fill="transparent" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[16px] font-extrabold">Welche Ecke passt zu dir?</b>
          <span className="block text-[14px] font-semibold text-muted">Kurzes Quiz, dann sortieren wir für dich</span>
        </span>
        <Icon name="chevron" size={16} className="text-sun-soft" />
      </Link>
    );
  }
  const p = persona(weights, extras);
  return (
    <div className="mt-[18px] flex items-stretch gap-2">
      <Link href="/profil" className="press glass-card flex min-w-0 flex-1 items-center gap-3 !rounded-[24px] px-3.5 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
          <Icon name={p.icon} size={21} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] font-semibold text-muted">Dein Reise-Profil</span>
          <b className="block truncate text-[16.5px] font-extrabold tracking-[-0.025em]">{p.name}</b>
        </span>
        <span className="ml-auto shrink-0 pl-1 text-[13px] font-extrabold text-sun-soft">Ändern</span>
      </Link>
      <Link href={quizHref} className="press glass-card flex shrink-0 items-center gap-1.5 !rounded-[24px] px-3.5 text-[13px] font-extrabold text-sun-soft">
        <Icon name="refresh" size={16} /> Quiz neu
      </Link>
    </div>
  );
}
