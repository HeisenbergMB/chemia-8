# Powtórka 8 – wskazówki dla Claude

PWA (czysty HTML/CSS/JS, ES modules, bez bibliotek i backendu) do powtórek do sprawdzianów i konkursów dla ucznia klasy 8.
Przedmioty: chemia (gotowa) i angielski (konkurs kuratoryjny, w budowie – `ROADMAP.md` Faza 5, wzorzec: `docs/angielski-wzorzec-konkursu.md`).
Działa offline, postęp w `localStorage`. Szczegóły formatu danych: `README.md`. Plan prac: `ROADMAP.md`.

## Komendy
- `npm ci` (raz po sklonowaniu) – instaluje jsdom do testów ekranów. Aplikacja nie ma zależności uruchomieniowych.
- `npm run verify` – komplet kontroli (build aktualny + `check-data` + testy). **Uruchom przed zakończeniem pracy.**
- `npm run check` – kontrola danych (bilans równań, format pytań, id, sprawdzian).
- `npm test` – testy jednostkowe (`tests/*.test.js`, `node --test`).
- `npm run build` – regeneruje `js/version.js` oraz `VERSION`/`ASSETS` w `sw.js`.
- `npm run bump` – podbija wersję patch w `package.json` i buduje. **Po każdej zmianie plików aplikacji** (`js/`, `css/`, `data/`, `index.html`) – także po refaktorze, inaczej stary cache offline zostaje na urządzeniu.
- `npm run lock` – dopisuje nowe id pytań/fiszek do `data/ids.lock.json`.
- Serwer lokalnie: `python3 -m http.server 8000`.

## Zasady, których nie wolno złamać
1. **Id są niezmienne.** Postęp ucznia jest zapisany pod `id` pytań i fiszek. Nigdy ich nie zmieniaj, nie przenumerowuj i nie przenoś między działami.
   Usuwanie pytania = świadoma decyzja (`npm run lock -- --prune`), uzgodnij z użytkownikiem.
2. **Nie edytuj ręcznie** `js/version.js` ani bloku `ASSETS`/`VERSION` w `sw.js` – są generowane. Zmieniasz wersję przez `npm run bump`.
3. **Po zmianie danych** w `data/**/*.json` uruchom `npm run check`; po dodaniu nowych id – `npm run lock`.
4. **Zmiana kształtu danych w `localStorage`** wymaga: podniesienia `SCHEMA_VERSION` w `js/store.js`, dopisania migracji w `MIGRATIONS` i testu w `tests/store.test.js`. Klucza `chemia8.v1` ani prefiksu cache `chemia8-` nie zmieniaj (to wewnętrzne identyfikatory sprzed zmiany nazwy aplikacji na „Powtórka 8”).
5. **Nowy plik `.js`/`.json`/`.css`** trafia do cache offline automatycznie po `npm run build` – nie dopisuj go ręcznie do `sw.js`.
6. **Fakty chemiczne:** nie zgaduj. Wątpliwości zapisuj w `DO-SPRAWDZENIA.md` zamiast wstawiać do treści.
7. `materialy-prywatne/` (zdjęcia zeszytu ucznia) jest w `.gitignore` – wolno z niego czerpać wiedzę, ale nigdy nie commituj ani nie kopiuj tych plików do repo.

## Konwencje
- Język treści i interfejsu: polski. Kod i komentarze: zgodnie z istniejącym stylem (polskie komentarze, krótko).
- Wzory w tekstach w `$…$` (`$Ca(OH)2$`, `$Ca^2+$`, `$2Na + 2H2O -> 2NaOH + H2↑$`). Wzór celowo niezbilansowany: `$!…$`.
- Id są unikalne w całej aplikacji, także między przedmiotami. Angielski ma `idTag: "en"` w `subjects.json`: `q-en-<dział>-NNN`, `f-en-…`, `t-en-…`, `g-en-…` (kontrola to wymusza). Chemia: `q-<skrót działu>-NNN` (pytania), `f-<skrót>-NN` (fiszki), `t-<skrót>-NN` (karty teorii). Skrót bierz z istniejących w danym dziale.
- Pytanie: pole `explain` obowiązkowe (min. 15 znaków), `level` 1–3, bez powtórzonych treści pytań. Mieszaj typy pytań (nie same `choice`).
- Dane przedmiotu leżą w `data/<przedmiot>/` (lista: `data/subjects.json`, cechy przedmiotu w `features`). Składa je `js/curriculum.js` (`assemble`), trzyma `js/data.js` (`DATA` = aktywny przedmiot). Funkcje tylko dla chemii (`lab`, `indicators`, `solubility`, `valence`) mają trasy włączane cechą `chem` w `js/app.js` (`featureRoutes`). Ekrany: `js/screens/*.js` oraz moduły funkcji (`lab`, `indicators`, `solubility`, `valence`); każdy eksportuje własne `routes` (`[wyrażenie, funkcja]`), a `js/app.js` je tylko scala. Zależności idą w jedną stronę: `app.js → ekrany → data/ui` – ekran nigdy nie importuje `app.js`.
- **Nowy ekran** = plik z `routes` + jedna linia w `coreRoutes` w `app.js` (ekran dostępny w każdym przedmiocie) albo w `featureRoutes` (ekran włączany cechą przedmiotu). Test `tests/routes.test.js` przejdzie po wszystkich linkach i wykryje nieistniejącą trasę lub trasę zasłoniętą przez inną.
- Typy pytań dozwolone w przedmiocie: `types` w `data/subjects.json`. Zadania z tekstem/bankiem odpowiedzi: `groups` w `theory.json` + pole `group` w pytaniu (README).
- **Nowy typ pytania** = jeden wpis w `QTYPES` (`js/qtypes.js`: walidacja, rysowanie, ocena) + przypadki w `tests/qtypes.test.js`. Nie twórz drugiej listy typów gdzie indziej. DOM budujemy przez `h()` z `js/dom.js`, nigdy przez `innerHTML` z danymi użytkownika.
- Dostępność: `aria-*`, `visually-hidden`, obsługa klawiatury i dotyku (docelowo iPad).

## Nowa lekcja / dział
Użyj skilla `/add-lesson`. Ręcznie: wpis działu w `data/<przedmiot>/curriculum.json` (w odpowiednim module), katalog `data/<przedmiot>/topics/<id>/`
z `theory.json` (`cards`, `flash`) i `questions.json`, ewentualnie równania/doświadczenia → `npm run lock` → `npm run bump` → `npm run verify`.
Dział wynika z katalogu paczki – nie wpisuj pola `topic` w kartach, fiszkach ani pytaniach.
