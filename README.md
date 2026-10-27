# CHRONIKA — gra o czasie (MVP 0.2)

**Osobny projekt**, niezależny od HITSTERIADY. Pierwsza grywalna wersja dla 1 gracza, gotowa do hostowania na Vercel i połączenia z *nowym* projektem Firebase. Nazwa i grafika są robocze.

## Studio źródeł i liczniki Firestore (MVP 0.5)

W panelu admina są dwie nowe zakładki: **Wybrane rocznice** (redakcyjnie wybierane rocznice Wikipedii, do 28 dni na partię, podgląd + ręczny wybór + zapis tylko jako szkice) oraz **Postęp bazy** (rzeczywiste agregacje Firestore według statusów i 12 głównych kategorii, cel 10 000). Źródłowe angielskie opisy są pokazywane jedynie w podglądzie, nie kopiowane do własnej bazy. Polski opis trzeba samodzielnie opracować lub przygotować w późniejszym systemie redakcyjnym. Szczegóły: [Instrukcja admina](docs/ADMIN_PANEL.md#wybrane-rocznice-wikipedii--pierwsza-partia-do-produkcji-10-000-wydarzeń).

**To infrastruktura produkcji treści, a nie 10 000 gotowych pytań.** Nie zmienia reguł Firestore ani rozgrywki.

## Importer Wikidata (MVP 0.4 — pierwsze źródło)

W **Panel admina → Wikidata** można pobierać partie 25, 50 lub 100 propozycji dla Historii Polski, Historii świata i Nauki w wybranym przedziale lat. Podgląd pokazuje opisy, lata, źródła, braki i istniejące ID w Firestore. Admin zaznacza rekordy i zapisuje je **wyłącznie jako szkice** do weryfikacji — nic nie trafia automatycznie do gry.

**Nie wymaga nowych ustawień Firebase.** Dane zapisują się w istniejącej, admin-only kolekcji `chronikaEvents`. Zobacz [instrukcję importera](docs/ADMIN_PANEL.md#wikidata--pierwszy-importer-źródeł-mvp). To MVP pipeline, nie pobranie wszystkich wydarzeń w Wikidata ani automatyczna publikacja dziesiątek tysięcy pytań.

## Panel admina i rozbudowa bazy (MVP 0.3)

Nowy panel administracyjny zarządza kategoriami oraz wydarzeniami w odrębnych kolekcjach Firebase. Dostęp ma tylko konto z ręcznie przyznanym wpisem admina. **[Instrukcja uruchomienia panelu i nadawania dostępu](docs/ADMIN_PANEL.md)**.

Uwaga: kategorie w panelu stanowią katalog roboczy. Kampania i szybkie gry wciąż korzystają ze starego zbioru próbnego; pytania dla graczy wczytywane z nowej bazy i weryfikacja treści to kolejny etap. Nie włączać przedwcześnie niesprawdzonych kategorii.

## Co już działa

- Responsywny interfejs: pulpit, kampania, szybka gra i informacyjny ekran areny.
- Trzy **naprawdę grywalne** tryby: **Oś czasu**, **Co było pierwsze?**, **Strzał w rok**.
- **12 etapów** w czterech tematach: kino, historia Polski, sport, popkultura; 3 poziomy na każdy rozdział.
- Odblokowywanie etapów po kolei. Gwiazdki 0–3 według trafności, 20 XP za *nową* gwiazdkę, brak podwójnego naliczania po ponownej grze.
- **66** przykładowych kart z datami i podpowiedziami. Mała próbna baza jest w pliku `src/data.js`.
- Rejestracja i logowanie przez **Firebase Authentication (Email/Password)**, przypomnienie hasła, wylogowanie, edycja nicku. Można też grać jako gość.
- Profil z gwiazdkami, XP, postępem rozdziałów, sesjami, skutecznością, czasem gry, kategoriami, trybami i historią ostatnich 8 gier.
- Zapis Firestore w osobnych dokumentach: `chronikaProgress/{uid}`, `chronikaStats/{uid}`, `chronikaProfiles/{uid}`.
- Lokalne kopie danych są przypisane do konkretnego UID; stare wyniki z wersji 0.1 migrują tylko raz. Rejestracja z konta gościa **zachowuje jego UID** i postęp.
- Synchronizacja konta między urządzeniami. Logowanie na inne istniejące konto nie łączy automatycznie postępów obcych graczy.
- Podstawowe testy silnika: `npm test`.

**Jeszcze NIE działa:** 1 na 1 online, turnieje, ranking globalny, obszerna baza treści, backend chroniący przed fałszowaniem wyników. „Arena” wyświetla plan, nie symuluje rywalizacji. Statystyki w MVP są danymi deklarowanymi przez klienta — **nie wolno używać ich do nagród i rankingów multiplayer**.

## Krok 1 — uruchom lokalnie (Windows)

1. Rozpakuj ZIP do nowego katalogu, np. `C:\gry\chronika`.
2. Zainstaluj Node.js 20+ (jeśli go jeszcze nie masz).
3. Otwórz ten folder w VS Code i uruchom terminal.
4. Wpisz:

```powershell
npm run dev
```

5. Otwórz **http://localhost:4173** w przeglądarce.

Żadnego `npm install` nie potrzeba — ta pierwsza wersja celowo nie ma zależności npm. Po edycji plików źródłowych zatrzymaj serwer (`Ctrl+C`) i uruchom `npm run dev` ponownie (komenda przebudowuje pliki).

Sprawdź testy:

```powershell
npm test
```

## Krok 2 — NOWE repozytorium GitHub (nie ruszaj HITSTERIADY)

1. W GitHub kliknij **New repository**.
2. Nazwa robocza: `chronika-game`. Ustaw repozytorium **Private**.
3. Nie zaznaczaj „Add README” (README już jest w paczce).
4. W folderze projektu uruchom:

```powershell
git init
git add .
git commit -m "CHRONIKA MVP 0.1"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN/chronika-game.git
git push -u origin main
```

Zastąp `TWOJ_LOGIN` swoim loginem GitHub. Na GitHubie możesz też użyć „Upload files”, jeżeli nie chcesz pracować z terminalem Git.

## Krok 3 — nowy projekt Firebase

**Nie używaj na razie bazy HITSTERIADY** — nowa gra powinna mieć niezależny projekt i własne reguły. Otwórz [Firebase Console](https://console.firebase.google.com/).

1. **Add project** → np. `chronika-game`.
2. **Project settings → Your apps → Web app** → utwórz aplikację WWW i skopiuj `firebaseConfig` (6 pól).
3. **Authentication → Sign-in method** → włącz **Anonymous** ORAZ **Email/Password**.
4. **Firestore Database → Create database** → wybierz region odpowiedni dla graczy (nie zmienisz go później łatwo); uruchom z restrykcyjnymi regułami.
5. **Firestore Database → Rules** → zastąp reguły najnowszym kodem z `firestore.rules`, a następnie kliknij **Publish**. Reguły MVP 0.1 nie wystarczą do zapisu profili i statystyk.
6. Konfiguracja Firebase jest już wpisana w `scripts/build.mjs`. Nie musisz tworzyć `.env.local` ani dodawać zmiennych w Vercel. W razie zmiany projektu możesz opcjonalnie nadpisać wartości, korzystając ze wzoru `.env.example`:

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=twoj-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=twoj-projekt
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_STORAGE_BUCKET=twoj-projekt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
```

7. Zatrzymaj i ponownie uruchom `npm run dev`. Status aplikacji powinien pokazać **FIREBASE TEST**. Reguły dają dostęp graczowi wyłącznie do własnego dokumentu `/chronikaProgress/{uid}`.

**Ważne:** anonimowe konto gościa jest powiązane z sesją Firebase danej przeglądarki. Rejestracja e-mail+hasło zachowuje jego UID i postęp. Istniejące konto pozwala wejść na różnych urządzeniach. Wyniki zapisane przez klienta NIE są bezpieczną podstawą rankingu — 1v1 będzie weryfikowane po stronie serwera.

## Krok 4 — Vercel

1. Otwórz [Vercel](https://vercel.com/new), **Add New Project → Import Git Repository**.
2. Wybierz nowe repo `chronika-game` (nie `music`).
3. **Framework Preset:** Other; **Build Command:** `npm run build`; **Output Directory:** `dist`.
4. **Environment Variables**: nie musisz nic dodawać. Publiczna konfiguracja Firebase projektu `chronika-2813f` jest już uwzględniona w `scripts/build.mjs`. Opcjonalnie można nadpisać ją sześcioma zmiennymi `VITE_FIREBASE_...`. Nie dodawaj `.env.local` do GitHub.
5. Wdrożenie → **Deploy**. Weryfikacja: otwórz URL Vercel, zagraj w pierwszy etap, zdobądź gwiazdkę, odśwież stronę, sprawdź progres; sprawdź nowy dokument w Firestore.

**Nie wstawiaj żadnego service-account private key do kodu klienta.** Firebase *web config* jest jawna i polega na regułach bezpieczeństwa.

## Plan rozwoju

| Etap | Zakres | Status |
|---|---|---|
| 0.1 | Tryby solo, 12 etapów, próbne karty i progres | **W paczce** |
| 0.2 | Konta e-mail / logowanie, profile i chmurowe zapisy | **W kodzie — wymaga publikacji zaktualizowanych reguł Firestore** |
| 0.3 | 1v1 online: lobby, parowanie, rundy, wynik po stronie serwera | Do zrobienia |
| 0.4 | Turnieje, rankingi z ochroną przed oszustwem, osiągnięcia | Do zrobienia |
| 0.5 | Rozbudowana kampania (rozdziały, misje specjalne, bossowie) | Do zrobienia |
| 0.6 | Większa zweryfikowana baza wydarzeń, system edycji treści | Do zrobienia |

## Struktura

- `src/data.js` — próbna baza wydarzeń + pierwsza mapa kampanii.
- `src/engine.js` — **logika gry**, funkcje niezależne od interfejsu.
- `src/main.js` — widoki i sterowanie rozgrywką.
- `src/styles.css` — oprawa graficzna (desktop + mobile).
- `src/store.js` — localStorage per UID, jednorazowa migracja 0.1 i łączenie progresu.
- `src/playerStats.js` — niezależny silnik statystyk gracza (kampania / szybkie gry, tryby, kategorie).
- `src/firebase.js` — Firebase Auth (gość, email, hasło) i dokumenty progresu, statystyk oraz profilu.
- `firestore.rules` — restrykcyjne reguły dla demonstracyjnych zapisów.
- `scripts/build.mjs` — budowanie katalogu `dist`, wstrzykiwanie publicznej konfiguracji Firebase.
- `tests` — testy silnika.

### Uwaga dotycząca treści

Dane w próbnej bazie są autorskimi streszczeniami i powinny przejść weryfikację faktograficzną przed upublicznieniem dużej gry. Do plakatów filmowych i innych mediów będziemy potrzebować legalnych źródeł lub odpowiednich licencji.
