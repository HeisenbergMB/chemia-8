---
name: add-lesson
description: Dodaje nową lekcję/dział do aplikacji Chemia 8 – wpis działu, karty teorii, fiszki i pytania w różnych typach – a potem uruchamia kontrole, blokadę id i podbija wersję. Użyj, gdy użytkownik prosi o nowy temat, dział, lekcję albo moduł z treścią.
---

# Dodawanie lekcji (działu)

Zanim zaczniesz, przeczytaj `CLAUDE.md` (zasady) i `README.md` (formaty danych). Pracuj na gałęzi lub w osobnym commicie: **jedna lekcja = jeden commit**.

## 1. Ustal zakres (zapytaj tylko o to, czego nie wiesz)
- Temat i poziom (klasa 8, program podstawowy), źródło treści (zdjęcia z `materialy-prywatne/` nie trafiają do repo – wolno z nich korzystać tylko jako źródła wiedzy).
- Czy lekcja ma mieć narzędzia (`tools`: kalkulatory) albo doświadczenia (`labs`) – jeśli tak, wymaga to nowego kodu; zaproponuj osobny krok.

## 2. Sprawdź, co już jest
- Wypisz istniejące działy i skróty id: `node -e "const t=require('./data/theory.json');console.log(t.topics.map(x=>x.id))"` oraz przykładowe id w tych działach.
- Wybierz **nowe, unikalne** id działu (kebab-case, bez polskich znaków) i krótki skrót do id pytań (`q-<skrót>-001…`). Sprawdź, że nie koliduje.

## 3. Dodaj dane (tylko dopisywanie, nic nie zmieniaj w istniejących id)
1. `data/theory.json` → `topics`: `{ id, title, status: "active", desc }`. Nowy dział dopisz na końcu (kolejność = numeracja w menu).
2. `cards` – 3–6 kart: `{ id: "t-<skrót>-NN", topic, title, body, examples?, tip? }`. Wzory w `$…$`.
3. `flash` – 8–15 fiszek: `{ id: "f-<skrót>-NN", topic, front, back }`.
4. `data/questions.json` – 12–20 pytań, poziomy 1–3, **co najmniej 40% typów innych niż `choice`** (`formula`, `equation`, `blocks`, `match`, `balance`) tam, gdzie temat na to pozwala. Każde z `explain`. Dystraktory mają być wiarygodne (typowe błędy ucznia), a poprawna odpowiedź nie zawsze na tej samej pozycji.
5. Równania do bilansowania: tylko poprawne i w najmniejszych współczynnikach (`check` to wymusza).

Nie wymyślaj faktów. Jeśli nie jesteś pewien (nazwa, wartościowość, rozpuszczalność, kolor wskaźnika), **nie wstawiaj** – dopisz do `DO-SPRAWDZENIA.md` i zapytaj użytkownika.

## 4. Kontrole i zamknięcie
1. `npm run check` – popraw wszystkie błędy (nie omijaj ich, nie osłabiaj `tools/check-data.js`).
2. `npm run lock` – zablokuj nowe id.
3. `npm run bump` (zmiana widoczna dla użytkownika → nowa wersja i odświeżony cache offline).
4. `npm run verify` – musi przejść w całości.
5. Zaproponuj commit: `Dział „<tytuł>”: teoria, fiszki, pytania`. Nie pushuj bez prośby.

## 5. Raport dla użytkownika
Krótko: nazwa i id działu, liczba kart/fiszek/pytań (z podziałem na typy), pozycje dopisane do `DO-SPRAWDZENIA.md` oraz wynik `npm run verify`. Zaznacz w `ROADMAP.md`, jeśli lekcja domyka któryś punkt.
