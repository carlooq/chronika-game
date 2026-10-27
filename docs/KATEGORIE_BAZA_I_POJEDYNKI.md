# CHRONIKA — baza wiedzy i pojedynki 1v1

Status: plan architektoniczny (nie wdrożono nowych kategorii ani multiplayer).

## Pojedynek: 3 rundy po 5 pytań
1. Pierwszy losowo wyznaczony gracz wybiera jedną z trzech losowych, aktywnych podkategorii.
2. Drugi gracz wybiera jedną z trzech świeżych propozycji.
3. Trzecią podkategorię losuje serwer bez powtarzania poprzednich.
Obie osoby odpowiadają na identyczne pytania. W meczu łącznie 15 pytań, wszystkie trzy rundy rozgrywane są do końca. Wynik ustala suma punktów, a remis rozstrzyga pytanie dogrywkowe.
Pytania mogą mieszać: oś czasu, rok A/B/C/D, co było pierwsze i późniejsze tryby. Mechanikę i reguły punktacji trzeba przed rankingiem przetestować.
Serwer dobiera pytania i liczy wyniki; nie używa klientowych chronikaStats jako dowodu wygranej. Odpowiedź ujawnia się dopiero po decyzji obu graczy lub końcu limitu.

## Roboczy katalog: 12 dziedzin, 72 podkategorie
| Dziedzina | Podkategorie do stopniowego włączenia |
|---|---|
| Kino | polskie kino; klasyki; animacje; horrory; science fiction; nagrody |
| Seriale i TV | seriale światowe; polskie seriale; telewizja lat 90.; programy; animacje; nagrody TV |
| Historia Polski | początki państwa; Jagiellonowie; rozbiory; II RP; PRL 1945–1989; Polska po 1989 |
| Historia świata | starożytność; średniowiecze; odkrycia; XIX wiek; II wojna światowa; świat po 1945 |
| Sport | igrzyska; tenis; lekkoatletyka; sporty zimowe; koszykówka; rekordy |
| Piłka nożna | mundiale; EURO; Liga Mistrzów; polska piłka; Serie A; legendy/transfery |
| Gry komputerowe | początki gier; konsole retro; premiery gier; Nintendo; PlayStation/Xbox; e-sport |
| Nauka | kosmos; fizyka; chemia; medycyna; biologia; wynalazcy |
| Technologia | komputery; internet; smartfony; media społecznościowe; elektronika; transport |
| Literatura | literatura polska; klasyka; fantasy; science fiction; kryminały; nagrody |
| Geografia i wyprawy | odkrywcy; góry; alpinizm; lotnictwo; wielkie budowle; wyprawy polarne |
| Popkultura | komiksy; anime; marki; zabawki; internet; fenomeny popkultury |

To taksonomia docelowa, NIE 72 gotowe talie. Muzyka pozostaje domeną HITSTERIADY.
Podkategorie mogą współdzielić wydarzenia bez dublowania rekordu. Przed publikacją trzeba wymagać np. minimum 80–100 unikalnych, sprawdzonych wydarzeń oraz różnorodności dat. Nowe kategorie pozostają ukryte, dopóki nie mają materiału.

## Model danych
- categories: id, parentId, slug, titlePl, description, availableModes, publishedCount, active, rankedEnabled.
- events: id, titlePl, descriptionPl, year, datePrecision, dateISO (jeżeli jest), categoryIds[], tags[], difficulty, sourceId, sourceUrl, sourceLicense, reviewStatus.
- questions: id, eventIds[], mode, promptPl, options[], correctAnswer, explanationPl, categoryIds[], difficulty, reviewed. Klient multiplayer NIE ma dostępu do odpowiedzi przed końcem zadania.
- matches/rounds/submissions: wymaga serwerowej obsługi sesji, dostępów, limitu czasu i walidacji odpowiedzi.
Jedno wydarzenie może zasilać wiele mechanik i kategorii; nie oznacza to automatycznie, że każde pytanie jest jednoznaczne — warianty odpowiedzi wymagają sprawdzenia.
Daty przed naszą erą, zdarzenia rozciągnięte w czasie, remisy w tym samym roku i różne daty premier wymagają jawnych reguł precyzji.

## Skalowanie zawartości
- Docelowy cel roboczy: od 2 000 zweryfikowanych wydarzeń (pierwszy duży import) do 5 000–10 000, jeśli pipeline jakości zadziała.
- Wikidata: faktograficzne dane CC0; SPARQL do selektywnych zapytań, hurtowo lepiej zrzuty. Źródło: https://www.wikidata.org/wiki/Wikidata:Data_access/en
- TMDB: kino/seriale; bezpłatne korzystanie niekomercyjne wymaga atrybucji; komercja wymaga uzgodnienia licencji. https://developer.themoviedb.org/docs/faq
- Open Library: bibliografia i premiery książek; do masowego importu stosować dumpy, nie tysiące requestów API. https://openlibrary.org/developers/dumps
- Dla polskiej historii i sportu potrzebne dodatkowe wiarygodne źródła oraz ręczna weryfikacja.
Pipeline: import -> normalizacja -> deduplikacja -> kontrola chronologii -> tłumaczenie/redakcja -> weryfikacja źródła -> status published.
Unikać codziennego pobierania ogromnych zasobów przez przeglądarkę: solo może korzystać z wersjonowanych paczek treści, a multiplayer z pytań wydawanych przez backend. Firestore nadaje się do katalogu i rozgrywek, lecz architekturę kosztów trzeba przetestować.

## Kolejne kroki
1. Zatwierdzić taksonomię i progi publikacji (plan).
2. Zbudować importer oraz validator rekordów, bez włączania pustych kategorii.
3. Przygotować pierwsze 15–20 kompletnych podkategorii (np. 2 000 sprawdzonych wydarzeń).
4. Przetestować prototyp trzech rund 1v1 na małej, jakościowej bazie.
5. Dopiero po poprawnych testach zabezpieczyć ranking, dołożyć turnieje i skalować bazę.
