# Plan rozbudowy

Odhaczamy w trakcie pracy. Legenda: `[x]` zrobione, `[ ]` do zrobienia, `[~]` w toku.

## Faza 0 – higiena
- [x] 0.1 Jedno źródło wersji (`package.json`) + `tools/build.js` generujący `js/version.js`, `VERSION` i `ASSETS` w `sw.js`
- [x] 0.2 `check-data` pilnuje, że wygenerowane pliki są aktualne
- [x] 0.3 Migracje stanu w `js/store.js` (`MIGRATIONS`) + test importu starego eksportu
- [x] 0.4 Blokada id (`data/ids.lock.json`): żadne id pytania ani fiszki nie może zniknąć
- [x] 0.5 Domyślna `examDate` pusta
- [x] 0.6 Testy jednostkowe (`node --test`) i `npm test`
- [x] 0.7 GitHub Actions: build-check + check-data + testy

## Faza 3a – proces z Claude (zrobione razem z fazą 0)
- [x] 3.1 `CLAUDE.md` z konwencjami
- [x] 3.2 Skill `add-lesson`
- [x] 3.3 Hook: po edycji `data/**/*.json` uruchom `check-data`; allowlista komend

## Faza 1 – model treści
- [x] 1.1 `data/curriculum.json`: moduły → tematy
- [x] 1.2 Paczki per temat (`data/topics/<id>/theory.json` + `questions.json`); ładowane naraz, ale `assemble` pozwala przejść na leniwe ładowanie per moduł
- [x] 1.3 Ekran modułu, strona główna z modułami
- [x] 1.4 `buildExam(scope)` z zakresem
- [x] 1.5 Migracja istniejących danych bez utraty id
- [x] 1.6 Po zmianie układu plików zaktualizować: `currentIds()` (tools/lock-ids.js), `listAssets()` (tools/build.js), skill `add-lesson`, `CLAUDE.md`, README
- [x] 1.7 Wdrożenie na Pages tylko po zielonym `verify` (workflow `verify-and-deploy`, Pages ze źródłem „GitHub Actions”)

## Faza 2 – kod
- [x] 2.1 Ekrany rejestrują własne trasy (`routes` w każdym module ekranu; `app.js` je scala)
- [x] 2.2 Rejestr typów pytań (`js/qtypes.js`: render + ocena + walidacja)
- [x] 2.3 Test dymny tras i typów pytań w jsdom (`tests/routes.test.js`, `tests/quiz-types.test.js`)

## Faza 3b – dalsze skille
- [ ] 3.4 Skill `add-questions`
- [ ] 3.5 Skill/subagent `fact-check-chemistry`

## Faza 4 – opcjonalnie
- [ ] 4.1 Synchronizacja postępu między urządzeniami
- [x] 4.2 Kolejny przedmiot → rozpisane jako Faza 5

## Faza 5 – kolejny przedmiot: angielski (konkurs kuratoryjny, woj. łódzkie)
Wzorzec testów: `docs/angielski-wzorzec-konkursu.md` (oficjalne arkusze Łódzkiego Kuratora Oświaty; własne pytania, bez kopiowania arkuszy).
- [x] 5.0 Szkielet bez zmiany zachowania (wersja 1.11.0, schema v3, nazwa „Powtórka 8”): `data/subjects.json`, chemia → `data/chemia/`, schema v3 (aktywny przedmiot, `examDate` per przedmiot), przełącznik przedmiotu, `check-data`/`lock` po przedmiotach, neutralna nazwa aplikacji (PWA ≠ nazwa przedmiotu)
- [x] 5.1 Silnik zadań konkursowych (wersja 1.12.0): typ `write` (luki, słowotwórstwo, przekształcanie, tłumaczenie – jawne listy odpowiedzi, `keyword`, `maxWords`, normalizacja jak w kluczach), typ `bank` (litery A–I), `choice` ze stałą kolejnością (TRUE/FALSE), grupy zadań z tekstem (`groups`), samoocena w ćwiczeniach, `types` i `idTag` per przedmiot, tekst bez wzorów dla przedmiotów bez cechy `chem`
  - Odłożone do 5.2: samoocena w trybie sprawdzianu (wynik liczy się na końcu, więc wymaga zmiany podsumowania), losowanie całych grup w sprawdzianie, symulacja sprawdzianu w `check-data` dopasowana do przedmiotu (dziś wymaga ≥4 pytań innych niż wybór)
  - Odłożone do 5.3 (razem z treścią): fiszki z przykładowym zdaniem i wymową
