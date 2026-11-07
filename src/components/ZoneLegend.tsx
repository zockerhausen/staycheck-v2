/** Kurze Erklärung unter der Karte, was die violetten Stellen bedeuten. */
export default function ZoneLegend({ personal, shown, perDistrict = false }: { personal: boolean; shown: boolean; perDistrict?: boolean }) {
  if (!shown) return null;
  return (
    <p className="mt-2 flex items-center gap-2 px-1 text-[13px] font-semibold text-muted">
      <span className="h-3 w-4 shrink-0 rounded-full bg-[#5340f2]/60 blur-[1px]" />
      {perDistrict
        ? personal
          ? "Leuchtet: der beste Spot in jedem Viertel für dich. Die Zahl dort ist der Match des Viertels."
          : "Leuchtet: der beste Spot in jedem Viertel."
        : personal
          ? "Leuchtet: die allerbesten Spots der Stadt für dich."
          : "Leuchtet: die allerbesten Spots der Stadt."}
    </p>
  );
}
