import { LogoMark } from "@/components/Logo";

export const metadata = { title: "Offline – StayCheck" };

/** Wird vom Service Worker gezeigt, wenn das Handy keine Verbindung hat */
export default function Offline() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <LogoMark size={72} />
      <h1 className="mega mt-6 text-[2rem]">Gerade offline</h1>
      <p className="mt-2 max-w-xs text-[15px] font-semibold text-muted">
        Ohne Internet können wir keine Lagen prüfen. Sobald du wieder Netz hast, geht es weiter.
      </p>
      <a href="/" className="btn-chunky mt-7 w-full max-w-xs">
        Nochmal versuchen
      </a>
    </div>
  );
}
