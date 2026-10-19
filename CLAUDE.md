# Chemia 8 – wskazówki dla Claude

PWA (czysty HTML/CSS/JS, ES modules, bez bibliotek i backendu) do powtórek z chemii dla ucznia klasy 8.
Działa offline, postęp w `localStorage`. Szczegóły formatu danych: `README.md`. Plan prac: `ROADMAP.md`.

## Komendy
- `npm run verify` – komplet kontroli (build aktualny + `check-data` + testy). **Uruchom przed zakończeniem pracy.**
- `npm run check` – kontrola danych (bilans równań, format pytań, id, sprawdzian).
- `npm test` – testy jednostkowe (`tests/*.test.js`, `node --test`).
- `npm run build` – regeneruje `js/version.js` oraz `VERSION`/`ASSETS` w `sw.js`.
- `npm run bump` – podbija wersję patch w `package.json` i buduje (po każdej zmianie, którą ma zobaczyć użytkownik).
- `npm run lock` – dopisuje nowe id pytań/fiszek do `data/ids.lock.json`.
- Serwer lokalnie: `python3 -m http.server 8000`.

## Zasady, których nie wolno złamać
1. **Id są niezmienne.** Postęp ucznia jest zapisany pod `id` pytań i fiszek. Nigdy ich nie zmieniaj, nie przenumerowuj i nie przenoś między działami.
   Usuwanie pytania = świadoma decyzja (`npm run lock -- --prune`), uzgodnij z użytkownikiem.
2. **Nie edytuj ręcznie** `js/version.js` ani bloku `ASSETS`/`VERSION` w `sw.js` – są generowane. Zmieniasz wersję przez `npm run bump`.
3. **Po zmianie danych** w `data/**/*.json` uruchom `npm run check`; po dodaniu nowych id – `npm run lock`.
4. **Zmiana kształtu danych w `localStorage`** wymaga: podniesienia `SCHEMA_VERSION` w `js/store.js`, dopisania migracji w `MIGRATIONS` i testu w `tests/store.test.js`. Klucza `chemia8.v1` nie zmieniaj.
5. **Nowy plik `.js`/`.json`/`.css`** trafia do cache offline automatycznie po `npm run build` – nie dopisuj go ręcznie do `sw.js`.
6. **Fakty chemiczne:** nie zgaduj. Wątpliwości zapisuj w `DO-SPRAWDZENIA.md` zamiast wstawiać do treści.
7. `materialy-prywatne/` (zdjęcia zeszytu ucznia) jest w `.gitignore` – wolno z niego czerpać wiedzę, ale nigdy nie commituj ani nie kopiuj tych plików do repo.

## Konwencje
- Język treści i interfejsu: polski. Kod i komentarze: zgodnie z istniejącym stylem (polskie komentarze, krótko).
- Wzory w tekstach w `$…$` (`$Ca(OH)2$`, `$Ca^2+$`, `$2Na + 2H2O -> 2NaOH + H2↑$`). Wzór celowo niezbilansowany: `$!…$`.
- Id: `q-<skrót działu>-NNN` (pytania), `f-<skrót>-NN` (fiszki), `t-<skrót>-NN` (karty teorii). Skrót bierz z istniejących w danym dziale.
- Pytanie: pole `explain` obowiązkowe (min. 15 znaków), `level` 1–3, bez powtórzonych treści pytań. Mieszaj typy pytań (nie same `choice`).
- Dane składa `js/curriculum.js` (`assemble`); ekrany to moduły w `js/` (`renderXxx(data)` zwraca węzeł DOM), trasy w tablicy `routes` w `js/app.js`. DOM budujemy przez `h()` z `js/dom.js`, nigdy przez `innerHTML` z danymi użytkownika.
- Dostępność: `aria-*`, `visually-hidden`, obsługa klawiatury i dotyku (docelowo iPad).

## Nowa lekcja / dział
Użyj skilla `/add-lesson`. Ręcznie: wpis działu w `data/curriculum.json` (w odpowiednim module), katalog `data/topics/<id>/`
z `theory.json` (`cards`, `flash`) i `questions.json`, ewentualnie równania/doświadczenia → `npm run lock` → `npm run bump` → `npm run verify`.
Dział wynika z katalogu paczki – nie wpisuj pola `topic` w kartach, fiszkach ani pytaniach.
