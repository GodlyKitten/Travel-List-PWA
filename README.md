# PackRat

Mobile-first PWA packing checklist. Generates a starting list from a trip type (international/domestic, short/long), then lets you customize, name, save, duplicate, and reset lists. Saves to localStorage. Installable to your iPhone home screen. Works offline after first load.

## Develop

```bash
npm install
npm run dev
```

Open the printed URL in a browser. On a phone on the same network, find the LAN URL printed by Vite.

## Build & preview

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ over HTTP (use for PWA testing)
```

## Deploy (Vercel)

`vercel.json` is committed — Vercel auto-detects Vite, runs `npm run build`, and serves `dist/`. The config also sends `Cache-Control: max-age=0, must-revalidate` for `sw.js`, `registerSW.js`, and `manifest.webmanifest` so PWA updates land immediately instead of being cached forever.

### One-time setup

```bash
npx vercel login        # opens browser to sign in
npx vercel link         # link this folder to a Vercel project (creates one if needed)
```

### Deploy

```bash
npx vercel              # preview deploy (gets a unique URL)
npx vercel --prod       # promote to production
```

Or just push to a GitHub repo connected to the Vercel project — Vercel auto-deploys on every push.

The PWA fully installs only over HTTPS. Vercel gives you HTTPS for free on all preview + prod URLs.

## Install on iPhone

1. Open the deployed URL in Safari on the iPhone.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Launch from the home screen — runs standalone, no browser chrome.
5. After first launch, the app works offline.

## Project layout

```
index.html               app shell + iOS meta tags
vite.config.js           vite + vite-plugin-pwa
public/icons/            PWA icons (192, 512, 180, favicon)
src/
  main.js                entry: router + storage banner
  state.js               localStorage CRUD
  templates.js           trip-type → items + generation + reset
  router.js              hash router
  ui.js                  DOM helpers + modal/prompt
  components/topbar.js   green top bar
  views/
    setup.js             trip setup wizard
    checklist.js         checklist view + edit mode
    mylists.js           saved lists screen
  styles.css             single stylesheet
```

## Adding more trip-type axes

`src/templates.js` is data-driven. To add a weather axis, set `tripType.weather` in the setup view and tag items with `requires: { weather: 'cold' }`. No other changes needed.

## Replacing icons

Drop replacement PNGs into `public/icons/`. The names must match `vite.config.js`:

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512 (also used as the maskable variant)
- `icon-180.png` — 180×180 (iOS apple-touch-icon — **required** for Add to Home Screen)
- `favicon.ico`
