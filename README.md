# 💐 Niespodzianka — bukiet, który nigdy nie zwiędnie

Jednostronicowa strona-niespodzianka: gwiaździste niebo → przycisk „Kliknij 💌” → rosnący bukiet →
wiadomość pisana litera po literze → fajerwerki z serduszek po dotknięciu ekranu.

Czysty HTML + CSS + JS, bez bibliotek i bez budowania. Pliki:

| Plik         | Co zawiera                                                    |
|--------------|---------------------------------------------------------------|
| `index.html` | struktura strony + tytuł i podgląd linku (og:title, og:image) |
| `style.css`  | wygląd, układ mobilny, animacje CSS                           |
| `script.js`  | **CONFIG na samej górze** + animacje bukietu i cząsteczek     |
| `og.png`     | obrazek podglądu linku w Messengerze/WhatsAppie               |

## ✏️ Jak zmienić imię, tekst i datę

Otwórz `script.js`. Na samej górze jest obiekt `CONFIG`:

```js
const CONFIG = {
  imie: 'Julcia',
  wiadomosc:
    '{imie}, jestem daleko, ale myślami cały czas przy Tobie. ' +
    'Ten bukiet nigdy nie zwiędnie. Mam nadzieję, że zobaczymy się niebawem. ❤️',
  podpis: 'Twój Łukasz',
  napisStartowy: 'Mam dla Ciebie coś…',
  przycisk: 'Kliknij 💌',
  pokazLicznik: true,
  dataPowrotu: '2026-12-20',
  muzyka: 'muzyka.mp3',
  glosnosc: 0.6,
  tempoPisania: 55,
};
```

- **`imie`**: wstawia się w miejsce `{imie}` w wiadomości.
- **`wiadomosc`**: główny tekst. Możesz pisać po polsku i używać emoji. Jeśli w tekście jest
  apostrof `'`, poprzedź go ukośnikiem: `\'`.
- **`podpis`**: tekst złotym, ozdobnym pismem pod wiadomością.
- **`dataPowrotu`**: data w formacie `RRRR-MM-DD`. Strona sama policzy „Do zobaczenia za X dni”
  (a w odpowiednie dni pokaże „już jutro!” / „już dziś!”). Po tej dacie licznik sam znika.
- **`pokazLicznik: false`**: wyłącza licznik całkowicie.
- **`tempoPisania`**: im mniejsza liczba, tym szybciej pisze się tekst.

## 🎵 Jak dodać lub podmienić muzykę

1. Wrzuć plik audio (najlepiej `.mp3`, do ~3–5 MB) do folderu obok `index.html`.
2. Nazwij go `muzyka.mp3` **albo** wpisz jego nazwę w `CONFIG.muzyka`, np. `muzyka: 'nasza-piosenka.mp3'`.
3. Muzyka startuje po kliknięciu „Kliknij 💌” (przeglądarki, zwłaszcza na iPhonie, blokują dźwięk
   przed pierwszym dotknięciem). W prawym górnym rogu pojawi się przycisk 🔊/🔇.

Jeśli pliku nie ma albo `muzyka: ''`, strona po prostu działa bez dźwięku, bez błędów i bez przycisku.
Na iPhonie głośność ustawia się przyciskami telefonu (`glosnosc` jest tam ignorowana).

## 💻 Podgląd lokalny

W folderze projektu uruchom dowolny prosty serwer, np.:

```bash
python3 -m http.server 8080
# albo
npx serve .
```

i otwórz <http://localhost:8080>. Wersję mobilną najłatwiej sprawdzić w Chrome:
DevTools → ikona telefonu (Ctrl+Shift+M) → iPhone SE / 375 px.

## 🚀 Wdrożenie na Vercel

To statyczna strona, więc nie trzeba niczego konfigurować.

**Opcja A: przez GitHuba (polecana)**
1. Wypchnij repozytorium na GitHuba.
2. Wejdź na <https://vercel.com/new>, zaloguj się przez GitHuba i wybierz to repozytorium.
3. Framework Preset: **Other**. Build Command i Output Directory zostaw puste. Kliknij **Deploy**.
4. Każdy kolejny `git push` automatycznie aktualizuje stronę.

**Opcja B: z terminala**
```bash
npm i -g vercel
vercel          # podgląd
vercel --prod   # wersja produkcyjna
```

**Zmiana adresu:** w panelu Vercel → Project → Settings → Domains możesz ustawić ładniejszą nazwę,
np. `dla-julci.vercel.app`.

### Ładny podgląd linku (WhatsApp / Messenger)

Tytuł „Mam dla Ciebie coś 💐” działa od razu. Żeby pojawił się też **obrazek**, WhatsApp i Messenger
potrzebują pełnego adresu. Po wdrożeniu podmień w `index.html`:

```html
<meta property="og:image" content="og.png">
```

na

```html
<meta property="og:image" content="https://TWOJ-ADRES.vercel.app/og.png">
```

Messenger zapamiętuje podgląd. Jeśli wysłałeś link wcześniej, odśwież go w
<https://developers.facebook.com/tools/debug/> („Scrape Again”).

**Wskazówka:** otwórz link raz sam przed wysłaniem, żeby sprawdzić, czy wszystko działa.

## ♿ Szczegóły techniczne

- Bukiet to SVG: łodygi rosną przez `stroke-dashoffset`, liście i płatki rozwijają się przez
  `transform: scale()`. Rozmieszczenie, tempo i rozmiary są lekko losowe przy każdym otwarciu.
- Gwiazdy, świetliki, płatki, serduszka i fajerwerki rysowane są na `<canvas>` (skalowanym
  z `devicePixelRatio`, max 2×, z gotowymi sprite'ami).
- Na telefonach liczba cząsteczek jest mniejsza.
- `prefers-reduced-motion`: bukiet pojawia się płynnym wyciszeniem, bez kołysania, spadających
  płatków i maszyny do pisania. Fajerwerk po dotknięciu jest delikatny.
- Brak analityki, ciasteczek i zewnętrznych skryptów. Jedyne zewnętrzne zasoby to czcionki
  Google Fonts (Dancing Script, Great Vibes).
- `noindex`: strona nie pojawi się w wyszukiwarkach.
