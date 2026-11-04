# Visual-quality reference analysis → Walkie living character & wardrobe

**Source:** `ScreenRecording_11-04-2026_19-07-22_1.mp4`. Specs: 512×1106, 30 fps, 30.9 s, **927 frames** (a few duplicated frames in the VFR container were normalised).
**Method:** Every frame was extracted at 30 fps (`ffmpeg -vf fps=30`). Per-frame mean absolute luminance difference was computed for all 926 consecutive frame pairs, two ways:
- over the full screen, to find UI motion and cuts;
- over a character-only crop (x 60–450, y 120–560), to separate character animation from UI.

I then reviewed contact sheets at 0.5 s intervals for the whole video, and frame-by-frame strips (1/30 s per tile) of these moments:
- idle (0–2 s);
- hat swap (#140–169);
- glasses swap (#296–315);
- shoe swap and the transition to the profile screen (#838–887).

The recording is another pet app's **Closet** screen, followed by its profile and home screens. Walkie uses none of its character, items, copy or branding; only the principles below carry over.

## 1. Timestamped breakdown

| Time | Frames | What happens |
|---|---|---|
| 0.0–1.9 s | 1–57 | Closet, character idle. Character-region diff median 0.22, which means near-static with tiny breathing. Single blinks at #4, #19, #38 (1–3 frames). |
| 1.9–2.1 s | 57–64 | Hat tapped → **hard swap** (1 frame) → mouth opens to "o" for ~10 frames. |
| 2.8–3.0 s | 85–90 | Another hat → swap + eye squint + "o" (character diff peaks at 4.1). |
| 4.7–5.0 s | 143–152 | Baker's hat equipped. Card border animates in (~170 ms), check badge pops, "Owned"→"Wearing". Character: squint → round "o" (#150–163, ≈430 ms). |
| 8.4–8.7 s | 254–261 | Category tab switch (Hat → Eyes). Grid cross-fades and slides up (~230 ms). |
| 9.8–10.5 s | 296–315 | Glasses swap. **3-frame crossfade** (#297–300, 100 ms) while the eyes close happily, eyes reopen, then a **blink** (#306–310, ≈170 ms). |
| 11–17 s | 334–510 | Rapid browsing of glasses and neck items. Each tap gives an instant visual apply plus a micro-reaction. Scrolling the grid runs at momentum, ~300 ms. |
| 18.0–18.4 s | 541–554 | Neck item. Large ribbon applied; the left slot tile thumbnail updates in the same frame. |
| 24–26 s | 721–784 | Hand-held items. An animated prop shows **play/replay controls** to preview its animation. |
| 27.4–28.4 s | 824–852 | Bag, then shoes. One-eye **wink** at #852. |
| 28.5–29.3 s | 856–880 | Rain boots applied → a little **stomp/step dance** (foot lifts at #866–880, ≈0.5 s). |
| 29.4 s | 883 | Hard cut (diff 36.3) to the profile screen: an illustrated canal/street backdrop, a name card with a title badge and a "months of walks together" line, a badge "Showcase" (Platinum), and stat tiles. |
| 30.1 s | 905 | Cut to home: big step count over goal, gold progress bar, journey/friends cards, "Daily race". |

## 2. What makes it feel premium
- **Instant apply, then react.** The item swaps in ≤1 frame (or a 100 ms crossfade). The character then reacts in sequence: squint → blink → "o" mouth → small body move, about 0.4–1.3 s in total. It never stands still after a change.
- **The character is the anchor.** It is large and centred, framed by **equipped-slot tiles** (4 left, 4 right) that mirror what's worn, so you can see at a glance what changed.
- **Restraint at idle.** Breathing is barely visible and blinks are short and irregular. Motion is concentrated around interactions, so it feels alive without being noisy.
- **Item icons are the item itself.** Painted miniatures sit on soft cream tiles with consistent lighting from top-left. State is shown with "Owned / Wearing", a green check and a selection border.
- **Soft, lit environments.** A pale green gradient with a vignette behind the closet, plus a soft ground shadow. The profile uses a detailed illustrated scene with depth (foreground railing, mid-ground trees, far buildings).
- **Typography and chrome:** rounded sans, small bold labels, pill buttons ("Looks", "Shop"), counts ("23 yours").

## 3. Existing Walkie assets & technology (before this pass)
- **Walkie:** a **2D vector SVG** character (one file) with CSS keyframe animation: breathing, blink, ear twitch, head turn, tail wag, plus 19 moods (walk/run/bike/jump/sleep…). There is no skeleton or sprite sheet, and it is not 3D.
- **Clothing:** 12 flat accessories drawn as one group *on top of* Walkie, so hats did not tilt with the head and nothing sat under the head. Only HEAD/NECK/BACK slots.
- **Icons:** stroke line icons plus some emoji.
- **Limitation, stated honestly:** SVG + CSS gives smooth, cheap, crisp 2D animation, but **not true 3D rotation**. "Inspect/rotate" is therefore a **Twirl** (scale-X turn-around), not a 3D model spin. Real fur simulation, cloth physics or arbitrary-angle views would need a rigged 3D or Rive/Spine asset made by an artist (see §6).

## 4. Strategy chosen
Keep the SVG architecture: tiny, sharp at any size, themeable, already used everywhere, and good for battery. Upgrade it in place:
1. **Rendering:**
   - Colour-independent shading overlays: a radial key light, a bottom shade and a micro fur-stroke texture pattern.
   - Gradient irises with a rim and catch-lights.
   - Chest and head-top fur tufts, inner-ear shading, and a soft radial ground shadow.
   - Shared paint servers live in `WalkieDefs` (one copy per page; share exports inject them).
2. **Layered rig:** clothes render into **8 layers** (behind, torso, back paws, front paws, front, neck, face, head):
   - sleeves and shoes live inside the leg groups, so they move with walking;
   - hats and glasses live inside the head group, so they tilt with it;
   - capes and wings hang behind the body.
3. **LivingWalkie** (`components/mascot/LivingWalkie.tsx`):
   - An idle scheduler plays a micro-behaviour every 2.8–7 s, weighted: look around, tilt, ear flick, sniff, stretch, yawn, wiggle.
   - **Pointer gaze tracking.**
   - **Tap** → hop + giggle; **4 rapid taps** → jump/celebrate; **press & hold** → petting.
   - Scripted reactions reuse the reference timings: `equip` = squint → blink → "ooh" + stomp → settle (1.3 s); `rare` = wide eyes → celebrate.
   - Pauses off-screen or when the tab is hidden; under reduced motion only expressions change.
4. **Wardrobe:** 46 items in 6 slots (HEAD, FACE, NECK, BODY, BACK, FEET) and 10 category tabs.
   - Try-on preview for unowned items, buy & wear, saved looks, reset, twirl.
   - Style (Classic / Boy-style / Girl-style) and 5 fur tones.
   - Item icons are **cropped from the same art Walkie wears**, so they always match.
5. **Premium icon system** (`AppIcon`): 28 icons sharing one material (gradient tile, top gloss, bottom shade, drop shadow, shadowed glyph). They replace emoji and line icons on Home, the pet screen, the wardrobe and the leaderboard.
6. **Environments:** the `Scene` backdrop has time-of-day lighting (dawn / day / golden hour / night with stars and fireflies), drifting clouds and swaying grass.

## 5. Character presentation (inclusive by design)
- **Same Walkie in every style:** same face, gray-and-white fur, blue eyes, proportions and rig.
  - "Girl-style" adds small lashes and warmer blush.
  - "Boy-style" adds slightly bolder brow markings and a fuller cheek ruff.
  - Each style comes with a different **starter outfit**. All starter items are free for everyone.
- **Optional and changeable:** picked in onboarding (labelled "optional, change anytime") and changeable later in the wardrobe. It is never asked as, or inferred from, gender, and any style can wear any item.

## 6. What would need new assets (not faked)
- A **true 3D or rotatable Walkie** would need a rigged 3D model (glTF) or a Rive/Spine rig with clothing slots, made by a character artist. The current SVG rig is structured so its slot model maps 1:1 onto such a rig.
- **Painted, hand-textured item art** (like the reference's illustrated items) would need an illustrator. The current items are hand-built vectors with fabric sheen, gloss, stitching and folds, and are fully dynamic (colour variants, admin-editable).
- **Hand-item animations** (the reference's "play" previews) are not implemented; Walkie has no hand slot.
