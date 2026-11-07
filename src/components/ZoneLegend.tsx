/** Kurze Erklärung unter der Karte, was die violetten Flächen bedeuten (zwei Stufen, siehe pickZones). */
export default function ZoneLegend({ personal, shown }: { personal: boolean; shown: boolean }) {
  if (!shown) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] font-semibold text-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 shrink-0 rounded-[3px] bg-[#5340f2]/70" />
        {personal ? "Beste 10 % für dich" : "Beste 10 % der Stadt"}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 shrink-0 rounded-[3px] bg-[#9d92f8]/40" />
        Die nächsten 10 %
      </span>
      <span>Rest: ohne Farbe</span>
    </div>
  );
}
