import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { NavTracker } from "@/components/BackButton";
import { getUser } from "@/lib/data";
import "./globals.css";

// Eine Schrift für alles (ruhig und modern), Überschriften extra fett
const head = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-head" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "StayCheck – Schlaf da, wo es passt",
  description: "StayCheck zeigt Backpackern und Reisenden, welcher Bezirk einer Stadt am besten zu ihnen passt.",
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="de" className={`${head.variable} ${body.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <main className="mx-auto w-full max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
        <NavTracker />
        <BottomNav loggedIn={Boolean(user)} />
      </body>
    </html>
  );
}
