// Das StayCheck-Logo: Standort-Pin mit Haken („Ort geprüft“) und Schriftzug.
// Ohne Hooks, funktioniert überall (auch im Startbildschirm, der vor React sichtbar ist).

export const PIN_PATH =
  "M32 59.5c-1.2 0-2.3-.5-3.1-1.4C21.6 50 11 37.9 11 25.6 11 13.7 20.4 4.5 32 4.5s21 9.2 21 21.1c0 12.3-10.6 24.4-17.9 32.5-.8.9-1.9 1.4-3.1 1.4z";
export const CHECK_PATH = "M22.5 25.8l6.6 6.6 12.6-13";

/** Nur das Zeichen. tone="color": violetter Pin, weißer Haken. tone="white": weißer Pin, violetter Haken (auf Violett). */
export function LogoMark({ size = 24, tone = "color", className }: { size?: number; tone?: "color" | "white"; className?: string }) {
  const gid = `sc-logo-${tone}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      {tone === "color" && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7b6dff" />
            <stop offset="1" stopColor="#4a36e8" />
          </linearGradient>
        </defs>
      )}
      <path d={PIN_PATH} fill={tone === "color" ? `url(#${gid})` : "#fff"} />
      <path d={CHECK_PATH} fill="none" stroke={tone === "color" ? "#fff" : "#5340f2"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Zeichen und Schriftzug „StayCheck“. onViolet: für violette Flächen (alles hell). */
export default function Logo({ size = 18, onViolet = false, className = "" }: { size?: number; onViolet?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.32em] font-extrabold tracking-[-0.035em] ${className}`} style={{ fontSize: size }}>
      <LogoMark size={Math.round(size * 1.35)} tone={onViolet ? "white" : "color"} />
      <span>
        Stay<span className={onViolet ? "text-white/80" : "text-sun-soft"}>Check</span>
      </span>
    </span>
  );
}
