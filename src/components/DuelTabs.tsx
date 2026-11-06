import Link from "next/link";
import Icon from "@/components/Icon";

/** Umschalter oben im Duell: Hotels gegeneinander oder Viertel gegeneinander */
export default function DuelTabs({ active }: { active: "hotels" | "kieze" }) {
  const tab = (key: "hotels" | "kieze", href: string, label: string, icon: "hotel" | "discover") => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-bold ${
        active === key ? "bg-sun text-white shadow-primary" : "text-sun-soft"
      }`}
    >
      <Icon name={icon} size={18} /> {label}
    </Link>
  );
  return (
    <nav className="grid grid-cols-2 rounded-full bg-paper p-1" aria-label="Duell-Art">
      {tab("hotels", "/duell/hotels", "Unterkünfte", "hotel")}
      {tab("kieze", "/duell", "Viertel", "discover")}
    </nav>
  );
}
