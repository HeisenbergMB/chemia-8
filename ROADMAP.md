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
- [ ] 5.1 Silnik zadań konkursowych: typy z repertuaru (open-cloze, key-word, word-formation, first-letter, gapped-text, tf, …) w `QTYPES`, listy akceptowanych odpowiedzi, samoocena, zadania z tekstem (`passage`)
- [ ] 5.2 Format testu: szablony arkuszy per etap (czas 60/90/120 min, 100 pkt, sekcje z repertuaru), tryb „cały arkusz” z licznikiem czasu
- [ ] 5.3 Treść: etap szkolny → rejonowy (pełne arkusze własne) → wojewódzki
- [ ] 5.4 Skille: `add-lesson` i fact-check per przedmiot; kontrola „jedna poprawna odpowiedź”, poziom, naturalność zdań
