# Onboarding reference analysis (Clucky screen recording → Walkie FTUE)

**Source:** `ScreenRecording_11-04-2026_18-06-36_1.mp4` — 55.27 s, 512×1106, 30 fps, **1,658 frames**.
**Method:** every frame extracted at 30 fps (`ffmpeg -vf fps=30`); per-frame mean absolute pixel difference computed for all 1,657 frame pairs to locate every motion segment; labelled contact sheets at 0.5 s intervals for the whole video; frame-by-frame strips (1/30 s) of the wake-up, first transition, answer→next transition and egg hatch.

The goal was to understand *why* it feels good — pacing, interaction density, motion — not to copy its content. Walkie uses none of Clucky's branding, art, copy or alarm concepts.

## 1. Screen sequence (chronological)

| # | Time | Screen | Interaction |
|---|---|---|---|
| 1 | 0.0–1.5 s | Mascot asleep, "Tap to wake" + tap glyph | Tap anywhere |
| 2 | 1.5–2.7 s | Startle "!!!" → eyes open, head turn → "Hi! I'm …" | Automatic |
| 3 | 2.7–4.4 s | "Ready to answer a few questions?" mascot with laptop, privacy + price note, CTA | Tap CTA |
| 4 | 4.4–8.9 s | Q1 single choice (3 options), progress bar + back + skip appear | Tap option → auto-advance |
| 5 | 8.9–10.3 s | Explainer comparison card ("now vs with us") | Continue |
| 6 | 10.3–11.3 s | Q2 single choice | Tap option → auto-advance |
| 7 | 11.3–19.4 s | Time picker: huge rolling digits + horizontal tick "ruler" scrubber; CTA label updates live | Drag ruler |
| 8 | 19.4–25.8 s | Day selection: 7 chips + presets (Every day / Weekdays / Weekends), live summary line; CTA disabled + helper when empty | Multi-select |
| 9 | 25.9–28.4 s | Permission primer card ("stays on device…") → native OS permission dialog | Continue → Allow |
| 10 | 28.4–37.4 s | Horizontal carousel of illustrated method cards, checkmark on selected | Swipe + tap |
| 11 | 37.4–44.4 s | Sound list with preview play buttons + toggle | Tap to preview/select |
| 12 | 44.4–48.0 s | "Will you hear it?" test button with pulse ring + troubleshooting steps | Tap test |
| 13 | 48.0–50.4 s | "Tap the egg": cracks per tap; CTA ("I promise") fills like a progress bar per tap; hatch reveals mascot | Repeated taps |
| 14 | 50.4–53.4 s | "Hatching your plan": checklist ticks one item every ~0.5 s | Automatic |
| 15 | 53.4–55.0 s | Plan summary (timeline + big time) + "Let's go" | Tap CTA |
| 16 | 55.0 s | Social-proof review screen (reviews) | — |

## 2. Animation timeline (measured)

| Moment | Frames | Duration | Type / easing |
|---|---|---|---|
| Wake: eyes open | #44→#46 | ~67 ms | hard cut on eyes, then head turn |
| Wake: head turn + settle | #46→#58 | ~400 ms | ease-out, slight overshoot |
| Wake: caption swap "Tap to wake"→"!!!"→greeting | #46→#50 | ~130 ms | opacity crossfade |
| Intro → Q1 | #131→#138 | ~230 ms | crossfade + **shared mascot moves from centre to top-left peek**; diagonal backdrop band fades in; progress/back/skip fade in |
| Answer highlight | #256→#262 | ~200 ms | fill colour ramps to selected tint |
| CTA enable | #255→#260 | ~170 ms | opacity ramp |
| Answer → next screen (auto-advance) | tap #254 → next screen settled #268 | ~470 ms total (≈270 ms dwell + 200 ms crossfade) | |
| Screen → screen (generic) | 5–7 frames | 170–230 ms | crossfade, content rises a few px |
| Rolling time digits | continuous while scrubbing | per-digit blur roll | vertical motion blur |
| Day chip toggle | 1–3 frames | ≤100 ms | instant fill |
| Permission dialog dim | #813→#823 | ~330 ms | background dims |
| Carousel | #931→#962 | ~1 s fling | momentum scroll |
| Egg crack / hatch | #1458→#1473 | crack per tap ~100 ms; hatch ~200 ms | shell splits, mascot pops |
| Plan checklist | ~15 frames per item | ~500 ms per tick | sequential |

