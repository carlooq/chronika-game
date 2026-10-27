# CHRONIKA — uruchomienie panelu administratora

Panel ma zakładki: **Wydarzenia**, **Kategorie**, **Import / eksport**. Jest dostępny dla wskazanych kont graczy. Sam fakt posiadania konta ani znajomość URL nie wystarczają do edycji bazy.

## Dwa jednorazowe kroki w Firebase Console

1. Wejdź do https://console.firebase.google.com/project/chronika-2813f/firestore/rules. Skopiuj najnowszy plik [firestore.rules](../firestore.rules), wklej w edytorze i wybierz **Publish**. Zmiany w repozytorium nie publikują automatycznie reguł bezpieczeństwa na serwerze.
2. Zaloguj się w CHRONICE i przejdź do **Mój profil → Dostęp do panelu admina**. Skopiuj wyświetlony Firebase UID. Otwórz Firestore Database → **Data → Start collection**:
   - **Collection ID:** `chronikaAdmins`
   - **Document ID:** Twój dokładny UID z profilu (nie adres e-mail)
   - **Field:** `enabled` | **Type:** boolean | **Value:** `true`
   - Kliknij **Save**.

Odśwież CHRONIKĘ na zalogowanym koncie. W nawigacji pojawi się **Panel admina**.

### Pierwsze użycie
1. W panelu wybierz **Import / eksport**.
2. Kliknij **Utwórz katalog 84 kategorii** (12 dziedzin + 72 podkategorie, wszystkie jako szkice). Import wstrzymuje się, jeśli katalog już zawiera dane.
3. Opcjonalnie kliknij **Importuj przykładowe wydarzenia**. Są to przykładowe karty z dotychczasowej demonstracyjnej bazy, oznaczone jako szkice z adnotacją do weryfikacji, nie nowe źródło prawdy.
4. Przejdź do **Wydarzenia**: można dodać, edytować, filtrować po kategorii, wyszukiwać po **początku tytułu** i przechodzić między stronami (40 rekordów).
5. W zakładce **Kategorie** można zmieniać nazwę, opis, rodzica i status. ID po utworzeniu pozostaje stałe.
6. Import z CSV/JSON obsługuje do 1000 rekordów na operację; istniejące ID są pomijane. Przed importem wymagane jest utworzenie odpowiednich kategorii.

## Struktura Firebase

- `chronikaAdmins/{uid}` — wyłącznie ręcznie tworzone wpisy uprawnień administratora; reguły blokują tworzenie przez klienta.
- `chronikaCategories/{id}` — hierarchia (maksymalnie dwa poziomy w interfejsie), opis, status, kolejność.
- `chronikaEvents/{id}` — rok, tytuł i sortowana wersja, opis, źródło, tagi, poziom trudności, status i lista kategorii.

Katalog jest **prywatny** — zwykli gracze nie czytają dokumentów bazy admina. Status „Zatwierdzone” to status redakcyjny, **nie automatyczna publikacja** w trybach rozgrywki. Obecna kampania i szybka gra nadal korzystają z dotychczasowych 66 przykładowych rekordów w `src/data.js`. Przejście na zweryfikowany katalog jest kolejnym etapem i powinno uwzględnić serwerowe wydawanie pytań do przyszłego 1v1.

### Pliki importu

JSON: tablica obiektów, np.

```json
[
  {
    "id": "pl-1989-wybory",
    "title": "Wybory czerwcowe w Polsce",
    "year": 1989,
    "description": "Wybory parlamentarne 4 i 18 czerwca.",
    "categoryIds": ["poland", "poland--prl-1945-1989"],
    "status": "review",
    "difficulty": 2,
    "sourceName": "Do uzupełnienia",
    "sourceUrl": ""
  }
]
```

CSV: kolumny obowiązkowe `title,year,categoryIds`; opcjonalne `id,description,status,difficulty,sourceName,sourceUrl,tags`. Jeżeli w jednym polu jest kilka kategorii, rozdziel je średnikami i ujmij całe pole w cudzysłowy.

Rekordy importowane bez statusu trafiają do **Szkiców**. Import nie nadpisuje istniejących wydarzeń. Nie implementujemy trwałego usuwania w MVP — używaj statusu „Archiwum”. Nie importuj cudzych fotografii/opisów bez kontroli licencji.

### Bezpieczeństwo i skala
- Samo ukrycie przycisku admina nie chroni bazy; ochronę zapewniają opublikowane reguły Firestore.
- Reguły wymagają zarejestrowanego konta, wpisu `chronikaAdmins/{uid}` z `enabled=true` i kontrolują podstawowe pola zapisywanych dokumentów.
- Eksport pobiera dane stronami po 100; przy dużej bazie to operacja kosztująca odczyty Firestore.
- Wyszukiwanie po tytule działa jako **prefiks**, nie pełnotekstowo. Wyszukiwanie plus filtr kategorii sprawdza tę kategorię w obrębie bieżącej strony wyników tytułu. Pełnotekstowe indeksowanie dodamy, jeśli baza osiągnie tysiące rekordów.
- Baza 84 kategorii to gotowa struktura redakcyjna, **nie 84 talie z tysiącami prawdziwych pytań**. Masowy import i weryfikacja faktów pozostają osobnymi pracami.

