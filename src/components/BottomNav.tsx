"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Entdecken", icon: "🧭", match: (p: string) => p === "/" || p.startsWith("/quiz") || p.startsWith("/ergebnis") },
  { href: "/duell", label: "Duell", icon: "⚔️", match: (p: string) => p.startsWith("/duell") },
  { href: "/favoriten", label: "Gemerkt", icon: "♥", match: (p: string) => p.startsWith("/favoriten") },
];

export default function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/quiz")) return null; // Im Quiz volle Konzentration

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${active ? "text-sun" : "text-muted"}`}
            >
              <span className="text-xl leading-none" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
        <Link
          href={loggedIn ? "/konto" : "/login"}
          className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${pathname.startsWith("/login") || pathname.startsWith("/konto") ? "text-sun" : "text-muted"}`}
        >
          <span className="text-xl leading-none" aria-hidden>
            👤
          </span>
          {loggedIn ? "Konto" : "Login"}
        </Link>
      </div>
    </nav>
  );
}
