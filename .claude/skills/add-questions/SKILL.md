---
name: add-questions
description: Dopisuje pytania do istniejącego działu aplikacji Powtórka 8 (chemia albo angielski) – z zachowaniem numeracji id, typów dozwolonych w przedmiocie i zasad jakości – a potem uruchamia kontrole, blokadę id i podbija wersję. Użyj, gdy użytkownik prosi o „więcej pytań”, „pytania ćwiczeniowe” albo uzupełnienie istniejącego działu. Nowy dział z teorią robi skill add-lesson.
---

# Dopisywanie pytań do działu

Przeczytaj `CLAUDE.md` (zasady) i `README.md` (formaty typów pytań, grupy, arkusze). Jedna paczka pytań = jeden commit.

## 1. Ustal cel
- **Przedmiot i dział** (`data/<przedmiot>/topics/<dział>/`), liczbę pytań, poziom i zakres. Dopytaj tylko o to, czego nie wynika z prośby.
- Sprawdź dozwolone typy: `types` przedmiotu w `data/subjects.json`.
- Czy pytania są **ćwiczeniowe** (zwykłe pytania w paczce działu) czy mają trafić do **arkusza** (`sheets.json`)? Pytania ćwiczeniowe **nigdy** nie wpisują się do `sheets.json` – pytania arkuszy są ukryte w ćwiczeniach do zatwierdzenia arkusza (`js/practice.js`).

## 2. Numeracja – nie zgaduj
```
node tools/next-id.js <przedmiot> <dział>
```
Podaje następne wolne id pytania, fiszki, karty i grupy. Id są niezmienne: dopisujesz na końcu, nigdy nie zmieniasz istniejących.

## 3. Pisanie pytań (wspólne zasady)
- Każde pytanie ma `explain` (min. 15 znaków, po polsku, tłumaczy *dlaczego*), `level` 1–3 i unikalną treść.
- **Jedna poprawna odpowiedź.** Dla każdego pytania wyboru sprawdź osobno każdy dystraktor: czy jest naprawdę błędny, a nie tylko „mniej naturalny”. Dystraktory mają być wiarygodne (typowe błędy ucznia) i podobnej długości co poprawna odpowiedź – nie rób poprawnej najdłuższej.
- Mieszaj typy (nie same `choice`), jeśli temat na to pozwala. W quizach opcje są mieszane, w arkuszach kolejność jest stała (rozłóż pozycje poprawnych odpowiedzi).
- Teksty z danymi wymyślonymi oznacz w treści: „(Tekst został wymyślony na potrzeby ćwiczenia.)”.
- Nie wymyślaj faktów. Wątpliwości → `DO-SPRAWDZENIA.md`, nie do treści.

### Chemia
Wzory w `$…$`, równania zbilansowane w najmniejszych współczynnikach (`check` to wymusza), zgodnie z zasadami w `CLAUDE.md`.

### Angielski
- Pytania są **własne**. Arkuszy z kuratorium nie kopiujemy; wzorzec formatu: `docs/angielski-wzorzec-konkursu.md`, poziom jak w oficjalnych arkuszach danego etapu (szkolny ≈ B1+/B2, rejonowy i wojewódzki wyżej).
- `write`: w `answers` wpisz **wszystkie** poprawne warianty (także brytyjską i amerykańską pisownię, formy skrócone i pełne), pierwszą odpowiedź zapisz w poprawnej pisowni (wielka litera, `?` w pytaniach). Zasada konkursu: w lukach jednowyrazowych bez skróceń.
- Zadania ze słowem kluczowym: `keyword` + `maxWords: 5` (wlicza słowo kluczowe, skrócenie to jeden wyraz); słowo kluczowe zapisz w treści jako `(SŁOWO)`; **każda** odpowiedź zawiera je w niezmienionej formie. Dozwolona jest skrócona forma przeczna słowa kluczowego (should → shouldn't, had → hadn't, can → can't), więc klucz ma mieć **oba** warianty (`should not have shouted`, `shouldn't have shouted`) – `lint:content` to sprawdza.
- Zadania z tekstem: grupa `groups` w `theory.json` (`instruction`, `text`, opcjonalnie `bank`), pytania z `group` i `gap` (numery luk w tekście jako `(1)___`).
- Litery w słowie: `n _ _ g _ _ _ _ _ s` – liczba kresek = liczba brakujących liter (`lint:content` to sprawdza).
- Karty teorii i fiszki **nie mogą zawierać odpowiedzi z arkusza** (przykłady dobieraj inne niż w pytaniach arkusza).

## 4. Zamknięcie
1. `npm run check` oraz `npm run lint:content` – popraw wszystkie błędy; ostrzeżenia obejrzyj i popraw to, co jest prawdziwym problemem.
2. `npm run lock` – zablokuj nowe id.
3. `npm run bump`, potem `npm run verify` – musi przejść w całości.
4. Zaproponuj commit (`<Przedmiot>: N pytań ćwiczeniowych dla <dział>`). Nie pushuj bez prośby.

## 5. Raport
Ile pytań w jakich typach, w których działach, co dopisano do `DO-SPRAWDZENIA.md`, wynik `verify` i **czy pytania zostały sprawdzone przez drugą osobę** (jeśli nie – zaproponuj skill `fact-check`).
