import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";
import { NavTracker } from "@/components/BackButton";
import { getUser } from "@/lib/data";
import "./globals.css";

// Eine Schrift für alles: freundlich, modern und kräftig (gut lesbar)
const body = Figtree({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800", "900"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "StayCheck – Schlaf da, wo es passt",
  description: "StayCheck zeigt Backpackern und Reisenden, welcher Bezirk einer Stadt am besten zu ihnen passt.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131417" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, jar] = await Promise.all([getUser(), cookies()]);
  // Darstellung: ausdrücklich gewählt (Cookie) oder wie am Handy eingestellt
  const t = jar.get("sc_theme")?.value;
  const theme = t === "light" || t === "dark" ? t : undefined;

  return (
    <html lang="de" className={body.variable} data-theme={theme}>
      <body className="min-h-dvh font-sans antialiased">
        <main className="mx-auto w-full max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
        <NavTracker />
        <BottomNav loggedIn={Boolean(user)} />
      </body>
    </html>
  );
}
