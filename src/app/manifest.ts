import type { MetadataRoute } from "next";

// Damit man StayCheck zum Home-Bildschirm hinzufügen und wie eine App nutzen kann (eigenes Fenster, eigenes Icon)
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StayCheck – Schlaf da, wo es passt",
    short_name: "StayCheck",
    description: "Finde das Viertel und die Unterkunft, die wirklich zu dir passen.",
    lang: "de",
    dir: "ltr",
    start_url: "/?quelle=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#5340f2",
    theme_color: "#5340f2",
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lage-Check", short_name: "Lage-Check", description: "Eine Unterkunft prüfen", url: "/check", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Gemerkt", short_name: "Gemerkt", description: "Deine gemerkten Orte", url: "/favoriten", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
