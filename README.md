# Wardrobe

A phone-first closet. Photograph a shirt, shoe, watch, or kurta. The app keeps the photo on the phone and suggests what to wear for the occasion and the weather.

Live site (after GitHub Pages is enabled): https://cappy7.github.io/wardrobe/

## What stays on the phone

Clothes, photos, wear history, and backups live in this browser (IndexedDB). The app asks the browser to keep that storage. Export a backup every month. iPhone can clear site data if storage is low or the app is unused for a long time.

## What needs the network

- Weather and city search use Open-Meteo. No key. The last weather stays visible with an offline label.
- Tagging a new photo, and the optional stylist note, call the Cloudflare Worker. The Gemini key never goes in the app or this repo.
- Outfit suggestions themselves are rules on the phone. They work offline.

Worker URL: `https://wardrobe-proxy.pervertonichan.workers.dev`

## Run it on a laptop

```bash
npm install
npm run dev
```

Open http://localhost:5173/wardrobe/

```bash
npm test
npm run build
```

## Deploy the site

The workflow is `.github/workflows/deploy.yml`. It runs on every push to `main`.

GitHub → this repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.

The live link then shows under Settings → Pages, and in the Actions tab when the run is green.

## Update the Worker

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

The secret must still be named `GEMINI_API_KEY` after deploy. Check Cloudflare → Workers → wardrobe-proxy → Settings → Variables. If the secret disappeared, run `npx wrangler secret put GEMINI_API_KEY` and paste the key yourself in that prompt. Do not commit it.

Allowed browser origins are `https://cappy7.github.io` and `http://localhost:5173`.

## Rotate the Gemini key

1. Create a new key in Google AI Studio.
2. Run `npx wrangler secret put GEMINI_API_KEY` and paste the new key.
3. Delete the old key in Google AI Studio.

## Background cleaner

Photos are cleaned on the device by lifting a plain background (the sheet the guide asks for) and cropping to the piece. A busy background keeps the original crop. `@imgly/background-removal` was not used: that library is AGPL.

## iPhone splash

Android uses the manifest icon and `background_color`. iPhone uses the apple touch icon. Separate startup images for every phone size were skipped.

## Known limits

- The free Gemini tier has daily limits that change, and Google may use free-tier inputs to improve its products. Only clothing photos are sent.
- If AI is down, the photo is still saved as "Waiting". Settings → Retry pending AI analysis.
- Colour harmony is simple on purpose.
- Suggestions get better after you wear and skip real outfits.
- There is no account and no cloud sync.
