# CHRONIKA — roboczy tytuł nowej gry (MVP 0.1)

**Osobny projekt**, niezależny od HITSTERIADY. Pierwsza grywalna wersja dla 1 gracza, gotowa do hostowania na Vercel i połączenia z *nowym* projektem Firebase. Nazwa i grafika są robocze.

## Co już działa

- Responsywny interfejs: pulpit, kampania, szybka gra i informacyjny ekran areny.
- Trzy **naprawdę grywalne** tryby: **Oś czasu**, **Co było pierwsze?**, **Strzał w rok**.
- **12 etapów** w czterech tematach: kino, historia Polski, sport, popkultura; 3 poziomy na każdy rozdział.
- Odblokowywanie etapów po kolei. Gwiazdki 0–3 według trafności, 20 XP za *nową* gwiazdkę, brak podwójnego naliczania po ponownej grze.
- **66** przykładowych kart z datami i podpowiedziami. Mała próbna baza jest w pliku `src/data.js`.
- Progres lokalny w `localStorage` i opcjonalna synchronizacja Firestore poprzez **anonimowe logowanie Firebase** po skonfigurowaniu projektu.
- Podstawowe testy silnika: `npm test`.

**Jeszcze NIE działa:** 1 na 1 online, turnieje, ranking globalny, prawdziwe konta ze wspólnym dostępem z wielu urządzeń, obszerna baza treści, backend chroniący przed fałszowaniem wyników. „Arena” wyświetla plan, nie symuluje rywalizacji.

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
3. **Authentication → Sign-in method** → włącz **Anonymous**.
4. **Firestore Database → Create database** → wybierz region odpowiedni dla graczy (nie zmienisz go później łatwo); uruchom z restrykcyjnymi regułami.
5. **Firestore Database → Rules** → zastąp reguły kodem z `firestore.rules`, opublikuj je.
6. W lokalnym pliku `.env.local` wpisz wartości z konfiguracji Firebase, korzystając ze wzoru `.env.example`:

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=twoj-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=twoj-projekt
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_STORAGE_BUCKET=twoj-projekt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456
```

7. Zatrzymaj i ponownie uruchom `npm run dev`. Status aplikacji powinien pokazać **FIREBASE TEST**. Reguły dają dostęp graczowi wyłącznie do własnego dokumentu `/chronikaProgress/{uid}`.

**Ważne:** anonimowy użytkownik Firebase jest powiązany z przeglądarką, a nie hasłem/e-mailem. Prawdziwe konta i logowanie z kilku urządzeń dodamy w osobnym etapie. Wynik zapisany przez przeglądarkę NIE jest bezpieczną podstawą do rankingu — wyniki 1v1 muszą być sprawdzane po stronie serwera.

## Krok 4 — Vercel

1. Otwórz [Vercel](https://vercel.com/new), **Add New Project → Import Git Repository**.
2. Wybierz nowe repo `chronika-game` (nie `music`).
3. **Framework Preset:** Other; **Build Command:** `npm run build`; **Output Directory:** `dist`.
4. **Environment Variables**: dodaj sześć zmiennych `VITE_FIREBASE_...` z `.env.local`. Nie dodawaj samego `.env.local` do GitHub (jest w `.gitignore`).
5. Wdrożenie → **Deploy**. Weryfikacja: otwórz URL Vercel, zagraj w pierwszy etap, zdobądź gwiazdkę, odśwież stronę, sprawdź progres; sprawdź nowy dokument w Firestore.

**Nie wstawiaj żadnego service-account private key do kodu klienta.** Firebase *web config* jest jawna i polega na regułach bezpieczeństwa.

## Plan rozwoju

| Etap | Zakres | Status |
|---|---|---|
| 0.1 | Tryby solo, 12 etapów, próbne karty i progres | **W paczce** |
| 0.2 | Konta e-mail / logowanie, profile i chmurowe zapisy | Do zrobienia |
| 0.3 | 1v1 online: lobby, parowanie, rundy, wynik po stronie serwera | Do zrobienia |
| 0.4 | Turnieje, rankingi z ochroną przed oszustwem, osiągnięcia | Do zrobienia |
| 0.5 | Rozbudowana kampania (rozdziały, misje specjalne, bossowie) | Do zrobienia |
| 0.6 | Większa zweryfikowana baza wydarzeń, system edycji treści | Do zrobienia |

## Struktura

- `src/data.js` — próbna baza wydarzeń + pierwsza mapa kampanii.
- `src/engine.js` — **logika gry**, funkcje niezależne od interfejsu.
- `src/main.js` — widoki i sterowanie rozgrywką.
- `src/styles.css` — oprawa graficzna (desktop + mobile).
- `src/store.js` — localStorage i łączenie progresu.
- `src/firebase.js` — opcjonalne połączenie do **nowego** Firebase.
- `firestore.rules` — restrykcyjne reguły dla demonstracyjnych zapisów.
- `scripts/build.mjs` — budowanie katalogu `dist`, wstrzykiwanie publicznej konfiguracji Firebase.
- `tests` — testy silnika.

### Uwaga dotycząca treści

Dane w próbnej bazie są autorskimi streszczeniami i powinny przejść weryfikację faktograficzną przed upublicznieniem dużej gry. Do plakatów filmowych i innych mediów będziemy potrzebować legalnych źródeł lub odpowiednich licencji.
