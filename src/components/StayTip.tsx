import Link from "next/link";
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
    <Link href={href} className="press ring-pink mt-4 block rounded-[26px] bg-paper px-[18px] pb-[18px] pt-4">
      <span className="inline-flex items-center gap-[7px] rounded-full bg-[rgba(255,61,154,.12)] px-3 py-1.5 text-[13.5px] font-extrabold text-ink">
        <span className="dot-pink" aria-hidden /> Unser Tipp{budget ? " in deinem Budget" : ""}
      </span>
      <b className="mt-2.5 block truncate text-[21px] font-extrabold leading-tight tracking-[-0.03em]">{name}</b>
      <span className="mt-0.5 block text-[15px] font-semibold text-muted">
        {kind}
        {price ? ` · ${price}` : ""}
      </span>
      <span className="mt-3 grid grid-cols-2 gap-2">
        <span className="rounded-[18px] bg-peach px-3 py-2.5">
          <b className="block text-[1.3rem] font-extrabold leading-none tracking-[-0.03em] text-sun-soft">{match}</b>
          <span className="mt-1 block text-[12px] font-semibold text-muted">Lage für dich</span>
        </span>
        <span className="rounded-[18px] bg-peach px-3 py-2.5">
          <b className="block text-[1.3rem] font-extrabold leading-none tracking-[-0.03em] text-sun-soft">{fmtScore(reviews.fair)}</b>
          <span className="mt-1 block truncate text-[12px] font-semibold text-muted">
            {fairLabel(reviews.fair)}, {reviews.platforms.length} Seiten{reviews.demo ? " (Beispiel)" : ""}
          </span>
        </span>
      </span>
      <span className="btn-chunky mt-4 w-full">Ansehen und Preise vergleichen</span>
    </Link>
  );
}
