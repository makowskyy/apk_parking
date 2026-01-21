# apk_parking

![Expo 54](https://img.shields.io/badge/Expo-54.0.27-000?logo=expo&logoColor=white) ![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=white) ![Platformy](https://img.shields.io/badge/Platformy-Android%20%7C%20iOS%20%7C%20Web-8BC34A) ![Licencja](https://img.shields.io/badge/Licencja-nieokre%C5%9Blona-lightgrey)

Aplikacja mobilna Expo do obsługi płatnego parkowania w strefach miejskich: zakup biletu, mapa stref, portfel użytkownika, zarządzanie pojazdami oraz profil z ustawieniami bezpieczeństwa i powiadomień.

## Galeria

| Start                                             | Logowanie                             | Rejestracja                                |
| ------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| ![Ekran startowy](./assets/screenshots/start.jpg) | ![Logowanie](./assets/gifs/login.gif) | ![Rejestracja](./assets/gifs/register.gif) |

| Home                                           | Mapa                                        | Portfel                                     |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| ![Ekran główny](./assets/screenshots/home.jpg) | ![Mapa stref](./assets/screenshots/map.jpg) | ![Portfel](./assets/screenshots/wallet.jpg) |

| Bilet                                     | Transakcje                                                   | Samochody                         |
| ----------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| ![Zakup biletu](./assets/gifs/ticket.gif) | ![Historia transakcji](./assets/screenshots/transaction.jpg) | ![Pojazdy](./assets/gifs/car.gif) |

| Profil                                           | Ustawienia                                |
| ------------------------------------------------ | ----------------------------------------- |
| ![Profil użytkownika](./assets/gifs/profile.gif) | ![Ustawienia](./assets/gifs/settings.gif) |

## Funkcjonalności

- Ekrany start, rejestracja i logowanie z obsługą biometrii (expo-local-authentication) oraz mock API.
- Dashboard z bieżącym saldem, statusem i odliczaniem biletu oraz skrótami do kluczowych modułów.
- Zakup biletu: wybór pojazdu (dodawanie tablic), stref A/B/C z cennikiem, start teraz lub zaplanowany, czas w krokach 15 min, przypomnienie przed końcem, podsumowanie płatności i zapis w AsyncStorage.
- Historia transakcji: statusy aktywny/zaplanowany/zakończony, szczegóły biletu, możliwość przedłużenia aktywnego postoju z wykorzystaniem salda.
- Portfel: doładowania dowolną kwotą z historią operacji zapisywaną lokalnie.
- Samochody: lista i wybór pojazdów, dodawanie nowych tablic, przykładowe zdjęcia aut, zdjęcie z aparatu oraz rozpoznawanie tablic przez Plate Recognizer (wymaga `EXPO_PUBLIC_PLATE_RECOGNIZER_API_KEY`).
- Mapa stref płatnych: bieżąca lokalizacja użytkownika, poligony stref z `assets/strefy.json`, znaczniki z nazwami stref.
- Profil: dane osobowe, domyślna strefa i czas biletu, preferencje powiadomień, zgody marketingowe, etykieta metody płatności (karta/BLIK).
- Ustawienia: wymuszenie trybu ciemnego, przełącznik powiadomień i biometrii, lokalne powiadomienia (expo-notifications), wersja aplikacji z `app.json`, wylogowanie do ekranu startowego.
- Sesja użytkownika zapisywana w AsyncStorage i automatyczny powrót po restarcie aplikacji.

## Stack technologiczny

- **Core:** Expo ~54.0.27, React Native 0.81.5, React 19.1, TypeScript ~5.9, AsyncStorage, expo-status-bar, expo-navigation-bar, @expo/vector-icons, react-native-vector-icons.
- **Nawigacja:** React Navigation 7 (native-stack, bottom-tabs), react-native-screens, react-native-safe-area-context.
- **Mapy i lokalizacja:** react-native-maps 1.20.1, expo-location 19, dane stref w `assets/strefy.json` (skrypt konwersji `assets/konwersjaMap.py`).
- **Bezpieczeństwo/UX:** expo-local-authentication (biometria), react-native-keyboard-aware-scroll-view, expo-notifications.
- **Media/AI:** expo-image-picker, expo-linear-gradient, Plate Recognizer API (rozpoznawanie tablic).
- **Backend / Mock:** json-server ^1.0.0-beta.3 (`api/db.json`, `api/client.ts`), domyślne URL z `api/config.ts` (port 4000), zmienna `EXPO_PUBLIC_API_URL` do nadpisania URL.

## Instalacja i uruchomienie

1. Klonuj repozytorium i zainstaluj zależności:
   ```bash
   git clone https://github.com/makus2115/apk_parking.git
   cd apk_parking
   npm install
   ```
2. Uruchom mock API (osobne okno terminala):

   ```bash
   npm run api
   ```

   - domyślnie dostępne pod `http://localhost:4000`
   - domyślna baza API jest wybierana w `api/config.ts` (np. `http://10.0.2.2:4000` dla emulatora Android)
   - dane logowania demo: `demo@parking.app` / `demo123` lub `user@parking.app` / `haslo123`
   - aplikacja użyje `EXPO_PUBLIC_API_URL` jeśli zostanie ustawione, inaczej wartości z `api/config.ts`

3. Start aplikacji (Expo):
   ```bash
   npm start          # tryb developerski / Expo Go
   npm run android    # natywny build/uruchomienie na Androidzie
   npm run ios        # natywny build/uruchomienie na iOS
   ```
4. Wymagania środowiska:
   - Node.js, npm, Expo CLI; zainstalowane środowisko Android/iOS lub Expo Go.
   - `app.json` ustawia `userInterfaceStyle: "light"` oraz `newArchEnabled: true` (nowa architektura RN).
5. Testy (Opcjonalnie):
   ```bash
   npm test
   ```

## Struktura katalogów

```
apk_parking/
├─ App.tsx
├─ app.json
├─ index.ts
├─ package.json
├─ tsconfig.json
├─ assets/
│  ├─ adaptive-icon.png
│  ├─ icon.png
│  ├─ parking.png
│  ├─ splash-icon.png
│  ├─ strefy.geojson
│  ├─ strefy.json
│  ├─ map_org.geojson
│  ├─ konwersjaMap.py
│  └─ cars/
│     ├─ car1.png
│     ├─ car2.png
│     └─ car3.png
├─ api/
│  ├─ db.json
│  ├─ client.ts
│  ├─ config.ts
│  └─ types.ts
└─ src/
   ├─ components/
   │  ├─ AppButton.tsx
   │  ├─ ScreenWrapper.tsx
   │  └─ index.ts
   ├─ hooks/
   │  └─ useAppThemeLogic.ts
   ├─ navigation/
   │  ├─ AppNavigator.tsx
   │  ├─ AuthNavigator.tsx
   │  ├─ MainTabNavigator.tsx
   │  └─ types.ts
   ├─ screens/
   │  ├─ StartScreen.tsx
   │  ├─ LoginScreen.tsx
   │  ├─ RegisterScreen.tsx
   │  ├─ HomeScreen.tsx
   │  ├─ TicketScreen.tsx
   │  ├─ TransactionScreen.tsx
   │  ├─ WalletScreen.tsx
   │  ├─ CarScreen.tsx
   │  ├─ MapScreen.tsx
   │  ├─ UserProfileScreen.tsx
   │  ├─ SettingsScreen.tsx
   │  └─ ScreenTemplate.tsx
   ├─ services/
   │  ├─ authApi.ts
   │  └─ authStorage.ts
   ├─ theme/
   │  └─ ThemeContext.tsx
   └─ types/
```
