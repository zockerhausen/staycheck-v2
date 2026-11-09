import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import CountUp from "@/components/CountUp";
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
      <div className="relative h-[330px] overflow-hidden" style={{ background: `linear-gradient(160deg, ${tint} 0%, var(--color-raised) 100%)` }}>
        {photo ? (
          <>
            <SafeImg src={photo.url} eager className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-x-0 top-0 h-[120px] bg-gradient-to-b from-[rgba(23,19,58,.4)] to-transparent" />
            <a
              data-credit
              href={photo.source}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-11 right-3 max-w-[70%] truncate rounded-full bg-[rgba(23,19,58,.5)] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              Foto: {photo.credit}, {photo.license}
            </a>
          </>
        ) : (
          <Icon name={traits[0]?.icon ?? "discover"} size={190} className="absolute -right-6 top-10 text-sun-soft/20" fill="transparent" />
        )}
        <div className="absolute inset-x-4 top-[max(1.25rem,env(safe-area-inset-top))] flex items-center justify-between">
          <BackButton fallback={backHref} className="press shadow-soft flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#17133a]">
            <Icon name="back" size={19} />
          </BackButton>
          {action}
        </div>
      </div>
    </MapStage>

      <div className="shadow-sheet relative z-[1] -mx-4 -mt-[30px] min-h-[80vh] rounded-t-[32px] bg-sand px-5 pb-6 pt-2.5">
        <div className="mx-auto mb-4 h-[5px] w-[42px] rounded-full bg-line" />
        <h1 className="mega text-[clamp(2rem,9vw,2.25rem)] [overflow-wrap:anywhere]">
          {name}
          <span className="text-pink">.</span>
        </h1>
        <p className="mt-1.5 text-[16px] font-semibold text-muted">{where}</p>
        {traits.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-[7px]">
            {traits.map((t) => (
              <span key={t.key} className="flex min-h-[36px] items-center gap-1.5 rounded-full bg-peach px-3.5 text-[14px] font-bold text-sun-soft">
                <Icon name={t.icon} size={16} fill="transparent" /> {t.label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-[24px] p-3 ${t.accent ? "shadow-primary bg-sun text-white" : "shadow-soft bg-paper"}`}>
              <b className="block text-[1.6rem] font-extrabold leading-none tracking-[-0.04em] tabular-nums [overflow-wrap:anywhere]">
                <CountUp value={t.value} />
              </b>
              <span className={`mt-1.5 block text-[12.5px] font-semibold leading-tight ${t.accent ? "text-white/85" : "text-muted"}`}>{t.label}</span>
            </div>
          ))}
        </div>
        {children && <div className="mt-6 space-y-6">{children}</div>}
      </div>
    </>
  );
}
