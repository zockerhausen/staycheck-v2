import Icon from "@/components/Icon";
import type { IconName } from "@/lib/icons";
import { estimateArrival, luggageWalk, type Hub } from "@/lib/arrival";

const HUB_ICON: Record<Hub["kind"], IconName> = { airport: "plane", train: "transit", bus: "bus", center: "map" };

/**
 * Wie weit ist es? Flughafen, Bahnhof, Zentrum mit geschätzter Fahrzeit (ehrlich als „ca.“ beschriftet)
 * und Link zur genauen Route in Google Maps. Mit nearestRail zusätzlich der letzte Fußweg mit Gepäck.
 */
export default function ArrivalCard({
  hubs,
  lat,
  lon,
  nearestRail,
  title = "Ankommen mit Gepäck",
}: {
  hubs: Hub[];
  lat: number;
  lon: number;
  nearestRail?: { name: string; dist: number } | null;
  title?: string;
}) {
  if (!hubs.length) return null;
  const estimates = hubs.map((h) => estimateArrival(h, lat, lon));
  const walk = nearestRail ? luggageWalk(nearestRail.dist) : null;

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 text-[1.35rem] font-extrabold tracking-[-0.03em]">
        <Icon name="bag" size={22} className="text-sun-soft" fill="transparent" /> {title}
      </h2>

      {nearestRail !== undefined &&
        (nearestRail ? (
          <p className="mt-3 rounded-[18px] bg-peach p-3 text-sm font-semibold text-peach-ink">
            Letztes Stück: {walk} Min. mit Gepäck von {nearestRail.name}
            {walk! > 12 ? ". Mit schwerem Rucksack eher ein Taxi nehmen." : "."}
          </p>
        ) : (
          <p className="mt-3 rounded-[18px] bg-peach p-3 text-sm font-semibold text-peach-ink">
            Keine Bahn in Laufweite. Mit Gepäck lohnt sich hier oft ein Taxi oder Grab/Uber.
          </p>
        ))}

      <ul className="mt-2 divide-y divide-line">
        {estimates.map((e) => (
          <li key={e.hub.id} className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-peach text-sun-soft">
              <Icon name={e.mode === "walk" ? "walk" : HUB_ICON[e.hub.kind]} size={21} fill="transparent" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{e.hub.name}</span>
              <span className="block text-sm font-semibold text-muted">
                ca. {e.minMinutes}–{e.maxMinutes} Min. {e.mode === "walk" ? "zu Fuß" : "mit Bahn/Bus"} · {String(e.km).replace(".", ",")} km
              </span>
            </span>
            <a
              href={e.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Route zu ${e.hub.name} in Google Maps`}
              className="press flex min-h-[38px] shrink-0 items-center gap-1 rounded-full bg-peach px-3.5 text-[13px] font-extrabold text-sun-soft"
            >
              Route <Icon name="external" size={14} fill="transparent" />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs font-semibold text-muted">
        Geschätzt aus der Entfernung. Die genaue Verbindung mit Umstiegen zeigt dir „Route“ in Google Maps.
      </p>
    </section>
  );
}
