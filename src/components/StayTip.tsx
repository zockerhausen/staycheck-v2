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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-3 py-1.5 text-[13px] font-extrabold text-sun-soft">
        <Icon name="discover" size={14} /> Unser Tipp{budget ? " in deinem Budget" : ""}
      </span>
      <b className="mt-2.5 block truncate text-[21px] font-black leading-tight tracking-tight">{name}</b>
      <span className="mt-0.5 block text-[15px] font-semibold text-muted">
        {kind}
        {price ? ` · ${price}` : ""}
      </span>
      <span className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-[14px] bg-tan px-3 py-2">
          <b className="block text-[22px] font-black leading-none text-sun">{match}</b>
          <span className="mt-1 block text-[12px] font-bold text-muted">Lage für dich</span>
        </span>
        <span className="rounded-[14px] bg-tan px-3 py-2">
          <b className="block text-[22px] font-black leading-none">{fmtScore(reviews.fair)}</b>
          <span className="mt-1 block truncate text-[12px] font-bold text-muted">
            {fairLabel(reviews.fair)}, {reviews.platforms.length} Seiten{reviews.demo ? " (Beispiel)" : ""}
          </span>
        </span>
      </span>
      <span className="btn-chunky mt-4 w-full">Ansehen und Preise vergleichen</span>
    </Link>
  );
}
