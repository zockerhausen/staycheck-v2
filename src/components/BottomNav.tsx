"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import type { IconName } from "@/lib/icons";

type Item = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

export default function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/quiz")) return null; // Im Quiz volle Konzentration

  const items: Item[] = [
    { href: "/", label: "Entdecken", icon: "discover", match: (p) => p === "/" || ["/ergebnis", "/kiez", "/reise", "/profil"].some((x) => p.startsWith(x)) },
    { href: "/check", label: "Lage-Check", icon: "check", match: (p) => p.startsWith("/check") },
    { href: "/duell/hotels", label: "Duell", icon: "duel", match: (p) => p.startsWith("/duell") },
    { href: "/favoriten", label: "Gemerkt", icon: "heart", match: (p) => p.startsWith("/favoriten") },
    {
      href: loggedIn ? "/konto" : "/login",
      label: loggedIn ? "Konto" : "Login",
      icon: "user",
      match: (p) => p.startsWith("/login") || p.startsWith("/konto"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.label}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${active ? "text-sun" : "text-muted"}`}
            >
              <Icon name={it.icon} size={26} fill={active ? "#ffcfa8" : "transparent"} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
