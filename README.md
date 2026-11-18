# Powtórka 8

Aplikacja PWA (czysty HTML/CSS/JS, bez bibliotek i bez backendu) do powtórek do sprawdzianów i konkursów w klasie 8.
Obsługuje wiele przedmiotów: chemia (klasa 8) oraz angielski (konkurs kuratoryjny, woj. łódzkie: pełne arkusze etapów szkolnego, rejonowego i wojewódzkiego – `ROADMAP.md`, Faza 5).
Działa offline, zapisuje postęp w `localStorage` (z eksportem/importem w Ustawieniach).

## Uruchomienie lokalnie
```
python3 -m http.server 8000      # i otwórz http://localhost:8000
```

## Dane (`data/`)
Struktura: **przedmioty → moduły → działy (tematy)**. Lista przedmiotów jest w `data/subjects.json`, a dane każdego
w katalogu `data/<przedmiot>/`. Treść działu jest w osobnej paczce; `js/curriculum.js` składa całość
(ta sama funkcja działa w aplikacji, w narzędziach i w testach). Aplikacja trzyma w pamięci dane jednego, wybranego przedmiotu.

| Plik | Zawartość |
|---|---|
| `subjects.json` | `subjects[]`: `id`, `title`, `desc`, `icon`, `status` (`active`/`soon`), `features` (np. `chem` włącza laboratorium, wskaźniki, tabelę rozpuszczalności i wartościowość) |
| `<przedmiot>/curriculum.json` | `modules[]` → `topics[]` (`id`, `title`, `desc`, `status` `active`/`soon`, opcjonalnie `labs`, `tools`). Kolejność = numeracja w menu |
| `<przedmiot>/topics/<id>/theory.json` | `cards` (karty teorii) i `flash` (fiszki) działu |
| `<przedmiot>/topics/<id>/questions.json` | pytania działu |
| `chemia/equations.json` | równania reakcji (tylko do kontroli bilansu; pole `topic` wskazuje dział) |
| `chemia/experiments.json` | doświadczenia do laboratorium (probówki, sód z wodą) |
| `chemia/indicators.json` | tabela barw wskaźników (z niej powstają też pytania) |
| `chemia/solubility.json` | tabela rozpuszczalności |
| `ids.lock.json` | blokada id pytań i fiszek wszystkich przedmiotów (generowana: `npm run lock`) |

Id kart, fiszek i pytań są **unikalne w całej aplikacji** (każdy przedmiot ma własny skrót w id), bo postęp ucznia
jest zapisany pod samym id. W paczkach **nie wpisujemy pola `topic`** – dział wynika z katalogu (kontrola zgłasza je jako błąd).
Nowy dział = wpis w `<przedmiot>/curriculum.json` + katalog `topics/<id>/` z dwoma plikami. Aktywny dział musi mieć karty i pytania.
Nowy przedmiot = wpis w `subjects.json` + katalog `data/<id>/` z `curriculum.json`; do czasu pierwszej treści ma status `soon`.
Przełączanie przedmiotu: menu boczne / ekran główny (`#/subject/<id>`). Data sprawdzianu i historia wyników są osobne dla każdego przedmiotu.
Sprawdzian można losować z całości (`#/exam`) albo z modułu (`#/module/<id>/exam`).

### Arkusze konkursowe (`<przedmiot>/sheets.json`, cecha `sheets`)
Pełny test w układzie z konkursu: zadania jedno po drugim, wszystkie pytania zadania na jednej stronie, powroty i poprawki, czas liczony od startu.
```
{ "formats": [{ "id", "title", "minutes", "points" }],                      // etap: czas i suma punktów (100)
  "sheets":  [{ "id": "s-en-…", "format", "title",
                "tasks": [{ "kind", "group"?, "instruction"?, "items": ["q-en-…", …] }] }] }
```
Pytania i grupy leżą w paczkach działów, arkusz tylko ustawia je w kolejności z arkusza. Zadanie ma `group` (polecenie, tekst, bank) albo własne `instruction`.
`kind` – rodzaj zadania z `TASK_KINDS` w `js/sheets.js` (opis wzorca: `docs/angielski-wzorzec-konkursu.md`). W arkuszu działają typy `choice`, `write`, `bank`
(punkt za pytanie, `points` – inna punktacja). Zadanie z ramką wyrazów to grupa z `bank` (do 16 wyrazów, wyświetlana jako lista) i pytania `write` z formą wyrazu; zadanie „który akapit” lub „która osoba” to `choice` z opcjami `1`–`6` albo `A`–`E` (w arkuszu przyciski). Kontrola sprawdza m.in.: suma punktów = `points` formatu, brak powtórzeń, zgodność grup, numery luk w tekście = pola `gap` pytań (`(0)` to przykład).
**Pytania z arkusza są ukryte w ćwiczeniach** (quiz działu, powtórka na dziś, ćwiczenie dodatkowe, postęp) do pierwszego zatwierdzenia wyniku tego arkusza – `js/practice.js`; pierwsze podejście jest więc „na zimno”. Pytania wspólne dla kilku arkuszy czekają na zatwierdzenie wszystkich. Pytania ćwiczeniowe spoza arkuszy są dostępne od razu.
Rozpoczęty arkusz zapisuje się sam (`draft` w `localStorage`) i przeżywa przeładowanie; czas płynie od startu także przy zamkniętej aplikacji. Po zakończeniu odpowiedzi są zablokowane;
w przeglądzie uczeń może uznać własną poprawną odpowiedź (`write`), a dopiero „Zatwierdź wynik” zapisuje pytania do powtórek i wynik do historii.

