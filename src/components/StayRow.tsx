import Link from "next/link";
import Icon from "@/components/Icon";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import { fmtScore, type StayReviews } from "@/lib/reviews";

/** Eine Unterkunft in der Liste: Name, Art und Preis, Lage-Wert und (wenn da) Gäste-Wert. */
export default function StayRow({
  id,
  href,
  name,
  kind,
  price,
  overBudget,
  note,
  match,
  reviews,
  save,
}: {
  id: string;
  href: string;
  name: string;
  kind: string;
  price: string | null;
  overBudget: boolean;
  note: string;
  match: number;
  reviews?: StayReviews;
  save: React.ComponentProps<typeof PlaceSaveButton>;
}) {
  return (
    <li id={id} className="flex items-center gap-3 border-b border-line py-3.5 last:border-0">
      <Link href={href} className="press flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tan">
          <Icon name="hotel" size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-black">{name}</span>
          <span className="block truncate text-[14px] font-semibold text-muted">
            {[kind, price, overBudget ? "über Budget" : null, note || null].filter(Boolean).join(", ")}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[13px] font-bold">
            <span className="rounded-full bg-peach px-2 py-0.5 font-black text-sun-soft">Lage {match}</span>
            {reviews && (
              <span className="flex items-center gap-1">
                <Icon name="star" size={14} fill="currentColor" />
                {fmtScore(reviews.fair)}
                <span className="font-semibold text-muted">({reviews.total.toLocaleString("de-DE")}{reviews.demo ? ", Beispiel" : ""})</span>
              </span>
            )}
          </span>
        </span>
      </Link>
      <PlaceSaveButton compact {...save} />
    </li>
  );
}
