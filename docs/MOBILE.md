# Mobile apps (Capacitor 7)

The iOS and Android apps are Capacitor shells around the same Next.js app (`capacitor.config.ts`, appId `run.walkie.app`). The shell loads `CAP_SERVER_URL`. Native plugins are called through `src/lib/native/*`, which degrade to web APIs in the browser.

```bash
npm run build            # or deploy the web app and set CAP_SERVER_URL to it
npx cap add ios && npx cap add android   # first time only
npm run cap:sync
npm run cap:ios          # opens Xcode   (macOS)
npm run cap:android      # opens Android Studio
```
On **Windows** you can build and test Android locally. The iOS build needs a Mac (or a cloud Mac / CI such as Codemagic, Bitrise or EAS-style runners).

## Permissions (all primed in-app with a friendly explainer before the OS prompt)

### iOS — `ios/App/App/Info.plist`
| Key | Text |
|---|---|
| `NSLocationWhenInUseUsageDescription` | "Walkie uses your location while you track a walk, run or ride to measure distance and draw your route. Routes stay private unless you share them." |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | "Allow background location so your activity keeps recording with the screen off." |
| `UIBackgroundModes` | `location` |
| `NSHealthShareUsageDescription` | "Walkie reads your steps and workouts from Apple Health to reward your daily activity." |
| `NSHealthUpdateUsageDescription` | "Walkie can save the walks, runs and rides you track to Apple Health." |

Also enable the **HealthKit** capability (Signing & Capabilities) and, for push, **Push Notifications** + **Background Modes → Remote notifications**.

### Android — `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<!-- Health Connect -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_EXERCISE" />
<uses-permission android:name="android.permission.health.WRITE_EXERCISE" />
```
Health Connect also needs:
- the privacy-policy activity-alias required by Google (see the `@capgo/capacitor-health` README);
- the Health Connect declaration in the Play Console.

## Integrations in the app
- **Steps:** `syncHealth()` reads daily step totals and posts them to `/api/health/sync`.
  - The server stores the source (HealthKit / Health Connect).
  - Only these platform-sourced steps count for step missions, step boards and duels.
- **Tracking:** `watchLocation()` streams GPS to the tracker. The server owns the session clock, so moving time can't be inflated.
- **Push:** `enablePush()` registers the FCM token at `/api/push/register`; the server sends via FCM v1.
- **Purchases:** RevenueCat on device; entitlement is granted only by the RevenueCat webhook.
- **Install token:**
  - The app requests a server-signed install ID (`/api/device/token`).
  - It is stored locally and sent as `x-walkie-install` on sign-up and log-in.
  - It is used only for referral anti-abuse.
  - It is not a hardware identifier, and no fingerprinting is involved.

## App icon & splash
The master artwork is `design/app-icon.svg` (1024×1024, full-bleed). `assets/*.png` are rendered from it:
- `icon-only.png`: iOS, no transparency.
- `icon-foreground.png` + `icon-background.png`: Android adaptive layers. The character sits inside the 66% safe zone.
- `splash*.png`.

The native sizes are generated with:
```bash
npx @capacitor/assets@3.0.5 generate --iconBackgroundColor '#5675C4' --iconBackgroundColorDark '#2F4789' \
  --splashBackgroundColor '#EAF2FC' --splashBackgroundColorDark '#242B35'
rm -rf icons public/manifest.webmanifest   # the tool also writes PWA files we don't use (src/app/manifest.ts is canonical)
npx cap sync
```
Store listing uploads are in `design/store/`:
- `play-store-icon-512.png`: Play Console, 512×512, 32-bit PNG.
- `app-store-icon-1024.png`: App Store Connect, 1024×1024, no alpha.

## Publishing (there is no Flutter project — the store apps are the `android/` and `ios/` Capacitor projects)

**Android → Google Play**
1. `npm run cap:sync`, then `npm run cap:android` to open Android Studio.
2. Set `versionCode` (+1 per upload) and `versionName` in `android/app/build.gradle`.
3. Build → Generate Signed App Bundle → **AAB**. Create the upload keystore once and back it up; it is never committed.
4. Play Console:
   - create the app `run.walkie.app` and upload to Internal testing first;
   - fill in Data safety (location, health, and fitness data), the Health Connect declaration, the privacy policy URL `https://walkie.run/privacy`, and the foreground-service (location) declaration.

**iOS → App Store** (needs a Mac with Xcode, or a cloud Mac/CI)
1. `npm run cap:sync`, then `npm run cap:ios`.
2. Signing & Capabilities: set your Team, then add HealthKit, Push Notifications, and Background Modes (Location updates, Remote notifications).
3. Set Version / Build, then Product → Archive → Distribute App → App Store Connect.
4. Test with TestFlight, then submit with the App Privacy answers and the HealthKit usage explanation.

**Payments in the apps:** digital Walkie+ passes inside the store apps must use in-app purchase (RevenueCat). Stripe and PayMongo checkout are shown on the web only; the apps hide those buttons.

## Store listings
There are no store links on the website until real listings exist. The site shows an honest "early preview" waitlist instead.
