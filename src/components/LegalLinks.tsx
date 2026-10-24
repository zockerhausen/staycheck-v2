import Link from "next/link";

/** Kleine Fußzeile mit Impressum und Datenschutz (muss von überall leicht erreichbar sein). */
export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Rechtliches" className={`flex justify-center gap-4 text-xs font-semibold text-faint ${className}`}>
      <Link href="/impressum">Impressum</Link>
      <Link href="/datenschutz">Datenschutz</Link>
      <Link href="/methode">So rechnen wir</Link>
    </nav>
  );
}
