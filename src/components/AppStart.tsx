"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AWAY_MS = 10 * 60 * 1000; // länger als 10 Min. weg = wie neu geöffnet

/**
 * Nur in der installierten App (Home-Bildschirm):
 * - Neustart auf dem iPhone startet immer auf der Startseite. Ältere Installationen haben sich sonst die Seite gemerkt,
 *   auf der man beim Hinzufügen war (samt altem Reiseziel in der Adresse).
 * - Wer die App länger als 10 Minuten verlassen hat, landet beim Zurückkommen wieder auf der Startseite,
 *   und die zeigt den aktuellen Stand (z. B. kein Reiseziel mehr, wenn es entfernt wurde).
 */
export default function AppStart() {
  const router = useRouter();

  useEffect(() => {
    const iosApp = (navigator as unknown as { standalone?: boolean }).standalone === true;
    const app = iosApp || window.matchMedia("(display-mode: standalone)").matches;
    if (!app) return;
    // Startseite ohne Reiseziel in der Adresse: dann entscheidet allein, was gespeichert ist
    const goHome = () => {
      const stale = location.pathname !== "/" || /[?&]ziel=/.test(location.search);
      if (stale) router.replace("/");
      else router.refresh();
    };

    // Kaltstart (neue Sitzung). Nur auf dem iPhone: dort öffnen Links nie direkt in der App, es geht also nichts verloren.
    try {
      if (!sessionStorage.getItem("sc-app-session")) {
        sessionStorage.setItem("sc-app-session", "1");
        if (iosApp) goHome();
      }
    } catch {
      /* ohne Speicher: normal weiter */
    }

    let hiddenAt = 0;
    const onVisible = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        hiddenAt = 0;
        goHome();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // nur einmal beim Start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
