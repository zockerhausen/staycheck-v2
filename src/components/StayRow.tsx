import Link from "next/link";
import Icon from "@/components/Icon";
import PlaceSaveButton from "@/components/PlaceSaveButton";
import StaySelect from "@/components/StaySelect";
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
  booking,
  select,
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
  /** Link zu genau dieser Unterkunft beim passenden Anbieter (über Stay22, mit Reisedaten) */
  booking?: string;
  /** Platz in der Liste: Antippen zeigt die Unterkunft allein auf der Karte oben (statt die Detailseite zu öffnen) */
  select?: number;
}) {
  const meta = [kind, price, overBudget ? "über Budget" : null, note || null].filter(Boolean).join(" · ");
  return (
    <li id={id} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
      {select !== undefined ? (
        <StaySelect n={select} label={`${name} auf der Karte zeigen`} className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-peach text-sun-soft">
          <Icon name="hotel" size={24} fill="transparent" />
        </StaySelect>
      ) : (
        <Link href={href} className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-peach text-sun-soft" aria-hidden tabIndex={-1}>
          <Icon name="hotel" size={24} fill="transparent" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {select !== undefined ? (
            <StaySelect n={select} label={`${name} auf der Karte zeigen`} className="press min-w-0 flex-1 text-left">
              <span className="line-clamp-2 text-[16px] font-bold leading-snug">{name}</span>
              <span className="block truncate text-[13.5px] font-semibold text-muted">{meta}</span>
            </StaySelect>
          ) : (
            <Link href={href} className="press min-w-0 flex-1">
              <span className="line-clamp-2 text-[16px] font-bold leading-snug">{name}</span>
              <span className="block truncate text-[13.5px] font-semibold text-muted">{meta}</span>
            </Link>
          )}
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
          {booking && (
            <a
              href={booking}
              target="_blank"
              rel="sponsored noopener noreferrer"
              aria-label={`Preis für ${name} ansehen (Anzeige)`}
              className="press ml-auto flex shrink-0 items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[13px] font-extrabold text-white"
            >
              Preis <Icon name="external" size={13} fill="transparent" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
