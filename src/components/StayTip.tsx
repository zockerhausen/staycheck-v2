import Link from "next/link";
import Icon from "@/components/Icon";
import { fairLabel, fmtScore, type StayReviews } from "@/lib/reviews";

/** „Unser Tipp“: die Unterkunft mit der besten Mischung aus Lage, Gäste-Bewertung und Budget */
export default function StayTip({
  href,
  name,
  kind,
  price,
  match,
  reviews,
  budget,
}: {
  href: string;
  name: string;
  kind: string;
  price: string | null;
  match: number;
  reviews: StayReviews;
  budget: boolean;
}) {
  return (
    <Link href={href} className="press glow-card mt-4 block rounded-[22px] p-4">
      <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-sun-soft">
        <Icon name="discover" size={14} /> Unser Tipp{budget ? " in deinem Budget" : ""}
      </span>
      <b className="mt-1.5 block truncate font-display text-[21px] font-extrabold leading-tight">{name}</b>
      <span className="mt-0.5 block text-[13px] text-muted">
        {kind}
        {price ? ` · ${price}` : ""}
      </span>
      <span className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-[14px] bg-tan px-3 py-2">
          <b className="block font-display text-[20px] font-extrabold leading-none text-sun-soft">{match}</b>
          <span className="mt-1 block text-[11px] text-muted">Lage für dich</span>
        </span>
        <span className="rounded-[14px] bg-tan px-3 py-2">
          <b className="block font-display text-[20px] font-extrabold leading-none">{fmtScore(reviews.fair)}</b>
          <span className="mt-1 block truncate text-[11px] text-muted">
            {fairLabel(reviews.fair)} · {reviews.platforms.length} Plattformen{reviews.demo ? " · Beispiel" : ""}
          </span>
        </span>
      </span>
      <span className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-sun-soft">
        Ansehen und Preise vergleichen <Icon name="chevron" size={14} />
      </span>
    </Link>
  );
}
