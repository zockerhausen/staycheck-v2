# StayCheck – Projektbeschreibung

## Idee
StayCheck hilft Backpackern und Reisenden, den **passenden Bezirk (Kiez)** in einer Stadt zu finden
und Bezirke miteinander zu **vergleichen**. Start: **Berlin**.

## Kernfunktionen
1. **Finden** (`/finden` → `/ergebnisse`): Nutzer gewichtet 7 Kriterien von 0 (egal) bis 5 (unverzichtbar).
   Jeder Bezirk bekommt einen Match in Prozent.
2. **Vergleichen** (`/vergleich`): zwei Bezirke nebeneinander, Kriterium für Kriterium.
3. **Konto** (`/login`): Anmelden/Registrieren per E-Mail + Passwort. Gespeichert werden Präferenzen und Favoriten (`/favoriten`).

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

Öffentliche Daten sind für alle lesbar, Nutzerdaten nur für den jeweiligen Nutzer (Row Level Security).

## Nächste Schritte (Ideen)
- Bewertungen der Berliner Bezirke überprüfen und verfeinern
- Karte mit den Bezirken
- Zweite Stadt
- Detailseite pro Bezirk (Tipps, Hostels, Anbindung)
