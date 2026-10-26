import Link from "next/link";
import Icon from "@/components/Icon";
import TipForm from "@/components/TipForm";
import TipActions from "@/components/TipActions";
import { getMyTipIds, TIP_CATEGORIES, timeAgo, type Tip } from "@/lib/tips";

/** Tipps von Reisenden: Liste + Formular. Für einen Ort (Lage-Check) oder ein Viertel. */
export default async function TipsSection({
  tips,
  userId,
  lat,
  lon,
  placeName,
  districtId,
  returnTo,
  title = "Tipps von Reisenden",
}: {
  tips: Tip[];
  userId: string | null;
  lat: number;
  lon: number;
  placeName?: string;
  districtId?: string | null;
  returnTo: string;
  title?: string;
}) {
  const cat = Object.fromEntries(TIP_CATEGORIES.map((c) => [c.key, c]));
  const mine = await getMyTipIds(userId);

  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-[19px] font-extrabold">
        <Icon name="tip" size={24} className="text-sun" /> {title}
      </h2>
      <p className="mt-1 text-sm text-muted">Was andere vor Ort erlebt haben. Kurz, ehrlich, ohne Werbung.</p>

      {tips.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-raised p-4 text-sm text-muted">
          Noch keine Tipps hier. Warst du schon mal da? Sei die oder der Erste.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tips.map((t) => (
            <li key={t.id} className="rounded-2xl bg-paper p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="inline-flex items-center gap-1 rounded-full bg-peach px-2 py-0.5 text-peach-ink">
                  <Icon name={cat[t.category]?.icon ?? "tip"} size={14} fill="rgba(242,102,47,.22)" /> {cat[t.category]?.label ?? "Tipp"}
                </span>
                <span className="truncate">
                  {t.author_name ?? "Reisende:r"} · {timeAgo(t.created_at)}
                </span>
              </div>
              <p className="mt-2 [overflow-wrap:anywhere]">{t.body}</p>
              {t.place_name && <p className="mt-1 truncate text-xs text-muted">bei {t.place_name}</p>}
              <TipActions tipId={t.id} own={mine.has(t.id)} loggedIn={Boolean(userId)} path={returnTo.split("?")[0]} />
            </li>
          ))}
        </ul>
      )}

      {userId ? (
        <TipForm lat={lat} lon={lon} placeName={placeName} districtId={districtId ?? null} returnTo={returnTo} />
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(returnTo)}`}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-paper py-3 text-sm font-bold"
        >
          <Icon name="tip" size={18} /> Anmelden und Tipp schreiben
        </Link>
      )}
    </section>
  );
}
