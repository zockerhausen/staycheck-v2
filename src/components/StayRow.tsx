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
  priceHref,
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
  /** Partner-Link zum echten Preis für die gewählten Reisedaten */
  priceHref?: string;
}) {
  return (
    <li id={id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
      <Link href={href} className="press flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[16px] bg-peach text-sun-soft">
          <Icon name="hotel" size={26} fill="transparent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{name}</span>
          <span className="block truncate text-[14px] font-semibold text-muted">
            {[kind, price, overBudget ? "über Budget" : null, note || null].filter(Boolean).join(", ")}
          </span>
          <span className="mt-1.5 flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px] font-bold">
            <span className="shrink-0 rounded-full bg-peach px-[9px] py-0.5 font-extrabold text-sun-soft">Lage {match}</span>
            {reviews && (
              <span className="flex min-w-0 items-center gap-1">
                <Icon name="star" size={14} fill="currentColor" className="shrink-0" />
                {fmtScore(reviews.fair)}
                <span className="truncate font-semibold text-muted">({reviews.total.toLocaleString("de-DE")}{reviews.demo ? ", Beispiel" : ""})</span>
              </span>
            )}
          </span>
        </span>
      </Link>
      {priceHref && (
        <a
          href={priceHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`Preis für ${name} ansehen (Partner-Link)`}
          className="press flex shrink-0 items-center gap-1 rounded-full bg-sun px-3 py-2 text-[13px] font-extrabold text-white"
        >
          Preis <Icon name="external" size={13} fill="transparent" />
        </a>
      )}
      <PlaceSaveButton compact {...save} />
    </li>
  );
}
