# Chemia 8 – powtórka do sprawdzianu

Aplikacja PWA (czysty HTML/CSS/JS, bez bibliotek i bez backendu) do nauki chemii w klasie 8.
Działa offline, zapisuje postęp w `localStorage`.

## Uruchomienie lokalnie
```
python3 -m http.server 8000      # i otwórz http://localhost:8000
```

## Dane
Wszystko w `data/`: `theory.json` (działy, teoria, fiszki), `questions.json`, `equations.json`.
Wzory w tekstach zapisujemy między `$...$`, np. `$Ca(OH)2$`, `$Ca^2+$`, `$2Na + 2H2O -> 2NaOH + H2↑$`.
Wzór zaczynający się od `!` (np. `$!Ca + H2O -> ...$`) jest celowo niezbilansowany.

Po każdej zmianie danych:
```
node tools/check-data.js
```
Skrypt sprawdza bilans atomów i ładunków równań, format pytań i unikalność identyfikatorów.

## Wersje i cache
Po zmianie dowolnego pliku podnieś `VERSION` w `sw.js` oraz `APP_VERSION` w `js/app.js`.
Na iPadzie: Ustawienia → „Odśwież aplikację”.

## GitHub Pages
Settings → Pages → Deploy from branch → `main` / `(root)`. Wszystkie ścieżki są względne.

## Prywatne materiały
Folder `materialy-prywatne/` jest w `.gitignore` i nie trafia do repozytorium.
