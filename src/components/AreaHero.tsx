import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import SafeImg from "@/components/SafeImg";
import MapStage from "@/components/MapStage";
import type { AreaPhoto } from "@/lib/photos";
import type { IconName } from "@/lib/icons";

export type HeroTile = { value: string; label: string; accent?: boolean };

/**
 * Kopf einer Viertel-Seite: großes Foto (oder Farbfläche), darüber ein Blatt mit Name, Ort und drei Zahlen.
 */
export default function AreaHero({
  name,
  where,
  photo,
  tint,
  backHref,
  tiles,
  traits,
  action,
  children,
}: {
  name: string;
  where: string;
  photo?: AreaPhoto | null;
  tint: string;
  backHref: string;
  tiles: HeroTile[];
  traits: { key: string; label: string; icon: IconName }[];
  action?: React.ReactNode;
  /** Alles weitere der Seite: liegt im Blatt, das über das Foto geschoben wird */
  children?: React.ReactNode;
}) {
  return (
    <>
    <MapStage className="-mx-4 -mt-[max(1.25rem,env(safe-area-inset-top))]" overlap={24}>
      <div className="relative h-[320px] overflow-hidden" style={{ background: `linear-gradient(160deg, ${tint} 0%, var(--color-tan) 100%)` }}>
        {photo ? (
          <>
            <SafeImg src={photo.url} eager className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
            <a
              data-credit
              href={photo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-9 right-3 max-w-[70%] truncate rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              Foto: {photo.credit}, {photo.license}
            </a>
          </>
        ) : (
          <Icon name={traits[0]?.icon ?? "discover"} size={190} className="absolute -right-6 top-10 text-ink/10" fill="transparent" />
        )}
        <div className="absolute inset-x-4 top-[max(1.25rem,env(safe-area-inset-top))] flex items-center justify-between">
          <BackButton fallback={backHref} className="press flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17171b] shadow-soft">
            <Icon name="back" size={19} />
          </BackButton>
          {action}
        </div>
      </div>
    </MapStage>

      <div className="relative z-[1] -mx-4 -mt-6 min-h-[80vh] rounded-t-[26px] bg-sand px-4 pb-6 pt-6 shadow-[0_-10px_30px_rgba(0,0,0,0.12)]">
        <h1 className="mega text-[clamp(2rem,9vw,2.6rem)] [overflow-wrap:anywhere]">{name}</h1>
        <p className="mt-1 text-[16px] font-semibold text-muted">{where}</p>
        {traits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {traits.map((t) => (
              <span key={t.key} className="flex items-center gap-1.5 rounded-full bg-tan px-3 py-1.5 text-[13px] font-extrabold">
                <Icon name={t.icon} size={15} /> {t.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-paper px-3 py-3">
              <b className={`block text-[24px] font-black leading-none tracking-tight tabular-nums ${t.accent ? "text-sun" : ""}`}>{t.value}</b>
              <span className="mt-1.5 block text-[12px] font-bold leading-tight text-muted">{t.label}</span>
            </div>
          ))}
        </div>
        {children && <div className="mt-6 space-y-6">{children}</div>}
      </div>
    </>
  );
}
