# Walkie.run — 4-pubmat launch campaign (1080 × 1080)

| # | File | Headline | CTA |
|---|---|---|---|
| 1 | `out/walkie-pubmat-01-introduction.png` | Every step is an adventure. | Meet Walkie |
| 2 | `out/walkie-pubmat-02-wardrobe-pet-shop.png` | Your Walkie. Your style. Your world. | Create your world |
| 3 | `out/walkie-pubmat-03-leaderboard-community.png` | Move together. Compete together. | Find your pack |
| 4 | `out/walkie-pubmat-04-fitness-tracking.png` | Every move counts. | Start moving with Walkie |

`out/walkie-pubmats-preview.png` shows all four together.

## Visual direction
**One stage, four moods.** Every pubmat shares the same frame:
- Walkie.run app icon and wordmark top-left, step counter `0X / 04` top-right.
- A soft, lit backdrop with bokeh and a fine grain.
- App-style frosted cards.
- Fredoka headlines with a blue gradient key phrase, and Nunito body copy.
- The same footer: the CTA pill, then "walkie.run · Early preview".

Each pubmat gets its own accent so the set isn't monotonously blue:
- 1: sunny gold, rewards.
- 2: blush and lavender, style.
- 3: violet and champion gold, competition.
- 4: fresh mint, fitness.

**The mascot is the real thing.** Every character is rendered straight from the app's components (`src/components/mascot/*`): the same SVG rig, fur, blue eyes, proportions and wardrobe art users see in the app. Each is frozen on an expressive animation frame (waving, running, cheering). The pet shop in #2 is rendered by the app's own isometric engine (`src/components/shop/world.ts`).

**Real map, plausible route (#4).** The map is real OpenStreetMap data via OpenFreeMap. The sample route is snapped to actual street geometry:
1. Start at Rizal Park, then Roxas Boulevard → Bonifacio Drive → Anda Circle.
2. Andres Soriano Avenue → General Luna Street through Intramuros.
3. Maria Orosa Street → Kalaw Avenue, finishing back at the park.

It measures 3.58 km. The stats use the app's own formulas: 7'05"/km pace → 25:22; running step estimate; MET-based calories; 7 points/min for an outdoor run. Map attribution is shown on the image as the licence requires.

**Honest by design.**
- The app is in early preview, so every footer says "Early preview" and the CTAs avoid "download now".
- The leaderboard and the run are labelled **Sample**.
- The names on the leaderboard are illustrative, not real users.
- Every feature shown is implemented: wardrobe (47 pieces), pets, pet shop, friends/global/country boards, GPS tracking, rewards and badges ("First 1K" is a real badge).

## Editing & re-rendering
The source files are editable HTML/CSS:
- `walkie-pubmat-0X-*.html`: the layout and copy for each pubmat.
- `campaign.css`: the shared art direction.
- `build-pubmats-3-4.py`: generates the #3 and #4 HTML.

To re-render:
```bash
npx tsx --tsconfig scratch/tsconfig.json marketing/pubmats/build-parts.tsx   # characters/icons from the app
python3 -m http.server 8766 --bind 127.0.0.1 &                              # from the repo root
NODE_PATH=$(npm root -g) node marketing/pubmats/render.cjs                   # → out/*.png (2× render, downsampled to 1080)
```
`map.html` regenerates the Manila map and route, and `shop-scene.ts` the pet-shop render (see the comments in each).
