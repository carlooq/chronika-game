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
