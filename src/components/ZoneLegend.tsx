/** Kurze Erklärung unter der Karte, was die violetten Flächen bedeuten. */
export default function ZoneLegend({ personal, shown }: { personal: boolean; shown: boolean }) {
  if (!shown) return null;
  return (
    <p className="mt-2 flex items-center gap-2 px-1 text-xs text-muted">
      <span className="h-3 w-5 shrink-0 rounded-full bg-sun/40 blur-[2px]" />
      {personal ? "Violett leuchtet, wo die Lage am besten zu deinem Reise-Profil passt." : "Violett leuchtet, wo die Lage allgemein am besten ist."}
    </p>
  );
}
