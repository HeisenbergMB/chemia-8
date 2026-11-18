---
name: fact-check
description: Sprawdza jakość istniejących pytań (chemia albo angielski): poprawność merytoryczna klucza, jedna poprawna odpowiedź, wiarygodność dystraktorów, poziom, naturalność zdań i ujawnianie odpowiedzi w kartach. Daje raport z listą poprawek; zmiany w danych wprowadza dopiero po zgodzie. Użyj, gdy użytkownik prosi o sprawdzenie, weryfikację albo przegląd treści (dział, arkusz lub nowo dopisane pytania).
---

# Kontrola jakości treści

Cel: znaleźć błędy, których `check-data` (format) nie widzi. Treść pisana przez model bywa poprawna formalnie i błędna merytorycznie, dlatego sprawdzenie ma być **niezależne od klucza**.

## 1. Zakres
Ustal, co sprawdzasz: dział (`--topic`), arkusz (`s-…`) albo zakres id. Przeczytaj `DO-SPRAWDZENIA.md` – nie powtarzaj tego, co już jest tam oznaczone, tylko uzupełnij.

## 2. Kontrole mechaniczne
```
npm run lint:content
```
Błędy (`✗`) popraw. Ostrzeżenia (`!`) przejrzyj: wzorce pozycji i długości odpowiedzi, ujawnienie klucza w kartach i fiszkach (dla słownictwa i faktów; struktury gramatyczne są tematem kart).

## 3. Ślepe rozwiązanie (najważniejsze)
```
node tools/blind-sheet.js <przedmiot> <id arkusza>        # albo
node tools/blind-sheet.js <przedmiot> --topic <dział>
```
Wypisuje zadania **bez kluczy i wyjaśnień**. Rozwiąż je samodzielnie (najlepiej przekaż wynik osobnemu agentowi, który nie widzi pytań z kluczem – Agent z samym tym wydrukiem), a potem porównaj odpowiedzi z kluczem w `questions.json`. Każda rozbieżność jest podejrzana: albo klucz jest błędny, albo pytanie ma drugą poprawną odpowiedź, albo jest niejasne.

## 4. Lista kontrolna dla każdego pytania
- **Klucz:** czy poprawna odpowiedź jest faktycznie poprawna (fakt, gramatyka, pisownia)?
- **Jedność:** czy któryś dystraktor też jest poprawny (np. *allow me stay* vs *allow me to stay*; *Despite of*; „make a decision/take a decision” w brytyjskim angielskim)?
- **Warianty (`answers`):** czy brakuje oczywistych wariantów (brytyjska/amerykańska pisownia, forma skrócona i pełna, synonimy zgodne z poleceniem)? Czy któryś wpisany wariant jest błędny albo łamie polecenie (np. skrócenie w luce jednowyrazowej, słowo kluczowe zmienione)?
- **Poziom:** czy trudność pasuje do etapu (szkolny ≈ B1+/B2 ze strukturami z zakresu, rejonowy i wojewódzki wyżej, zgodnie z `docs/angielski-wzorzec-konkursu.md`)?
- **Naturalność:** czy zdania brzmią naturalnie, a nie jak przykład z podręcznika sprzed 30 lat?
- **Wyjaśnienie:** czy `explain` jest poprawne i mówi, dlaczego odpowiedź jest taka, a nie inna?
- **Teksty:** czy tekst jest spójny, a każde zdanie TRUE/FALSE ma jednoznaczne uzasadnienie w tekście? Czy dane są oznaczone jako wymyślone?
- **Fakty o krajach, osobach, świętach, chemii:** weryfikuj tylko to, czego jesteś pewien; resztę zapisz w `DO-SPRAWDZENIA.md` z dokładnym id pytania. Nie „naprawiaj” faktów na podstawie przypuszczeń.
- **Ujawnianie:** czy karty teorii i fiszki nie podają wprost odpowiedzi z arkusza?

## 5. Raport
Tabela: `id | problem | proponowana poprawka | pewność (pewne / do potwierdzenia)`. Osobno: ile pytań sprawdzono, ile rozbieżności ze ślepego rozwiązania. Zaznacz wyraźnie, czego **nie** dało się zweryfikować (np. aktualność faktów, zgodność z literaturą konkursu).

## 6. Poprawki
Zmieniaj dane dopiero po zgodzie użytkownika, ewentualnie od razu drobne, pewne literówki. Zasady: **nie zmieniaj id**; usunięcie pytania to `npm run lock -- --prune` i wymaga zgody. Po zmianach: `npm run check`, `npm run lint:content`, `npm run bump`, `npm run verify`. Wpisy o wątpliwościach – do `DO-SPRAWDZENIA.md`.
