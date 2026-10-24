import { ICONS, type IconName } from "@/lib/icons";

/**
 * Eigenes StayCheck-Icon. Linienfarbe = currentColor, Akzentfläche = --icon-fill (Standard: weiches Orange).
 * Beispiel: <Icon name="hotel" size={28} />
 */
export default function Icon({
  name,
  size = 24,
  className = "",
  fill,
  label,
}: {
  name: IconName;
  size?: number;
  className?: string;
  fill?: string;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={fill ? ({ ["--icon-fill" as string]: fill } as React.CSSProperties) : undefined}
    >
      {ICONS[name].map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={"f" in p && p.f ? "var(--icon-fill, rgba(242,102,47,.22))" : "none"}
          stroke={"s" in p && p.s ? "currentColor" : "none"}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
