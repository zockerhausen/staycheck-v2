import type { Criterion } from "@/lib/data";

export default function ScoreBars({
  criteria,
  scores,
}: {
  criteria: Criterion[];
  scores: Record<string, number>;
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {criteria.map((c) => {
        const s = scores[c.key] ?? 0;
        return (
          <div key={c.key} className="flex items-center gap-2 text-sm">
            <dt className="w-24 shrink-0 text-muted">{c.label}</dt>
            <dd className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
              <div className="h-full rounded-full bg-pine" style={{ width: `${s * 10}%` }} />
            </dd>
            <span className="w-5 text-right tabular-nums">{s}</span>
          </div>
        );
      })}
    </dl>
  );
}
