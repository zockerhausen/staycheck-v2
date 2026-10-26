import Icon from "@/components/Icon";
import { dayProfile, fitsFor } from "@/lib/vibe";

/** „So fühlt sich … an“: Tagesablauf und für wen es passt, aus den Werten abgeleitet. */
export default function DistrictVibe({ name, scores }: { name: string; scores: Record<string, number | null | undefined> }) {
  const day = dayProfile(scores);
  const { good, bad } = fitsFor(scores);
  if (!day.length) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-[19px] font-extrabold">So fühlt sich {name} an</h2>
      <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-line">
        {day.map((m) => (
          <li key={m.key} className="relative flex gap-3">
            <span className="z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tan text-sun-soft">
              <Icon name={m.icon} size={18} />
            </span>
            <span className="min-w-0 pt-0.5">
              <b className="block text-[13px] uppercase tracking-[0.06em] text-muted">{m.label}</b>
              <span className="block text-[15px] leading-snug">{m.text}</span>
            </span>
          </li>
        ))}
      </ol>
      {(good.length > 0 || bad.length > 0) && (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          {good.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#3ecf8e]">Passt gut zu</p>
              <div className="flex flex-wrap gap-2">
                {good.map((f) => (
                  <span key={f.label} className="flex items-center gap-1.5 rounded-full bg-[#3ecf8e]/10 px-3 py-1.5 text-[13px] font-semibold text-[#9be8c4]">
                    <Icon name={f.icon} size={14} /> {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {bad.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-[#ffb547]">Eher nicht für</p>
              <div className="flex flex-wrap gap-2">
                {bad.map((f) => (
                  <span key={f.label} className="flex items-center gap-1.5 rounded-full bg-[#ffb547]/10 px-3 py-1.5 text-[13px] font-semibold text-[#ffd08a]">
                    <Icon name={f.icon} size={14} /> {f.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Abgeleitet aus den gemessenen Werten unten.</p>
    </section>
  );
}
