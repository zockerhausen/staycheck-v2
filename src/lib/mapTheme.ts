// StayCheck-Look für die kostenlose OpenFreeMap-Karte („dark“).
// Wir laden den fertigen Stil und färben nur um. Fehlt eine Ebene (Stil geändert), wird sie einfach übersprungen.
import type { Map as MlMap } from "maplibre-gl";

const C = {
  bg: "#0e0e10",
  land: "#121215",
  water: "#0f2230",
  waterLabel: "#5f8aa6",
  park: "#14251b",
  building: "#18181c",
  buildingLine: "#222227",
  minor: "#232327",
  major: "#2f2f35",
  majorCase: "#3a3a41",
  motorway: "#4a3226",
  transit: "#7a3d1f", // Bahnlinien leicht orange: Anbindung zählt im Score
  label: "#c9c9cf",
  labelSoft: "#8d8d94",
  halo: "#0c0c0e",
};

// Deutscher Name, sonst lateinische Schreibweise, sonst Originalname
const NAME = ["coalesce", ["get", "name:de"], ["get", "name:latin"], ["get", "name"]];

function paint(m: MlMap, id: string, prop: string, value: unknown) {
  if (!m.getLayer(id)) return;
  try {
    m.setPaintProperty(id, prop, value);
  } catch {
    // Ebene passt nicht (anderer Typ) – ignorieren
  }
}
function layout(m: MlMap, id: string, prop: string, value: unknown) {
  if (!m.getLayer(id)) return;
  try {
    m.setLayoutProperty(id, prop, value);
  } catch {
    // ignorieren
  }
}

export function applyStayCheckTheme(m: MlMap) {
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
  paint(m, "highway_path", "line-color", "#1d1d21");
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
  paint(m, "highway_name_other", "text-color", "#77777e");
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
            "fill-extrusion-color": "#1e1e23",
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
