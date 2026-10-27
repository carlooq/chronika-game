# CHRONIKA — produkcja 10 000 wartościowych wydarzeń

> Cel redakcyjny, nie stan obecnej bazy. Wdrażamy system selekcji i weryfikacji, nie hurtowe importowanie szumu.

## Plan rozłożenia materiału

| Główna dziedzina | Docelowa liczba unikalnych wydarzeń | Pierwsza fala |
|---|---:|---:|
| Historia Polski (`poland`) | 650 | 100 |
| Historia świata (`world`) | 1050 | 150 |
| Kino (`cinema`) | 1400 | 250 |
| Seriale i telewizja (`television`) | 900 | 50 |
| Sport (`sport`) | 850 | — |
| Piłka nożna (`football`) | 850 | 100 |
| Gry wideo (`games`) | 1000 | 200 |
| Nauka (`science`) | 700 | 75 |
| Technologia (`technology`) | 750 | 75 |
| Literatura (`literature`) | 750 | — |
| Geografia i wyprawy (`geography`) | 500 | — |
| Popkultura (`culture`) | 600 | — |
| **RAZEM** | **10 000** | **1 000** |

Jedno wydarzenie ma jeden kanoniczny rekord. Przypisanie do różnych kategorii i tagów nie zwiększa licznika. Serie regularnych sezonów lub mało ważnych wydarzeń nie mogą sztucznie pompować liczb. Nie każde wydarzenie będzie równie łatwe: celem jest rozsądna mieszanka rozpoznawalnych i ambitniejszych rekordów.

## Co liczy się jako dobry rekord

- Poprawny, jednoznaczny tytuł po polsku, opis i rok (dokładniejsze daty tylko przy wiarygodnym źródle).
- Znaczenie dla polskiego gracza: rozpoznawalne dzieło, kluczowy fakt, pamiętny moment, przełom; nie losowy regularny sezon piłkarski.
- Weryfikowalne źródło i — kiedy dostępny — stabilny identyfikator w źródle; inne teksty (np. z Wikipedii) wymagają respektowania licencji; sam fakt i rok są odrębne od cudzych opisów.
- Deduplikacja po identyfikatorze źródłowym, normalizowanym tytule i roku oraz semantyce (ta sama premiera może mieć różne nazwy).
- Jedna dziedzina główna, opcjonalne podkategorie, tagi tylko tematyczne. Ocena rozpoznawalności powinna być osobnym polem, nie tagiem.
- Data musi mieć jasno ustaloną definicję: premiera światowa vs polska, rok wynalazku vs prezentacji, pierwsza edycja vs konkretny sezon.

## Produkcja w trzech rodzajach strumieni

1. **Wydarzenia historyczne**: redakcyjnie wybrane rocznice i chronologie z instytucji, a Wikidata pomocniczo do łączenia identyfikatorów i sprawdzania dat. Źródła: https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/01/01 ; https://www.wikidata.org/wiki/Wikidata:Data_access/en
2. **Premiery i dzieła kultury**: katalog filmów/seriali filtrowany po rozpoznawalności, książki po listach kanonicznych i metadanych; osobne definicje dat. TMDB ma wymogi atrybucji i warunki komercyjne: https://developer.themoviedb.org/docs/faq . Dla Open Library przy hurtowej pracy stosujemy zrzuty, nie tysiące żądań do API: https://openlibrary.org/developers/dumps
3. **Sport, gry, technologia i inne**: listy pamiętnych finałów, premier popularnych produktów, turniejów i rekordów; źródła dostosowane do dziedziny, dane faktograficzne i oryginalne krótkie opisy.

## Proces (przeznaczony do automatyzacji)

1. **Recepta pakietu**: dziedzina, temat, dekady, limit, definicja wydarzenia, dozwolone źródła.
2. **Kandydaci** (partie 200–500): selektywne zbieranie z repozytoriów tematycznych lub kuratorowanych list — nie losowy SPARQL.
3. **Filtry automatyczne**: odrzucanie niedatowanych, nieczytelnych, powtarzalnych i ewidentnie niszowych rekordów; zbieranie metadanych o popularności jako sygnałów, nie jedynego kryterium.
4. **Redakcja**: polski jednoznaczny tytuł, jeden rok i krótkie wyjaśnienie; model AI pomaga, ale nie weryfikuje samodzielnie faktów ani nie generuje fikcyjnych źródeł.
5. **Kontrola**: wykrycie duplikatów, zgodności kategorii, licencji, rozbieżności dat. Rekordy sporne trafiają do osobnej kolejki.
6. **Zapis jako szkic** do chronikaEvents; dopiero sprawdzone rekordy mogą dostać status zatwierdzone.
7. **Kontrola losowa** zaakceptowanych partii i monitorowanie powtórek w grze; ważne błędy powodują wycofanie wadliwej partii.

## Przygotowanie systemu przed masowym importem

- Dodać w panelu statystyki REALNYCH rekordów: łącznie, statusy, dziedziny, dekady i wykryte duplikaty. Cele nie są wynikami.
- Wprowadzić osobną kolejkę kandydatów (źródło, identyfikator, propozycja, ocena, flagi) bez mieszania jej ze zweryfikowaną bazą.
- Osobne kolektory dla wybranych rocznic i premier; rejestrować postęp źródła i kursory, żeby nie importować ponownie tych samych rekordów.
- Umożliwić zbiorczą decyzję i odrzucanie z zachowaniem przyczyny; wspólne eventId dla każdego trybu gry.
- Nie zmieniać funkcji gry, póki katalog zatwierdzony nie ma co najmniej kilkuset dobrej jakości wydarzeń w różnych epokach.

## Kamienie milowe

1. 200 kandydatów z dwóch różnych źródeł → sprawdzamy rzeczywisty odsetek wartościowych rekordów i koszty odczytów.
2. 1 000 zatwierdzonych, unikalnych wydarzeń według pierwszej fali z tabeli.
3. 3 000 → podłączenie do nowych wariantów kategorii i monitorowanie losowań.
4. 5 000 → dalsze źródła (sport, literatura, seriale).
5. 10 000 → końcowy audyt duplikatów, rozkładu dekad, udziału niszowych wydarzeń i jakości źródeł.

**Nie udajemy:** obecne kilkadziesiąt rekordów to nie 10 000. Podane liczby są celami, nie stanem Firestore. Model ani ten plan nie oznaczają automatycznej, bezbłędnej weryfikacji 10 000 faktów.
