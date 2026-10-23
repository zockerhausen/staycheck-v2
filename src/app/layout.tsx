import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { getUser } from "@/lib/data";
import "./globals.css";

const head = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-head" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "StayCheck – Finde deinen Kiez",
  description: "StayCheck zeigt Backpackern und Reisenden, welcher Bezirk einer Stadt am besten zu ihnen passt.",
};

export const viewport: Viewport = {
  themeColor: "#fbf3e4",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <html lang="de" className={`${head.variable} ${body.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <main className="mx-auto w-full max-w-md px-4 pb-28 pt-5">{children}</main>
        <BottomNav loggedIn={Boolean(user)} />
      </body>
    </html>
  );
}
