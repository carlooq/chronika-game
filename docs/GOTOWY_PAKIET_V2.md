# CHRONIKA — Studio redakcyjne, pakiet 112 wydarzeń (V2)

## Co zostało przygotowane
Nowy **gotowy pakiet 112 wydarzeń** w pliku `src/curatedStudioV2.js`. W odróżnieniu od importerów Wikimedia wszystkie rekordy mają już:
- polski tytuł i krótki, autorsko sformułowany polski opis;
- konkretny rok i główną kategorię bez obowiązkowych podkategorii;
- link do źródła i nazwę źródła;
- brak technicznych tagów (`tags: []`);
- status **`review` / Do weryfikacji**, żeby nie trafiały automatycznie do gry.

**Zawartość:** Kino 45, Gry wideo 32, Nauka 24, Technologia 6, Sport 5. Łącznie 112 rekordów. Dane zostały wybrane według rozpoznawalności/znaczenia, a lata wstępnie porównano z:
- American Film Institute: https://www.afi.com/afis-100-years-100-movies/
- Filmweb / IMDb Top 250: https://www.filmweb.pl/lista/5397
- Nintendo: https://www.nintendo.com/us/about/ oraz https://www.nintendo.com/us/explore/characters/mario/history/
- NASA: https://www.nasa.gov/history/dawn-of-the-space-age/ i https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo.html oraz https://science.nasa.gov/deep-space-exploration/
- CERN: https://indico.cern.ch/event/1349427/contributions/5682528/attachments/2764140/4814423/20231204_CNPEM_SCE-PPM.pdf
- Internet Society: https://www.internetsociety.org/internet/history-internet/brief-history-internet/
- Olympics: https://www.olympics.com/ioc/celebrate-olympic-games/

## Jak zaimportować całą paczkę, bez ręcznej pracy
1. Zaloguj się do CHRONIKI jako administrator.
2. Przejdź do **Panel admina → Gotowe pakiety**.
3. Obejrzyj przykłady lub wybierz filtrowanie według kategorii. Każda pozycja ma gotowy polski opis i link do źródła.
4. Kliknij **Sprawdź istniejące rekordy**. Panel odczyta 112 dokładnych identyfikatorów w Firestore i poinformuje, ile z nich jest już zapisanych.
5. Kliknij **Dodaj ... gotowych wydarzeń do Firebase**, a następnie potwierdź. Wszystkie zostaną zapisane bez edytowania czy tłumaczenia każdego wpisu. Istniejące ID są pomijane.
6. Wydarzenia pojawią się w zakładce **Wydarzenia** ze statusem **Do weryfikacji**.

**Dlaczego nie ładujemy ich z GitHub bezpośrednio do Firebase?** Aplikacja używa prywatnego projektu Firebase i restrykcyjnych reguł: tylko sesja uprawnionego administratora może modyfikować bazę. GitHub nie posiada i nie powinien mieć Twoich danych logowania. Potwierdzenie zbiorczego importu jest konieczne, ale nie wymaga ręcznej edycji rekordów.

## Granice tej iteracji

Nie ma tu jeszcze 10 000 wydarzeń. Dostarczona paczka dodaje maksymalnie 112 unikalnych ID, chyba że część już istnieje. Nie zastępuje wcześniejszych 38 kart ani testowych 66.

Podane daty zostały sprawdzone w materiałach źródłowych, ale nie przeprowadzono niezależnego, osobnego audytu historycznego każdego zdania przez dwóch redaktorów. W przypadku niejednoznacznych dat premier (region i platforma) tytuły explicite wskazują kraj, np. „w USA”. `review` nie oznacza zatwierdzenia do gry.

Wszystkie źródła są do przeglądania — **nie skopiowaliśmy cudzych opisów w całości**, tylko napisaliśmy krótkie polskie streszczenia. W przyszłości wymagany będzie jeszcze raport duplikatów semantycznych (obecnie importer chroni przed istniejącymi identycznymi ID) oraz system automatyzujący produkcję kolejnych pakietów.

## Kolejne kroki do 10 000
Powiększanie zbioru jest procesem wieloetapowym: nowe paczki filmów, gier i nauki, następnie osobne źródła dla sportu, literatury, historii Polski i świata. Zautomatyzujemy **dobór kandydatów**, ale ocenę znaczenia, zgodność dat, deduplikację i jakość opisów nadal trzeba kontrolować. Panel może używać w przyszłości API do generowania polskiej redakcji, jednak **nie potrzebujesz go, żeby dodać tę paczkę**.

## Korekta nazewnictwa — 45 filmów

Pierwsza wersja błędnie używała schematu `Premiera „...”` w tytułach filmów. Poprawiony pakiet zawiera naturalne polskie tytuły w mianowniku, np. `Ojciec chrzestny`, `Psychoza`, `Matrix`, `2001: Odyseja kosmiczna` i `Władca Pierścieni: Dwie wieże`. Rok w karcie oznacza rok pierwszej premiery filmowej, a krótki opis objaśnia kontekst.

Jeżeli poprzednia paczka została już zaimportowana, **Panel admina → Gotowe pakiety → Sprawdź tytuły w bazie → Popraw ... tytułów jednym kliknięciem**. Panel pokazuje porównanie starej i nowej nazwy przed potwierdzeniem.

Migracja dotyczy tylko **dokładnie 45 konkretnych ID z pierwszego pakietu V2** i tylko wtedy, gdy tytuł nadal jest identyczny z naszym starym wariantem. Ręcznych zmian administratora nie nadpisuje. Zachowuje ID dokumentu, rok, opis, źródło, kategorie, status i tagi. Zmienia `title`, `titleSort` (aby wyszukiwarka działała poprawnie) oraz pola czasu i autora modyfikacji. Wielokrotne uruchomienie jest bezpieczne. Nie wymaga nowych reguł Firestore.

**Reguła redakcyjna na przyszłość:** tytuł wydarzenia w CHRONICE ma być najkrótszą naturalną nazwą obiektu lub historycznego faktu, jaką gracz rozpozna. Nie dopisujemy w kółko „Premiera”, gdy typ wydarzenia wynika z kategorii i pola roku. Wyjątki tylko tam, gdzie konkretna czynność lub miejsce premiery są istotą zagadki (np. odróżnienie wersji USA od światowej).
