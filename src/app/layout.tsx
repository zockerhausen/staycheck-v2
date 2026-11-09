import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import BottomNav from "@/components/BottomNav";
import { NavTracker } from "@/components/BackButton";
import { getUser } from "@/lib/data";
import Splash from "@/components/Splash";
import InstallHint from "@/components/InstallHint";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

// Eine Schrift für alles: Geist – klar, modern, in kräftigen Schnitten (nie dünn)
const body = Geist({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "StayCheck – Schlaf da, wo es passt",
  description: "StayCheck zeigt Backpackern und Reisenden, welcher Bezirk einer Stadt am besten zu ihnen passt.",
  applicationName: "StayCheck",
  // Als App auf dem iPhone: eigenes Fenster, Statusleiste über dem Inhalt, eigener Name unter dem Icon
  appleWebApp: { capable: true, title: "StayCheck", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f0f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0c24" },
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
        <Splash />
        <main className="mx-auto w-full max-w-md px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">{children}</main>
        <NavTracker />
        <BottomNav loggedIn={Boolean(user)} />
        <InstallHint />
        <PwaRegister />
      </body>
    </html>
  );
}