## Wikidata — pierwszy importer źródeł (MVP)

W panelu administratora przejdź do **Wikidata**, wybierz:
- **Historia Polski**: elementy oznaczone krajem Polska (P17) i datą wydarzenia (P585).
- **Historia świata**: wydarzenia (Q1190554 i podklasy) z datą (P585).
- **Nauka i odkrycia**: obiekty z datą odkrycia/wynalezienia (P575).

Ustaw lata (obsługiwane 1000–2030) i małą partię **25 / 50 / 100**. Zalecane są zakresy 5–20 lat; duże przekroje są znacznie cięższe dla publicznego serwisu Wikidata. Kliknij **Pobierz propozycje**. Zobaczysz tytuły, daty, krótki opis (jeśli Wikidata go zawiera), link QID do źródła, braki i status duplikatów.

Zaznacz pozycje (lub kliknij „Zaznacz nowe”), a potem „**Zapisz szkice w Firebase**”. Zapis jest uruchamiany dopiero po dodatkowym potwierdzeniu. Po zaimportowaniu wróć do zakładki **Wydarzenia** i dokonaj redakcyjnej weryfikacji: opis, sens daty, nazwa i wiarygodność źródła. Surowe propozycje **nie są automatycznie publikowane**.

### Deduplicacja i ograniczenia
- ID jest stabilne: **Wikidata Q123** → `wikidata-q123`.
- Importer przed pokazaniem wyników sprawdza, czy ID już istnieje w Firestore, i oznacza ponowne wystąpienia nazwy+roku w danej partii.
- Przy zapisie Firestore pomija rekordy o istniejącym ID, nie nadpisując wykonanych poprawek.
- To pierwsza wersja deduplikacji, nie rozpoznaje wszystkich synonimów lub identycznych wydarzeń o innych QID. Weryfikacja redakcyjna nadal jest potrzebna.
- Wyniki z dużego zakresu lat nie są losową, reprezentatywną próbką historii — ręcznie zmieniaj okna lat i sprawdzaj różnorodność.
- Skrypt wykonuje **jedno kontrolowane zapytanie** na żądanie w przeglądarce administratora, bez podawania surowego SPARQL. Jeśli Wikidata zwróci 429 lub timeout, poczekaj i użyj węższego zakresu. Publiczny serwis limituje czas i przepustowość: https://www.mediawiki.org/wiki/Wikidata_query_service/Implementation.
- Źródło: Wikidata (dane CC0). Link do QID to **wskazanie pochodzenia danych**, nie dowód poprawności każdej daty. Ważne rekordy wymagają sprawdzenia w źródłach historycznych/naukowych.
- Aktualny katalog nadal jest prywatny dla administratora; nie udostępniamy ukrytych odpowiedzi przyszłego multiplayera.
- Te narzędzia używają istniejącej kolekcji `chronikaEvents` i **nie wymagają kolejnej zmiany reguł Firestore**, jeśli najnowsze reguły panelu są już opublikowane.

### Przykładowy przepływ
1. Historia Polski → 1980–1989 → 25 → Pobierz.
2. Otwórz linki Wikidata przy wybranych rekordach i usuń błędne pozycje z zaznaczenia.
3. Zapisz szkice.
4. Wydarzenia → wyszukaj tytuł → uzupełnij źródła i popraw polski opis, następnie ustaw „Do weryfikacji” lub „Zatwierdzone” po sprawdzeniu.
5. Kontynuuj z nowym okresem, np. 1990–1999.

**Następne kroki techniczne:** zbiorcza kolejka redakcyjna, raport pokrycia dekad, dalsze importery tematyczne, pełniejsza deduplikacja po tożsamości wydarzenia, w końcu osobna publikacja zweryfikowanej bazy do gry.

## Jednorazowe czyszczenie tagów w Historii Polski V1

W przypadku importu pierwszego pakietu redakcyjnego (38 wydarzeń) stara wersja zawierała tagi techniczne `kuratorskie-pl-v1` oraz tagi rozpoznawalności `ikoniczne` lub `znane`, które nie są właściwymi tagami tematycznymi.

**Bez ręcznego edytowania dokumentów**:
1. **Panel admina → Import / eksport → Porządkowanie tagów · Historia Polski V1**.
2. **Sprawdź te 38 rekordów**. Panel odczyta faktyczne dokumenty z Firebase i pokaże, ile wymaga poprawy.
3. **Wyczyść tagi w ... rekordach** i potwierdź.

Narzędzie modyfikuje tylko dokładnie 38 znanych identyfikatorów z tej paczki, a także tylko listę `tags` i pola audytowe (`updatedAt`, `updatedBy`). Nie zmienia tytułu, daty, opisu, statusu, przypisania kategorii ani źródła. Inne tagi tematyczne pozostają nietknięte. Jeśli uruchomisz ponownie, pokaże 0 zmian do wykonania. Możesz pobrać ogólny eksport katalogu JSON przed czyszczeniem.

