# Konkurs kuratoryjny z angielskiego (woj. łódzkie) – wzorzec testów

Źródło: oficjalne arkusze i schematy oceniania Łódzkiego Kuratora Oświaty (kuratorium.lodz.pl, „Materiały konkursowe”)
oraz „Zakres wymagań na poszczególne etapy” 2023/24–2025/26. Przeanalizowano: szkolny 2023/24; rejonowy 2022/23, 2023/24, 2025/26; wojewódzki 2024/25.
**Teksty i pytania z arkuszy NIE trafiają do repo** – służą tylko jako wzorzec formatu. Wszystkie pytania w aplikacji piszemy własne.

## Stałe w każdym roku
| Etap | Czas | Punkty | Słuchanie | Forma |
|---|---|---|---|---|
| szkolny | 60 min | 100 | brak | papier, długopis |
| rejonowy | 90 min | 100 | brak | papier, długopis |
| wojewódzki | 120 min | 100 | brak | papier, długopis |

## Zmienne między latami (nie zakładać jednego układu!)
Liczba zadań, kolejność i podział punktów zmieniają się co roku:
- rejonowy 2022/23: 8 zadań (7/14/16/16/16/16/9/6)
- rejonowy 2023/24: 9 zadań (9/5/14/11/11/10/15/15/10)
- rejonowy 2025/26: 8 zadań (8/7/15/15/15/10/15/15)
- wojewódzki 2023/24: 10 zadań (8/15/10/10/7/10/10/10/10/10)
- wojewódzki 2024/25: 9 zadań (8/9/12/10/12/12/13/12/12)
- szkolny 2023/24: 8 zadań (10/15/15/10/15/15/10/10)

Stałe jest **repertuar typów zadań**. Test w aplikacji = lista sekcji z tego repertuaru, a układ wybiera szablon (rok wzorcowy).

## Repertuar typów zadań
Kody poniżej to `TASK_KINDS` w `js/sheets.js` (tam jest źródło prawdy; tabela opisuje je i ich zastosowanie).
| Kod | Zadanie | Etapy | Sprawdzanie |
|---|---|---|---|
| `tf` | Tekst + zdania PRAWDA/FAŁSZ | S R W | jedna odpowiedź |
| `choice-text` | Tekst + pytania A–D (też A–E, „który akapit”) | R W | jedna odpowiedź |
| `gapped-text` | Tekst z usuniętymi fragmentami/zdaniami + 1–2 zbędne | R W | jedna odpowiedź |
| `open-cloze` | Jedno słowo, bez skrótów (isn’t). Etap szkolny: 15 osobnych zdań; rejonowy i wojewódzki: tekst z lukami | S R W | lista akceptowanych |
| `first-letter` | Słowo z podanymi literami w różnych miejscach i kreskami za brakujące | S R | lista akceptowanych |
| `brackets-form` | Wyrazy w nawiasach: zmień formę, można dodać słowa (czas, strona bierna…) | S | lista akceptowanych |
| `word-formation` | Wyraz w nawiasie/na końcu zdania → forma pochodna | R W | lista akceptowanych |
| `key-word` | Zdanie + wyraz kluczowy, w luce maks. 5 wyrazów **wliczając podany** (nie zmieniać formy) | S R W | lista akceptowanych |
| `mc-cloze` | Zdania z luką, wybór A–D | R W | jedna odpowiedź |
| `translation-choice` | Wybór poprawnego tłumaczenia zwrotu (3 odpowiedzi A–C) | S R | jedna odpowiedź |
| `translation-write` | Przetłumacz fragment na angielski | W | lista akceptowanych |
| `question-form` | Zadaj pytanie o podkreśloną część zdania | S | lista akceptowanych |
| `synonym-replace` | Zwrot najlepiej zastępujący zaznaczony | R | jedna odpowiedź |
| `culture` | Etap szkolny: 10 pytań o geografię i atrakcje UK/USA (3 odpowiedzi). Rejonowy: święta i dni UK/USA – uzupełnij nazwę, dopasuj | S R | lista / jedna |
| `paragraph-matching` | „Który akapit zawiera informację?”: akapity 1–6, ten sam akapit może być odpowiedzią kilka razy | W | jedna odpowiedź |
| `matching-people` | Teksty o osobach, przyporządkuj A–E (każdy wielokrotnie) | W | jedna odpowiedź |
| `triple-gap` | Jedno słowo pasuje do 3 zdań (wieloznaczność) | W | lista akceptowanych |
| `word-box` | Wyrazy z ramki w zmienionej formie, kilka zbędnych | W | lista akceptowanych |
| `idiom` | Idiom: wybierz brakujące słowo | W | jedna odpowiedź |
| `biography` | Życiorysy sławnych Brytyjczyków/Amerykanów | W | jedna odpowiedź |

S = szkolny, R = rejonowy, W = wojewódzki.

## Zakres treści (z oficjalnego „Zakresu wymagań”)
- **Szkolny:** podstawa programowa kl. IV–VIII + struktury ponad podstawę (used to, strona bierna Present Perfect/Future Simple, phrasal verbs, mowa zależna, II okres warunkowy, question tags, Present Perfect Continuous, Future Continuous, spójniki unless/although/despite…); geografia i atrakcje UK i USA.
- **Rejonowy:** szkolny + Past Perfect Continuous, III okres warunkowy, strona bierna wszystkie czasy, had better / it’s high time, have/get sth done, mowa zależna (admit…), czasowniki modalne w przeszłości, be/get used to, imiesłowy, gerund/bezokolicznik, cleft sentences, so am I / neither am I, słowotwórstwo; kultura UK i USA: święta, tradycje.
- **Wojewódzki:** rejonowy + idiomy, Future Perfect (Continuous), zdania warunkowe mieszane, I wish / if only / as if, inwersja, either/or neither/nor, have sb do sth, formy emfatyczne, wyrazy wieloznaczne; sławni Brytyjczycy i Amerykanie; Kanada, Australia, Nowa Zelandia.
- Literatura obowiązująca (do uzgodnienia, czy wzorujemy słownictwo na niej): Vince *Intermediate Language Practice* (szkolny), + *Language Practice for First*, McCarthy/O’Dell *English Vocabulary in Use Upper-Intermediate* (rejonowy), + *Language Practice for Advanced*, *Vocabulary in Use Advanced* (wojewódzki).

## Zasady oceniania z oficjalnego schematu
- Przy zadaniach otwartych **każda poprawna odpowiedź spełniająca polecenie jest zaliczana**, także spoza modelu → aplikacja musi mieć listy akceptowanych odpowiedzi i możliwość samooceny.
- Wymagana pełna poprawność ortograficzna; w lukach jednowyrazowych zakaz skróceń.
- 1 punkt za poprawną odpowiedź. W `key-word` limit to pięć wyrazów, wliczając podany; skrócenie (hasn’t) to jeden wyraz.

## Poziom
Arkusze etapu szkolnego są trudniejsze niż podstawa programowa klasy 8: teksty z prasy (ok. 450–600 słów), struktury z listy „ponad podstawę” (used to, strona bierna, mowa zależna, pytania pośrednie, II okres warunkowy), słownictwo na poziomie B1+/B2 i pytania o UK/USA. Własne arkusze w aplikacji mają mieć ten sam poziom; teksty i dane w nich są wymyślone i tak oznaczone.
