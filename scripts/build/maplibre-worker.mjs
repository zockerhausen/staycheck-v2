// Kopiert den Karten-Worker von MapLibre (ab Version 6) nach public/, damit der Browser ihn als eigene Datei laden kann.
// Der Dateiname enthält die Version: ein Update lädt nie einen alten, zwischengespeicherten Worker.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync("node_modules/maplibre-gl/package.json", "utf8"));
mkdirSync("public/maplibre", { recursive: true });
for (const f of readdirSync("public/maplibre")) rmSync(`public/maplibre/${f}`);
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", `public/maplibre/worker-${version}.mjs`);
console.log(`MapLibre-Worker ${version} bereit`);
