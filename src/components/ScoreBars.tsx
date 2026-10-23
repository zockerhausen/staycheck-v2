import type { Criterion } from "@/lib/data";
import { CRITERION_ICON } from "@/lib/icons";
import Icon from "@/components/Icon";

export default function ScoreBars({
  criteria,
  scores,
}: {
  criteria: Criterion[];
  scores: Record<string, number>;
}) {
  return (
    <dl className="space-y-1.5">
      {criteria.map((c) => {
        const s = scores[c.key] ?? 0;
        return (
          <div key={c.key} className="flex items-center gap-2 text-sm">
            <dt className="flex w-32 shrink-0 items-center gap-1.5 truncate text-muted">
              <Icon name={CRITERION_ICON[c.key]} size={18} /> {c.label}
            </dt>
            <dd className="h-2.5 flex-1 overflow-hidden rounded-full bg-tan">
              <div className="h-full rounded-full bg-sun" style={{ width: `${s * 10}%` }} />
            </dd>
            <span className="w-5 text-right font-semibold tabular-nums">{s}</span>
          </div>
        );
      })}
    </dl>
  );
}