### Zapis wzorów w tekstach
Wzory wpisujemy między `$…$`: `$Ca(OH)2$`, `$Ca^2+$`, `$OH^-$`, `$2Na + 2H2O -> 2NaOH + H2↑$`.
Cyfra po symbolu lub nawiasie staje się indeksem dolnym, `^2+` – górnym, `-H2O->` rysuje H₂O nad strzałką.
Wzór zaczynający się od `!` (np. `$!Ca + H2O -> …$`) jest celowo niezbilansowany i pomijany przez kontrolę.
Skrypt traktuje też jako szablony fragmenty z `?` i równania urwane na strzałce.
Wzory `$…$` działają tylko w przedmiotach z cechą `chem`; w pozostałych `$` jest zwykłym znakiem (np. `$750,000`).
W każdym tekście: `**pogrubienie**`, `++podkreślenie++`, nowa linia = `\n`.

### Typy pytań (`topics/<id>/questions.json`)
Wspólne pola: `id` (unikalne), `type`, `level` (1–3), `q`, `explain`; opcjonalnie `hint` (podpowiedź, niewidoczna na sprawdzianie).
- `choice` – `options` (2–6; krótkie odpowiedzi typu numer akapitu czy tak/nie są w arkuszu przyciskami z samą treścią), `answer` (indeks poprawnej).
- `formula` – `answer` (np. `"Ca^2+"`), opcjonalnie `accept` (inne dopuszczalne zapisy).
- `equation` – `answer` (całe równanie, np. `"NaOH -> Na^+ + OH^-"`); kolejność składników po jednej stronie nie ma znaczenia, strzałki ↑ i ↓ są ignorowane.
- `blocks` – `tokens` (poprawna kolejność klocków, np. `["NaOH","->","Na^+","+","OH^-"]`), `extra` (klocki-pułapki).
- `match` – `pairs` (`[[lewa, prawa], …]`), `extra` (dodatkowe odpowiedzi-pułapki). Prawe strony muszą być unikalne.
- `write` – odpowiedź wpisana jako zwykły tekst (luki, słowotwórstwo, przekształcanie zdań, tłumaczenie): `answers` – **jawna, płaska lista** akceptowanych odpowiedzi
  (warianty z klucza rozpisujemy ręcznie, np. `["mind if I turn up", "mind my turning up"]`); opcjonalnie `keyword` (wyraz kluczowy, musi wystąpić w każdej odpowiedzi
  w niezmienionej formie; dozwolona jest jego skrócona forma przeczna, np. `shouldn't`, więc klucz zapisujemy w obu wariantach) i `maxWords` (limit wyrazów wliczając wyraz kluczowy, jak w poleceniach konkursu; skrócenie typu `hasn't` to jeden wyraz).
  Porównanie ignoruje wielkość liter, nadmiarowe spacje, końcową kropkę i apostrofy typograficzne (iPad); pisownia i łączniki są ścisłe.
  Przy błędzie uczeń widzi klucz i może uznać swoją odpowiedź za poprawną – dopiero wtedy wynik trafia do powtórek.
- `bank` – wybór z banku odpowiedzi zadania (fragmenty A–I, osoby A–E): `group` (grupa z `bank`), `answer` (indeks w banku). Kolejność banku jest stała.
- `choice` z `fixed: true` – stała kolejność odpowiedzi (np. `["TRUE","FALSE"]`).

Który przedmiot może używać których typów: `types` w `subjects.json` (kontrola to wymusza).

### Zadania ze wspólnym tekstem (`groups` w `topics/<id>/theory.json`)
Zadania z arkuszy (tekst + kilka pytań, wspólny bank odpowiedzi) opisuje grupa: `{ id, instruction, text?, bank? }`. Pytania odwołują się do niej polem `group`
(i `gap`, gdy dotyczą luki oznaczonej w tekście jako `(3)___`). Na szerokim ekranie tekst jest obok pytania, bieżąca luka jest zaznaczona.
`topic` w grupie, tak jak w pytaniach, wynika z katalogu paczki.

## Architektura kodu
`js/app.js` (start, router, menu) → ekrany (`js/screens/`, `lab.js`, `indicators.js`, `solubility.js`, `valence.js`; każdy eksportuje `routes`) → `js/data.js` (`DATA`) i `js/ui.js`.
Typy pytań są zebrane w rejestrze `js/qtypes.js` (walidacja + rysowanie + ocena w jednym miejscu).
Testy ekranów (`tests/routes.test.js`, `tests/quiz-types.test.js`) uruchamiają prawdziwą aplikację w jsdom – bez przeglądarki. Po sklonowaniu: `npm ci`.

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
Wdrożenie robi workflow `.github/workflows/verify.yml`: po pushu na `main` najpierw `npm run verify`, dopiero potem publikacja
(Settings → Pages → Source: **GitHub Actions**). Czerwone `verify` = brak wdrożenia. Wszystkie ścieżki są względne.

## Prywatne materiały
Folder `materialy-prywatne/` jest w `.gitignore` i nie trafia do repozytorium.
Wątpliwe fakty chemiczne zbiera `DO-SPRAWDZENIA.md`.