Oryginalne poziomy rozpoznawalności (25 × `ikoniczne`, 13 × `znane`) są zachowane w kodzie projektu w `src/curatedCleanup.js`. W przyszłości powinny przejść do osobnego pola `recognitionLevel`; na razie nie ma potrzeby zmiany schematu ani reguł Firestore.

## Czytelne nazwy zamiast technicznych identyfikatorów

W zakładkach **Wydarzenia** i **Kategorie** ukryto techniczne ID z głównych tabel. Zamiast ciągu w rodzaju `kurator-pl-grunwald` widzisz tytuł wydarzenia, rok i przypisanie do kategorii. W edytorze identyfikator jest dostępny tylko po rozwinięciu sekcji **Dane techniczne**, gdzie widać go do wglądu. Dodawanie nowych wydarzeń i kategorii nie wymaga ręcznego wpisywania ID.

**Ważne:** ID dokumentów Firestore nie zostały zmienione ani usunięte. Są trwałymi kluczami bazy i mogą służyć deduplikacji oraz przyszłym referencjom. Masowa zmiana kluczy wymagałaby osobnej, ostrożnie kontrolowanej migracji (kopiowanie, sprawdzenie odwołań, usunięcie starych rekordów), dlatego nie wykonujemy jej tylko z przyczyn estetycznych. Zmiana interfejsu nie narusza Twoich istniejących danych i nie wymaga nowych reguł Firebase.

## Wybrane rocznice Wikipedii — pierwsza partia do produkcji 10 000 wydarzeń

W **Panel admina → Wybrane rocznice** można pobierać anglojęzyczne, **redakcyjnie wybierane** rocznice historyczne z Wikipedii. Są lepszym punktem startowym niż surowe listy Wikidata, ale nie oznacza to automatycznej poprawności, wysokiej rozpoznawalności w Polsce ani polskiego języka.

1. Ustaw **dzień rozpoczęcia**, np. `01-01` (styczeń 1).
2. Wybierz partię **7, 14 albo 28 dni**. Jeden dzień = jedno żądanie do Wikimedia; maksymalnie dwa jednocześnie. Nie pobieramy całego roku jednym przyciskiem.
3. Dziedzina `Historia świata` jest domyślną opcją. `Historia Polski` wybieraj wyłącznie wtedy, kiedy selekcjonujesz wyraźnie polskie wydarzenia.
4. Przejrzyj tytuły i **oryginalne angielskie streszczenia** w podglądzie. Nie są kopiowane do Firebase.
5. Możesz wpisać od razu **własny polski tytuł** przy wybranym rekordzie. Zaznaczaj tylko wydarzenia, które chcesz opracować.
6. Kliknij **Zapisz szkice w Firebase**. Każdy zapisany rekord jest szkicem z pustym opisem i linkiem do źródła. W zakładce **Wydarzenia** napisz własny, rzetelny polski opis, sprawdź fakty i dopiero później zmień status.
7. Kliknij **Następna partia**, żeby przesunąć datę startową o liczbę pobranych dni. Przy błędach HTTP panel informuje o niepobranych datach; nie uznawaj partii za kompletną.

ID importera to `anniv-ROK-HASH` (stabilne dla tej samej treści i roku). Narzędzie sprawdza także istniejące ID Firestore, ale **nie potrafi jeszcze wykryć wszystkich semantycznych duplikatów** różnych źródeł. Nie zaznacza nic automatycznie.

Dane z Wikipedii mają licencję CC BY-SA — nie kopiuj surowych opisów jako własnych. Zapisujemy identyfikator źródła, link do strony, rok i szkic do redakcji; opisy w bazie są celowo puste.

### Statystyki: rzeczywisty postęp bazy

W **Panel admina → Postęp bazy → Przelicz bazę** zobaczysz:
- faktyczną liczbę dokumentów w `chronikaEvents`;
- liczbę według statusu (szkice, weryfikacja, zatwierdzone, archiwum);
- licznik w 12 głównych dziedzinach (obecnie tylko rekordy przypisane *bezpośrednio* do tej dziedziny);
- cel 10 000 zatwierdzonych, unikalnych wydarzeń, a nie 10 000 pobranych propozycji.

Odczyty są wykonywane na żądanie przez agregacje Firestore; nie trzeba pobierać tysięcy dokumentów do przeglądarki. Jeśli nie masz nadanych uprawnień administratora, nie uzyskasz dostępu do agregacji.

### Ograniczenia tej iteracji

Nie potwierdzono w rzeczywistej sesji Twojej przeglądarki dostępności wszystkich publicznych endpointów Wikimedii; serwis może mieć ograniczenia, awarie lub chwilowo blokować żądania. Nie ma jeszcze automatycznej polskiej redakcji AI, importerów filmów / sportu ani zaawansowanej deduplikacji semantycznej. Nie traktuj samego zapisu szkicu jako zakończonej weryfikacji wydarzenia. Importer Wikidata pozostaje dostępny, ale jest mniej selektywny.
