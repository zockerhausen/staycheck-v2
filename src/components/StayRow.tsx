import Link from "next/link";
import Icon from "@/components/Icon";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import FocusPriceButton from "@/components/FocusPriceButton";
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
  focus,
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
  /** Ort für „Preise hier“ (öffnet die Preis-Karte genau dort) */
  focus?: { lat: number; lon: number };
}) {
  return (
    <li id={id} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
      <Link href={href} className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-peach text-sun-soft" aria-hidden tabIndex={-1}>
        <Icon name="hotel" size={24} fill="transparent" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link href={href} className="press min-w-0 flex-1">
            <span className="line-clamp-2 text-[16px] font-bold leading-snug">{name}</span>
            <span className="block truncate text-[13.5px] font-semibold text-muted">
              {[kind, price, overBudget ? "über Budget" : null, note || null].filter(Boolean).join(" · ")}
            </span>
          </Link>
          <PlaceSaveButton compact {...save} />
        </div>
        <div className="mt-2 flex items-center gap-2 whitespace-nowrap text-[13px] font-bold">
          <span className="shrink-0 rounded-full bg-peach px-[9px] py-0.5 font-extrabold text-sun-soft">Lage {match}</span>
          {reviews && (
            <span className="flex min-w-0 items-center gap-1">
              <Icon name="star" size={14} fill="currentColor" className="shrink-0" />
              {fmtScore(reviews.fair)}
              <span className="truncate font-semibold text-muted">({reviews.total.toLocaleString("de-DE")}{reviews.demo ? ", Beispiel" : ""})</span>
            </span>
          )}
          {focus && <FocusPriceButton lat={focus.lat} lon={focus.lon} name={name} />}
        </div>
      </div>
    </li>
  );
}