- [x] 5.2 Arkusze konkursowe (wersja 1.13.0): `sheets.json` (formaty: czas i 100 pkt; arkusze: zadania z grup i pytań), kontrola zgodności z papierem, tryb „cały arkusz” (strony zadań, timer z zegara, szkic w store – schema v4, wznowienie po przeładowaniu, przegląd z kluczem i samooceną, zatwierdzenie do powtórek), historia wyników osobno per przedmiot i zakres
  - Poza zakresem (świadomie): losowe składanie arkuszy – arkusze są pisane ręcznie w 5.3, bo mają odwzorować układ papierowy; zadania wymagające typów `match`/`blocks` w arkuszu
- [~] 5.3 Treść: etap szkolny → rejonowy (pełne arkusze własne) → wojewódzki
  - [x] Etap szkolny, arkusz 1 (`s-en-sz-01`, wersja 1.14.1): 100 pytań w układzie i na poziomie oficjalnego arkusza 2023/24 (8 zadań, 60 min), działy: czytanie, gramatyka, słownictwo, Wielka Brytania i USA; karty teorii i fiszki bez odpowiedzi z arkusza
  - [x] Etap szkolny: 119 osobnych pytań ćwiczeniowych (wersja 1.14.3): 2 nowe teksty do czytania, gramatyka, słownictwo, kultura – quizy i powtórki działają przed arkuszem
  - [ ] Etap szkolny, kolejne arkusze
  - [x] Etap rejonowy, arkusz 1 (`s-en-rej-01`, wersja 1.14.5): 100 pytań w układzie arkusza 2025/26 (90 min, 8 zadań: TRUE/FALSE, tekst z brakującymi zdaniami, tekst z lukami, słowotwórstwo, przekształcanie zdań, synonimy, tłumaczenie, święta UK/USA); działy w module „Etap rejonowy”, karty i fiszki
  - [ ] Etap rejonowy: osobne pytania ćwiczeniowe (dziś działy rejonowe mają tylko teorię, fiszki i arkusz) i kolejne arkusze
  - [x] Etap wojewódzki, arkusz 1 (`s-en-woj-01`, wersja 1.14.7): 100 pytań w układzie arkusza 2024/25 (120 min, 9 zadań: wybór A–D do tekstu, „który akapit”, tekst z lukami, idiomy, przekształcanie zdań, słowotwórstwo w tekście, tłumaczenie na angielski, gramatyka A–D, sławni ludzie i kraje); nowy rodzaj zadania `paragraph-matching`, kompaktowe przyciski dla krótkich odpowiedzi, do 6 odpowiedzi w `choice`
  - [ ] Etap wojewódzki: osobne pytania ćwiczeniowe oraz zadania z arkusza 2023/24 (trójki zdań z jednym słowem, wyrazy z ramki, życiorysy)
  - [x] Pytania z arkusza są ukryte w ćwiczeniach do pierwszego zatwierdzenia arkusza (`js/practice.js`). Skutek: w angielskim są teraz tylko teoria, fiszki i arkusz – quizy działów pojawią się po zatwierdzeniu arkusza 1 albo po dopisaniu osobnych pytań ćwiczeniowych
- [ ] 5.4 Skille: `add-lesson` i fact-check per przedmiot; kontrola „jedna poprawna odpowiedź”, poziom, naturalność zdań
