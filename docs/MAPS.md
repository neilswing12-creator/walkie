# Maps — admin-configurable providers

Admin → **Maps** (`/admin/maps`, ADMIN+) sets an ordered provider list for each platform. Changes apply on the clients' next config refresh (≤ 5 min) without an app update.

| Platform | Google Maps | Apple Maps | Open map (MapLibre) |
|---|---|---|---|
| Web | Maps JavaScript API | MapKit JS | ✔ |
| iOS app | Native Google Maps SDK (`@capacitor/google-maps`) when "native SDK" is on; otherwise JS API | MapKit JS inside the web view (labelled as such; not native MapKit) | ✔ |
| Android app | Native Google Maps SDK when "native SDK" is on; otherwise JS API | **Not offered** (Apple has no Android map SDK) | ✔ |

Rules enforced in code (`src/lib/maps/*`, `src/lib/client/maps.ts`):
- A provider the admin **disabled is never used**, even if every other provider fails.
- If an enabled provider fails to load, the next *enabled* one is tried. If none work, the route is drawn as a plain SVG line. A fake map is never shown.
- A provider without credentials is reported "not ready" in admin and skipped.
- Apple tokens are signed server-side (ES256, 30 min, origin-bound). The .p8 key never reaches the client.
- Route maps are only shown to the owner unless they share the activity. Public leaderboards never expose routes.

Verification status: web Open map is PASS (rendered in Chromium). Google and Apple are PARTIALLY VERIFIED (config/fallback logic is tested, but there are no real keys in CI). The native Google SDK on devices is NOT TESTED; check it on a physical iPhone and Android phone before release.
