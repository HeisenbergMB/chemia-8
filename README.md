# Chemia 8 – powtórka do sprawdzianu

Aplikacja PWA (czysty HTML/CSS/JS, bez bibliotek i bez backendu) do nauki chemii w klasie 8.
Działa offline, zapisuje postęp w `localStorage` (z eksportem/importem w Ustawieniach).

## Uruchomienie lokalnie
```
python3 -m http.server 8000      # i otwórz http://localhost:8000
```

## Dane (`data/`)
| Plik | Zawartość |
|---|---|
| `theory.json` | `topics` (działy), `cards` (karty teorii), `flash` (fiszki) |
| `questions.json` | pytania |
| `equations.json` | równania reakcji (sprawdzane pod kątem bilansu) |
| `experiments.json` | doświadczenia do laboratorium (probówki, sód z wodą) |
| `indicators.json` | tabela barw wskaźników (z niej powstają też pytania) |

### Zapis wzorów w tekstach
Wzory wpisujemy między `$…$`: `$Ca(OH)2$`, `$Ca^2+$`, `$OH^-$`, `$2Na + 2H2O -> 2NaOH + H2↑$`.
Cyfra po symbolu lub nawiasie staje się indeksem dolnym, `^2+` – górnym, `-H2O->` rysuje H₂O nad strzałką.
Wzór zaczynający się od `!` (np. `$!Ca + H2O -> …$`) jest celowo niezbilansowany i pomijany przez kontrolę.
Skrypt traktuje też jako szablony fragmenty z `?` i równania urwane na strzałce.

### Typy pytań (`questions.json`)
Wspólne pola: `id` (unikalne), `topic`, `type`, `level` (1–3), `q`, `explain`; opcjonalnie `hint` (podpowiedź, niewidoczna na sprawdzianie).
- `choice` – `options` (2–5), `answer` (indeks poprawnej).
- `formula` – `answer` (np. `"Ca^2+"`), opcjonalnie `accept` (inne dopuszczalne zapisy).
- `equation` – `answer` (całe równanie, np. `"NaOH -> Na^+ + OH^-"`); kolejność składników po jednej stronie nie ma znaczenia, strzałki ↑ i ↓ są ignorowane.
- `blocks` – `tokens` (poprawna kolejność klocków, np. `["NaOH","->","Na^+","+","OH^-"]`), `extra` (klocki-pułapki).
- `match` – `pairs` (`[[lewa, prawa], …]`), `extra` (dodatkowe odpowiedzi-pułapki). Prawe strony muszą być unikalne.

## Kontrola danych
Po **każdej** zmianie danych:
```
node tools/check-data.js
```
Sprawdza m.in. bilans atomów i ładunków każdego równania (też w pytaniach i klockach), format pytań,
unikalność identyfikatorów i treści pytań, tabelę wskaźników oraz symuluje 300 losowań sprawdzianu.

## Wersje i cache
Po zmianie dowolnego pliku podnieś `VERSION` w `sw.js` oraz `APP_VERSION` w `js/app.js`
(service worker trzyma stary cache do czasu zmiany wersji). Na iPadzie: Ustawienia → „Odśwież aplikację”.
Nowy plik `.js`/`.json` dopisz też do listy `ASSETS` w `sw.js` (kontrola sprawdza, czy pliki istnieją).

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / `(root)`. Wszystkie ścieżki są względne.

## Prywatne materiały
Folder `materialy-prywatne/` jest w `.gitignore` i nie trafia do repozytorium.
Wątpliwe fakty chemiczne zbiera `DO-SPRAWDZENIA.md`.
