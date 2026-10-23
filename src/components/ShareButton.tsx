"use client";

import { useState } from "react";

/** Teilt das Ergebnis als Bild im Story-Format (wie Spotify Wrapped). */
export default function ShareButton({ name, match, tags }: { name: string; match: number; tags: string[] }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const url = `/api/teilen?${new URLSearchParams({ kiez: name, match: String(match), tags: tags.join(",") })}`;
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `staycheck-${name}.png`, { type: "image/png" });
      const text = `Mein Kiez in Berlin: ${name} (${match}% Match). Finde deinen auf StayCheck!`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, url: window.location.origin });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch {
      // Teilen abgebrochen, nichts zu tun
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={share} disabled={busy} className="btn-chunky w-full">
      {busy ? "Bild wird erstellt…" : "📸 Ergebnis teilen"}
    </button>
  );
}
