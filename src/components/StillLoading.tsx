"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

/** Wird angezeigt, wenn die erste Berechnung länger dauert. Rechnet im Hintergrund weiter und lädt von selbst neu. */
export default function StillLoading({ title, text }: { title: string; text: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= 8) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 8000);
    return () => clearTimeout(t);
  }, [tries, router]);

  return (
    <div className="card mt-6 flex items-start gap-3.5 p-5">
      {tries < 8 ? (
        <span className="mt-0.5 h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-raised border-t-sun" />
      ) : (
        <Icon name="refresh" size={22} className="mt-0.5 shrink-0 text-muted" />
      )}
      <span>
        <b className="block">{tries < 8 ? title : "Das dauert gerade ungewöhnlich lange."}</b>
        <span className="mt-1 block text-sm text-muted">{tries < 8 ? text : "Die Kartenserver sind überlastet. Lade die Seite später neu."}</span>
      </span>
    </div>
  );
}
