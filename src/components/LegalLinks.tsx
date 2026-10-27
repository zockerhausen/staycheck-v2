import Link from "next/link";

/** Kleine Fußzeile mit Hilfe, Impressum, Datenschutz und Nutzungsbedingungen (muss von überall leicht erreichbar sein). */
export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={`flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] font-bold text-muted ${className}`}>
      <Link href="/hilfe">Hilfe</Link>
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
      <Link href="/nutzungsbedingungen">Nutzungsbedingungen</Link>
      <Link href="/methode">So rechnen wir</Link>
    </nav>
  );
}
