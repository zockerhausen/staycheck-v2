// Beliebte Reiseziele von Backpackern. Zwei Aufgaben:
// 1) In der Suche stehen sie immer oben (die Kartensuche findet bei „London“ sonst zuerst London in Kanada).
// 2) Ihre Viertel und Unterkünfte werden vorab berechnet, damit sie sofort laden (siehe /api/vorwaermen).
// Koordinaten = Mittelpunkt für die Viertel-Suche (Umkreis 3,5 km), bewusst dort, wo Reisende wohnen.
// Läuft im Browser und auf dem Server.

/** Größe des vorberechneten Gebiets (Radius in m): geprüfte Großstädte (Berlin, Bangkok) und alle anderen */
export const VERIFIED_RADIUS = 8000;
export const CITY_RADIUS = 3500;

export type Popular = { slug: string; ort: string; land: string; lat: number; lon: number; aka?: string[] };

export const POPULAR: Popular[] = [
  // Europa
  { slug: "lissabon", ort: "Lissabon", land: "Portugal", lat: 38.7078, lon: -9.1366, aka: ["lisbon", "lisboa"] },
  { slug: "porto", ort: "Porto", land: "Portugal", lat: 41.1502, lon: -8.6103, aka: ["oporto"] },
  { slug: "barcelona", ort: "Barcelona", land: "Spanien", lat: 41.3826, lon: 2.1771 },
  { slug: "madrid", ort: "Madrid", land: "Spanien", lat: 40.4168, lon: -3.7035 },
  { slug: "sevilla", ort: "Sevilla", land: "Spanien", lat: 37.3886, lon: -5.9953, aka: ["seville"] },
  { slug: "valencia", ort: "Valencia", land: "Spanien", lat: 39.4697, lon: -0.3763 },
  { slug: "paris", ort: "Paris", land: "Frankreich", lat: 48.8535, lon: 2.3484 },
  { slug: "amsterdam", ort: "Amsterdam", land: "Niederlande", lat: 52.3731, lon: 4.8925 },
  { slug: "london", ort: "London", land: "Vereinigtes Königreich", lat: 51.5074, lon: -0.1278 },
  { slug: "edinburgh", ort: "Edinburgh", land: "Vereinigtes Königreich", lat: 55.9533, lon: -3.1884, aka: ["edinburg"] },
  { slug: "dublin", ort: "Dublin", land: "Irland", lat: 53.3494, lon: -6.2606 },
  { slug: "prag", ort: "Prag", land: "Tschechien", lat: 50.0875, lon: 14.4213, aka: ["prague", "praha"] },
  { slug: "budapest", ort: "Budapest", land: "Ungarn", lat: 47.4979, lon: 19.0402 },
  { slug: "wien", ort: "Wien", land: "Österreich", lat: 48.2084, lon: 16.3725, aka: ["vienna"] },
  { slug: "krakau", ort: "Krakau", land: "Polen", lat: 50.0619, lon: 19.9369, aka: ["krakow", "cracow"] },
  { slug: "rom", ort: "Rom", land: "Italien", lat: 41.8933, lon: 12.4829, aka: ["rome", "roma"] },
  { slug: "florenz", ort: "Florenz", land: "Italien", lat: 43.7698, lon: 11.2556, aka: ["florence", "firenze"] },
  { slug: "neapel", ort: "Neapel", land: "Italien", lat: 40.8359, lon: 14.2488, aka: ["naples", "napoli"] },
  { slug: "athen", ort: "Athen", land: "Griechenland", lat: 37.9756, lon: 23.7348, aka: ["athens"] },
  { slug: "istanbul", ort: "Istanbul", land: "Türkei", lat: 41.02, lon: 28.975 },
  { slug: "kopenhagen", ort: "Kopenhagen", land: "Dänemark", lat: 55.6867, lon: 12.5701, aka: ["copenhagen"] },
  { slug: "split", ort: "Split", land: "Kroatien", lat: 43.5116, lon: 16.44 },
  { slug: "ljubljana", ort: "Ljubljana", land: "Slowenien", lat: 46.0511, lon: 14.5058, aka: ["laibach"] },
  { slug: "hamburg", ort: "Hamburg", land: "Deutschland", lat: 53.5502, lon: 10.0013 },
  { slug: "muenchen", ort: "München", land: "Deutschland", lat: 48.1371, lon: 11.5754, aka: ["munich"] },
  { slug: "tiflis", ort: "Tiflis", land: "Georgien", lat: 41.6935, lon: 44.8014, aka: ["tbilisi"] },
  // Afrika
  { slug: "marrakesch", ort: "Marrakesch", land: "Marokko", lat: 31.6258, lon: -7.9892, aka: ["marrakech", "marrakesh"] },
  { slug: "kapstadt", ort: "Kapstadt", land: "Südafrika", lat: -33.9288, lon: 18.4172, aka: ["cape town"] },
  // Asien
  { slug: "chiang-mai", ort: "Chiang Mai", land: "Thailand", lat: 18.7883, lon: 98.9859 },
  { slug: "phuket", ort: "Phuket", land: "Thailand", lat: 7.8848, lon: 98.3892 },
  { slug: "hanoi", ort: "Hanoi", land: "Vietnam", lat: 21.0283, lon: 105.854 },
  { slug: "saigon", ort: "Ho-Chi-Minh-Stadt", land: "Vietnam", lat: 10.7756, lon: 106.7019, aka: ["saigon", "ho chi minh"] },
  { slug: "hoi-an", ort: "Hoi An", land: "Vietnam", lat: 15.8801, lon: 108.338, aka: ["hội an"] },
  { slug: "siem-reap", ort: "Siem Reap", land: "Kambodscha", lat: 13.3633, lon: 103.8564 },
  { slug: "phnom-penh", ort: "Phnom Penh", land: "Kambodscha", lat: 11.57, lon: 104.925 },
  { slug: "kuala-lumpur", ort: "Kuala Lumpur", land: "Malaysia", lat: 3.1517, lon: 101.6942 },
  { slug: "singapur", ort: "Singapur", land: "Singapur", lat: 1.2899, lon: 103.8519, aka: ["singapore"] },
  { slug: "ubud", ort: "Ubud", land: "Indonesien", lat: -8.517, lon: 115.2551, aka: ["bali"] },
  { slug: "tokio", ort: "Tokio", land: "Japan", lat: 35.6769, lon: 139.7639, aka: ["tokyo"] },
  { slug: "kyoto", ort: "Kyoto", land: "Japan", lat: 35.0116, lon: 135.7681, aka: ["kyōto"] },
  { slug: "osaka", ort: "Osaka", land: "Japan", lat: 34.6938, lon: 135.5015 },
  { slug: "seoul", ort: "Seoul", land: "Südkorea", lat: 37.5667, lon: 126.9783 },
  { slug: "taipeh", ort: "Taipeh", land: "Taiwan", lat: 25.0375, lon: 121.5637, aka: ["taipei"] },
  { slug: "hongkong", ort: "Hongkong", land: "China", lat: 22.2818, lon: 114.1583, aka: ["hong kong"] },
  // Ozeanien
  { slug: "sydney", ort: "Sydney", land: "Australien", lat: -33.8698, lon: 151.2083 },
  { slug: "melbourne", ort: "Melbourne", land: "Australien", lat: -37.8142, lon: 144.9632 },
  { slug: "auckland", ort: "Auckland", land: "Neuseeland", lat: -36.8485, lon: 174.7633 },
  // Amerika
  { slug: "new-york", ort: "New York", land: "USA", lat: 40.7128, lon: -74.006, aka: ["nyc"] },
  { slug: "san-francisco", ort: "San Francisco", land: "USA", lat: 37.7879, lon: -122.4075 },
  { slug: "mexiko-stadt", ort: "Mexiko-Stadt", land: "Mexiko", lat: 19.4326, lon: -99.1332, aka: ["mexico city", "ciudad de mexico", "cdmx"] },
  { slug: "oaxaca", ort: "Oaxaca", land: "Mexiko", lat: 17.0605, lon: -96.7254 },
  { slug: "medellin", ort: "Medellín", land: "Kolumbien", lat: 6.2442, lon: -75.5812 },
  { slug: "bogota", ort: "Bogotá", land: "Kolumbien", lat: 4.6097, lon: -74.0817 },
  { slug: "cusco", ort: "Cusco", land: "Peru", lat: -13.5163, lon: -71.9785, aka: ["cuzco"] },
  { slug: "lima", ort: "Lima", land: "Peru", lat: -12.0551, lon: -77.0265 },
  { slug: "buenos-aires", ort: "Buenos Aires", land: "Argentinien", lat: -34.6096, lon: -58.3888 },
  { slug: "rio", ort: "Rio de Janeiro", land: "Brasilien", lat: -22.93, lon: -43.185, aka: ["rio"] },
];

/** Für die Startseite: eine kleine, gemischte Auswahl */
export const FEATURED = ["lissabon", "barcelona", "hanoi", "chiang-mai", "tokio", "mexiko-stadt", "kapstadt", "prag"];

export const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Beliebte Ziele, deren Name (oder anderer Name) mit der Eingabe beginnt. */
export function matchPopular(q: string): Popular[] {
  const n = norm(q);
  if (n.length < 2) return [];
  return POPULAR.filter((p) => [p.ort, ...(p.aka ?? [])].some((name) => norm(name).startsWith(n)));
}
