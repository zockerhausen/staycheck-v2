import BackButton from "@/components/BackButton";
import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/Icon";
import { legalComplete } from "@/lib/legal";

/** Gemeinsamer Rahmen für Hilfe, Impressum, Datenschutz und Nutzungsbedingungen: gut lesbar, ohne Ablenkung. */
export default function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="fade-up pb-10">
      <BackButton fallback="/" className="press flex h-11 w-11 items-center justify-center rounded-full bg-tan">
        <Icon name="back" size={18} />
      </BackButton>
      <h1 className="mega mt-6 text-[2.1rem]">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted">Stand: {updated}</p>}
      {!legalComplete() && (
        <p className="mt-5 rounded-2xl bg-peach p-3.5 text-sm font-semibold text-peach-ink">
          Entwurf: Die Angaben zum Betreiber fehlen noch. Diese Seite ist so noch nicht vollständig.
        </p>
      )}
      <div className="legal mt-6 space-y-6 text-[15px] leading-relaxed text-ink/85">{children}</div>
      <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-muted">
        <Link href="/hilfe">Hilfe</Link>
        <Link href="/impressum">Impressum</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
        <Link href="/methode">So rechnen wir</Link>
      </nav>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[19px] font-black text-ink">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** Zeigt einen Wert oder einen sichtbaren Platzhalter, nie etwas Erfundenes. */
export function Field({ value, label }: { value: string; label: string }) {
  return value ? <>{value}</> : <span className="rounded bg-raised px-1.5 text-sun-soft">[{label} fehlt]</span>;
}
