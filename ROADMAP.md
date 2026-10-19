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

## Faza 1 – model treści (następny krok)
- [ ] 1.1 `data/curriculum.json`: moduły → tematy
- [ ] 1.2 Paczki per temat (`theory`, `questions`, `flash`), leniwe ładowanie
- [ ] 1.3 Ekran modułu, strona główna z modułami
- [ ] 1.4 `buildExam(scope)` z zakresem
- [ ] 1.5 Migracja istniejących danych bez utraty id
- [ ] 1.6 Po zmianie układu plików zaktualizować: `currentIds()` (tools/lock-ids.js), `listAssets()` (tools/build.js), skill `add-lesson`, `CLAUDE.md`, README
- [ ] 1.7 Wdrożenie na Pages tylko po zielonym `verify` (Pages z Actions albo PR + branch protection) – dziś Pages publikuje `main` mimo czerwonego CI

## Faza 2 – kod
- [ ] 2.1 Ekrany rejestrują własne trasy (`register(router)`)
- [ ] 2.2 Rejestr typów pytań (render + check + validate)
- [ ] 2.3 Smoke test tras (jsdom/Playwright)

## Faza 3b – dalsze skille
- [ ] 3.4 Skill `add-questions`
- [ ] 3.5 Skill/subagent `fact-check-chemistry`

## Faza 4 – opcjonalnie
- [ ] 4.1 Synchronizacja postępu między urządzeniami
- [ ] 4.2 Kolejny przedmiot
