# StayCheck – Projektbeschreibung

## Idee
StayCheck hilft Backpackern und Reisenden, **dort zu schlafen, wo es passt**. Zwei Wege:
- **Ich hab schon ein Hotel** → Lage-Check: Adresse/Hotel eingeben, die Umgebung wird bewertet (funktioniert weltweit).
- **Ich suche noch** → Quiz → passender Kiez → Unterkünfte im Kiez, sortiert nach Lage-Score.
Start: **Berlin** (Kiez-Bewertungen). Lage-Check nutzt OpenStreetMap und geht in jeder Stadt.

## Kernfunktionen (Mobile first)
1. **Quiz** (`/quiz`): 7 Fragen, eine pro Bildschirm, große Antwort-Kacheln, Fortschrittsbalken (Duolingo-Prinzip).
   Jede Antwort setzt ein Gewicht 0–5 (siehe `src/lib/quiz.ts`).
2. **Ergebnis** (`/ergebnis`): großer Reveal-Moment (Zahl zählt hoch, Konfetti), Berlin-Karte mit allen Kiezen,
   wischbare Karten, „Ergebnis teilen“ als Story-Bild (`/api/teilen`), „Ergebnis speichern“.
3. **Duell** (`/duell`): zwei Kieze im VS-Modus, 7 Runden, Sieger nach persönlichem Match.
4. **Lage-Check** (`/check` → `/check/ergebnis`): Suche mit Vorschlägen (Photon), Umgebung per Overpass (`src/lib/geo.ts`):
   Bahn-Entfernung, Bars, Restaurants, Parks, Hauptstraßen, Hostels. Ergebnis: Lage-Score, Urteil (Top-Lage … Eher abseits), Highlights.
5. **Kiez-Seite mit Unterkünften** (`/kiez/[slug]`): Hotels/Hostels/Pensionen aus OpenStreetMap, jede mit Lage-Score, Link zu Booking.com.
6. **Konto** (`/login`, `/konto`, `/favoriten`): E-Mail + Passwort. Gespeichert werden Präferenzen, gemerkte Kieze und Unterkünfte (`saved_places`).

## Produkt-Prinzipien
- Erst den Erfolgsmoment liefern, dann um etwas bitten (Konto, später App-Bewertung). Inspiriert von @ayoships.
- Keine Dark Patterns: Ergebnisse sind ehrlich berechnet, keine manipulierten Bewertungen.
- Teilbar machen (Spotify-Wrapped-Prinzip).

## Design „Sonnenpass“
Warm, satt, elegant, ein bisschen abenteuerlich. Farben in `src/app/globals.css`:
sand (Hintergrund), paper (Karten), tan, line, ink (Text), muted, sun (Orange, Hauptfarbe), sun-dark, peach, peach-ink.
Schriften: Bricolage Grotesque (Überschriften), DM Sans (Text). Dicke „eindrückbare“ Knöpfe: Klasse `btn-chunky`.
**Eigenes Icon-Set** in `src/lib/icons.ts` (Komponente `<Icon name=… />`), keine Emojis verwenden.
Karte: MapLibre mit kostenlosen OpenFreeMap-Kacheln (kein API-Schlüssel).

## Kriterien
budget, nightlife, quiet, safety, transit, food, nature – Bewertung je Bezirk 1–10.

## Matching
`match = Σ(gewicht × score) / Σ(gewicht × 10) × 100` – siehe `src/lib/matching.ts`.

## Technik
- Next.js 15 (App Router, TypeScript), Tailwind CSS 4
- Supabase (Postgres + Auth), Projekt `staycheck-v2`
- Hosting: Vercel, Code auf GitHub

## Datenbank (Supabase)
| Tabelle | Inhalt |
|---|---|
| cities | Städte |
| districts | Bezirke einer Stadt |
| criteria | die 7 Kriterien |
| district_scores | Bewertung 1–10 pro Bezirk & Kriterium |
| profiles | Profil pro Nutzer (automatisch bei Registrierung) |
| user_preferences | Gewichte 0–5 pro Nutzer & Kriterium |
| favorites | gemerkte Bezirke pro Nutzer |
| saved_places | gemerkte Unterkünfte/Adressen pro Nutzer |

Öffentliche Daten sind für alle lesbar, Nutzerdaten nur für den jeweiligen Nutzer (Row Level Security).

## Nächste Schritte (Ideen)
- Bewertungen der Berliner Bezirke überprüfen und verfeinern
- Zweite Stadt
- Detailseite pro Bezirk (Tipps, Hostels, Anbindung)
