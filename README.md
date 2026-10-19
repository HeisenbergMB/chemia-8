# Chemia 8 – powtórka do sprawdzianu

Aplikacja PWA (czysty HTML/CSS/JS, bez bibliotek i bez backendu) do nauki chemii w klasie 8.
Działa offline, zapisuje postęp w `localStorage` (z eksportem/importem w Ustawieniach).

## Uruchomienie lokalnie
```
python3 -m http.server 8000      # i otwórz http://localhost:8000
```

## Dane (`data/`)
Program to **moduły → działy (tematy)**. Treść każdego działu jest w osobnej paczce; `js/curriculum.js` składa całość
(ta sama funkcja działa w aplikacji, w narzędziach i w testach).

| Plik | Zawartość |
|---|---|
| `curriculum.json` | `modules[]` → `topics[]` (`id`, `title`, `desc`, `status` `active`/`soon`, opcjonalnie `labs`, `tools`). Kolejność = numeracja w menu |
| `topics/<id>/theory.json` | `cards` (karty teorii) i `flash` (fiszki) działu |
| `topics/<id>/questions.json` | pytania działu |
| `equations.json` | równania reakcji (tylko do kontroli bilansu; pole `topic` wskazuje dział) |
| `experiments.json` | doświadczenia do laboratorium (probówki, sód z wodą) |
| `indicators.json` | tabela barw wskaźników (z niej powstają też pytania) |
| `solubility.json` | tabela rozpuszczalności |
| `ids.lock.json` | blokada id pytań i fiszek (generowana: `npm run lock`) |

W paczkach **nie wpisujemy pola `topic`** – dział wynika z katalogu (kontrola zgłasza je jako błąd).
Nowy dział = wpis w `curriculum.json` + katalog `topics/<id>/` z dwoma plikami. Aktywny dział musi mieć karty i pytania.
Sprawdzian można losować z całości (`#/exam`) albo z modułu (`#/module/<id>/exam`).

### Zapis wzorów w tekstach
Wzory wpisujemy między `$…$`: `$Ca(OH)2$`, `$Ca^2+$`, `$OH^-$`, `$2Na + 2H2O -> 2NaOH + H2↑$`.
Cyfra po symbolu lub nawiasie staje się indeksem dolnym, `^2+` – górnym, `-H2O->` rysuje H₂O nad strzałką.
Wzór zaczynający się od `!` (np. `$!Ca + H2O -> …$`) jest celowo niezbilansowany i pomijany przez kontrolę.
Skrypt traktuje też jako szablony fragmenty z `?` i równania urwane na strzałce.

### Typy pytań (`topics/<id>/questions.json`)
Wspólne pola: `id` (unikalne), `type`, `level` (1–3), `q`, `explain`; opcjonalnie `hint` (podpowiedź, niewidoczna na sprawdzianie).
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
Wersja żyje w jednym miejscu: `package.json`. Po zmianie, którą ma zobaczyć użytkownik, uruchom `npm run bump`
– `tools/build.js` zaktualizuje `js/version.js` oraz `VERSION` i listę `ASSETS` w `sw.js` (service worker trzyma
stary cache do czasu zmiany wersji). Nowe pliki `.js`/`.json`/`.css` trafiają do cache same. Nie edytuj tych wartości ręcznie.
Na iPadzie: Ustawienia → „Odśwież aplikację”.

## Kontrole i testy
`npm run verify` = aktualność plików generowanych + `check-data` + testy jednostkowe (`tests/`). To samo robi GitHub Actions.
`data/ids.lock.json` blokuje id pytań i fiszek (postęp ucznia jest zapisany pod nimi): po dodaniu treści `npm run lock`.
Zmiana kształtu zapisanych danych wymaga migracji w `js/store.js` (`SCHEMA_VERSION`, `MIGRATIONS`).

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / `(root)`. Wszystkie ścieżki są względne.

## Prywatne materiały
Folder `materialy-prywatne/` jest w `.gitignore` i nie trafia do repozytorium.
Wątpliwe fakty chemiczne zbiera `DO-SPRAWDZENIA.md`.