## 3. Interaction analysis
- **One decision per screen**, mostly single-tap. Single-choice questions **auto-advance** (~0.3 s after tap) — no extra "Continue" tap.
- Multi-select and pickers use an explicit CTA whose **label reflects the choice** ("Set alarm for 8:30 AM").
- CTA is **disabled until valid**, with a gentle helper line explaining what's missing.
- Persistent chrome after the intro: back arrow, **thin progress bar** that grows each step, "Skip" on optional steps.
- **Playful micro-tasks** (tap to wake, tap the egg) turn setup into play; the CTA itself fills as progress.
- Permissions are **primed with a friendly explainer before** the OS dialog.
- A short **"building your plan" checklist** creates anticipation before the summary.

## 4. Visual analysis
- Warm light-grey background; a **diagonal lighter band** behind the mascot on question screens.
- Rounded geometric sans, tight headings (~22 px bold), short body copy.
- White option cards, ~12 px radius, generous height; selected = solid brand tint.
- Full-width pill-ish CTA pinned to bottom with arrow glyph.
- Mascot is the anchor: big and centred on emotional screens, small "peeking" at top-left on question screens.

## 5. What Walkie keeps vs. changes
**Keeps (principles):** tap-to-wake opener, one decision per screen, auto-advance on single choice, shared-element mascot movement, thin progress bar + back + skip, live-updating CTA labels, scrubbable big-number picker, primed permissions, a tactile "tap" micro-game, a plan-building checklist, ~200 ms crossfades with ease-out.

**Changes (original Walkie):** husky mascot (sleeping in its basket), walking/running/cycling questions, step-goal ruler instead of a time picker, a pet-naming moment, an isometric pet-shop reveal, a **gift you tap open** (reveals the real starter rewards) instead of an egg, blue/grey palette, no fake reviews (Walkie shows an honest "early preview" note instead), and timings slightly calmer: 220 ms screen transitions, 380 ms mascot moves, 320 ms auto-advance dwell, all disabled under `prefers-reduced-motion`.

## 6. Walkie FTUE — screen-by-screen

| # | Screen | Walkie | Interaction |
|---|---|---|---|
| 0 | Tap to wake | asleep in basket (sleep) → "!!!" → greet | tap |
| 1 | Welcome — "Hey there! I'm Walkie!" | greet, centre | "Let's go!" |
| 2 | "Every step helps us grow!" | walks beside an animated shop | Continue |
| 3 | Choose your adventure (Walk / Run / Bike / A bit of everything) | pose changes with choice | single choice, auto-advance |
| 4 | Fitness goals (6 cards, choose up to 3) | peek | multi-select + CTA |
| 5 | Activity level (4, encouraging copy) | peek | single choice, auto-advance |
| 6 | Daily step goal — rolling number + ruler + presets | reacts to value | scrub / presets, CTA "Set my goal: 7,500 steps" |
| 7 | Meet your buddy — tap to pet, name your pup | sit → interact → celebrate | tap + name |
| 8 | Your little world — shop builds itself | walk | Continue |
| 9 | Reminders — primer + time-of-day chips | holds bell | "Remind me" / "Not now" |
| 10 | Steps & location — primers per permission | discover | per-permission buttons / later |
| 11 | Create account (Apple / Google / email / log in) | greet | auth |
| 12 | Packing your adventure bag → tap the gift → rewards → shop appears | celebrate | tap gift, "Enter Walkie" |
