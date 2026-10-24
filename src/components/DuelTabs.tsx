import Link from "next/link";
import Icon from "@/components/Icon";

/** Umschalter oben im Duell: Hotels gegeneinander oder Viertel gegeneinander */
export default function DuelTabs({ active }: { active: "hotels" | "kieze" }) {
  const tab = (key: "hotels" | "kieze", href: string, label: string, icon: "hotel" | "discover") => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold ${
        active === key ? "bg-paper text-ink shadow-sm" : "text-muted"
      }`}
    >
      <Icon name={icon} size={18} /> {label}
    </Link>
  );
  return (
    <nav className="grid grid-cols-2 rounded-2xl bg-tan p-1.5" aria-label="Duell-Art">
      {tab("hotels", "/duell/hotels", "Hotels", "hotel")}
      {tab("kieze", "/duell", "Viertel", "discover")}
    </nav>
  );
}
