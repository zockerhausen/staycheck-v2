// StayCheck-Look für die kostenlose OpenFreeMap-Karte (hell: „positron“, dunkel: „dark“).
// Wir laden den fertigen Stil und färben nur um. Fehlt eine Ebene (Stil geändert), wird sie einfach übersprungen.
import type { Map as MlMap } from "maplibre-gl";

export const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const LIGHT = {
  bg: "#f2f1f7",
  land: "#efeef5",
  water: "#d6dcf6",
  waterLabel: "#5a64a8",
  park: "#dcebe0",
  building: "#e5e3ee",
  buildingLine: "#d9d6e6",
  minor: "#ffffff",
  major: "#ffffff",
  majorCase: "#dedbea",
  motorway: "#e2ddfc",
  transit: "#a99ff8",
  label: "#17133a",
  labelSoft: "#67638a",
  halo: "#ffffff",
  path: "#eceaf3",
  roadLabel: "#77739a",
  extrude: "#dfdcea",
};

const DARK = {
  bg: "#0c0a1e",
  land: "#110e27",
  water: "#161a45",
  waterLabel: "#7f86c9",
  park: "#13252a",
  building: "#17133a",
  buildingLine: "#211c48",
  minor: "#201b44",
  major: "#2a2550",
  majorCase: "#352f60",
  motorway: "#3a3370",
  transit: "#5a4fb0", // Bahnlinien leicht violett: Anbindung zählt im Score
  label: "#d6d2f2",
  labelSoft: "#9993c4",
  halo: "#0c0a1e",
  path: "#1c1840",
  roadLabel: "#7d78a8",
  extrude: "#1c1840",
};

// Deutscher Name, sonst lateinische Schreibweise, sonst Originalname
const NAME = ["coalesce", ["get", "name:de"], ["get", "name:latin"], ["get", "name"]];

function paint(m: MlMap, id: string, prop: string, value: unknown) {
  if (!m.getLayer(id)) return;
  try {
    (m.setPaintProperty as (i: string, p: string, v: unknown) => void).call(m, id, prop, value);
  } catch {
    // Ebene passt nicht (anderer Typ) – ignorieren
  }
}
function layout(m: MlMap, id: string, prop: string, value: unknown) {
  if (!m.getLayer(id)) return;
  try {
    (m.setLayoutProperty as (i: string, p: string, v: unknown) => void).call(m, id, prop, value);
  } catch {
    // ignorieren
  }
}

export function applyStayCheckTheme(m: MlMap, dark = true) {
  const C = dark ? DARK : LIGHT;
  const layers = m.getStyle().layers ?? [];
  const ids = layers.map((l) => l.id);

  paint(m, "background", "background-color", C.bg);
  paint(m, "landuse_residential", "fill-color", C.land);
  paint(m, "landuse_residential", "fill-opacity", 1);
  paint(m, "water", "fill-color", C.water);
  paint(m, "waterway", "line-color", C.water);
  for (const id of ["landuse_park", "landcover_wood"]) {
    paint(m, id, "fill-color", C.park);
    paint(m, id, "fill-opacity", 1);
  }
  paint(m, "building", "fill-color", C.building);
  paint(m, "building", "fill-outline-color", C.buildingLine);

  // Straßen
  paint(m, "highway_minor", "line-color", C.minor);
  paint(m, "highway_path", "line-color", C.path);
  paint(m, "highway_major_inner", "line-color", C.major);
  paint(m, "highway_major_casing", "line-color", C.majorCase);
  paint(m, "highway_major_subtle", "line-color", C.major);
  paint(m, "highway_motorway_inner", "line-color", C.motorway);
  paint(m, "highway_motorway_subtle", "line-color", C.motorway);
  layout(m, "road_oneway", "visibility", "none");
  layout(m, "road_oneway_opposite", "visibility", "none");

  // Bahn
  for (const id of ["railway_transit", "railway_minor", "railway"]) paint(m, id, "line-color", C.transit);
  for (const id of ["railway_transit_dashline", "railway_minor_dashline", "railway_dashline"]) paint(m, id, "line-color", C.bg);

  // Beschriftungen: deutsch, heller, gut lesbar
  for (const id of ids.filter((i) => i.startsWith("place_") || i === "highway_name_other" || i === "water_name")) {
    layout(m, id, "text-field", NAME);
    paint(m, id, "text-halo-color", C.halo);
    paint(m, id, "text-halo-width", 1.4);
    paint(m, id, "text-halo-blur", 0.5);
  }
  for (const id of ids.filter((i) => i.startsWith("place_"))) paint(m, id, "text-color", C.label);
  paint(m, "place_suburb", "text-color", C.labelSoft);
  paint(m, "place_other", "text-color", C.labelSoft);
  paint(m, "highway_name_other", "text-color", C.roadLabel);
  paint(m, "water_name", "text-color", C.waterLabel);

  // 3D-Gebäude ab Zoom 15 (sichtbar, wenn die Karte geneigt ist)
  if (m.getSource("openmaptiles") && !m.getLayer("sc-3d")) {
    const before = ids.find((i) => i.startsWith("highway_name") || i.startsWith("place_"));
    try {
      m.addLayer(
        {
          id: "sc-3d",
          type: "fill-extrusion",
          source: "openmaptiles",
          "source-layer": "building",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": C.extrude,
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 16, 0.85],
          },
        },
        before,
      );
    } catch {
      // ohne 3D weiter
    }
  }
}
