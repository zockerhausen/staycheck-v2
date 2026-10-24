import Icon from "@/components/Icon";
import type { IconName } from "@/lib/icons";
import { estimateArrival, luggageWalk, type Hub } from "@/lib/arrival";

const HUB_ICON: Record<Hub["kind"], IconName> = { airport: "plane", train: "transit", bus: "bus" };

/** Ankunfts-Check: alle Ankunftsorte einer Stadt mit geschätzter Fahrzeit + letzter Fußweg mit Gepäck. */
export default function ArrivalCard({
  hubs,
  lat,
  lon,
  nearestRail,
}: {
  hubs: Hub[];
  lat: number;
  lon: number;
  nearestRail: { name: string; dist: number } | null;
}) {
  const estimates = hubs.map((h) => estimateArrival(h, lat, lon));
  const walk = nearestRail ? luggageWalk(nearestRail.dist) : null;

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-display text-[19px] font-extrabold">
        <Icon name="bag" size={22} className="text-sun-soft" /> Ankommen mit Gepäck
      </h2>

      {nearestRail ? (
        <p className={`mt-3 rounded-2xl p-3 text-sm font-semibold ${walk! <= 6 ? "bg-peach text-peach-ink" : "bg-tan"}`}>
          Letztes Stück: {walk} Min. mit Gepäck von {nearestRail.name}
          {walk! > 12 ? ". Mit schwerem Rucksack eher ein Taxi nehmen." : "."}
        </p>
      ) : (
        <p className="mt-3 rounded-2xl bg-tan p-3 text-sm font-semibold">
          Keine Bahn in Laufweite. Mit Gepäck lohnt sich hier oft ein Taxi oder Grab/Uber.
        </p>
      )}

      <ul className="mt-3 divide-y divide-line">
        {estimates.map((e) => (
          <li key={e.hub.id} className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-ink">
              <Icon name={HUB_ICON[e.hub.kind]} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{e.hub.name}</span>
              <span className="block text-sm text-muted">
                ca. {e.minMinutes}–{e.maxMinutes} Min. mit Bahn/Bus · {e.km} km
              </span>
            </span>
            <a
              href={e.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-full bg-raised px-3 py-2 text-xs font-bold text-ink"
            >
              Route <Icon name="external" size={14} />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Fahrzeiten sind geschätzt. Die genaue Verbindung mit Umstiegen zeigt dir der Route-Knopf.
      </p>
    </section>
  );
}
