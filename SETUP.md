# Setup Checklist

Steps to take when starting a new app from this template.

## 1. App identity — `app.config.js`

Replace all `YOUR_*` placeholders:
- `YOUR_APP_NAME` — display name (e.g. "My App")
- `YOUR_APP_SLUG` — URL-safe identifier (e.g. "my-app")
- `YOUR_APP_SCHEME` — deep-link scheme (e.g. "myapp")
- `YOUR_BUNDLE_ID` — iOS bundle ID (e.g. "com.yourname.myapp")
- `YOUR_ANDROID_PACKAGE` — Android package (e.g. "com.yourname.myapp")
- `YOUR_EXPO_OWNER` — your Expo username
- `YOUR_EAS_PROJECT_ID` — from step 4 below
- `YOUR_SENTRY_PROJECT` / `YOUR_SENTRY_ORG` — from step 3 below

## 2. `package.json`

Change `"name"` to match your app slug.

## 3. Sentry

1. Create a new project at [sentry.io](https://sentry.io)
2. Copy the DSN into `.env.local` as `EXPO_PUBLIC_SENTRY_DSN`
3. Create an auth token → set `SENTRY_AUTH_TOKEN` in `.env.local`
4. Update `project` and `organization` in `app.config.js`

**If you don't want Sentry**, revert `metro.config.js` to a plain Expo config:
```js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = false;
module.exports = config;
```
And remove the `@sentry/react-native/expo` plugin from `app.config.js`.

## 4. EAS

```bash
eas init
```
This links your project and generates the project ID. Paste it into `app.config.js`.

## 5. Locales

Replace `locales/en.ts` and `locales/fr.ts` with your app's strings.
The French file must `satisfies DeepString<typeof en>` — TypeScript enforces structural parity.

## 6. Theme

Customize colors in `constants/theme.ts` for your brand.
The palette has semantic names (`button`, `warning`, `exercise`, etc.) — rename or add as needed.
Remember to update both `lightTheme` and `darkTheme` for any color you change.

## 7. Fonts

In `app/_layout.tsx`, replace the commented-out font loader with your own fonts:
```ts
const [loaded, error] = useFonts({
  "MyFont-Regular": require("../assets/fonts/MyFont-Regular.ttf"),
});
```
Or remove `useFonts` entirely if using system fonts, and remove the `if (!loaded || error) return null` guard.

## 8. Icons & splash screen

Replace the placeholder images in `assets/` with your own:
- `assets/icons/ios-light.png`, `ios-dark.png`, `ios-tinted.png`
- `assets/icons/adaptive-icon.png`, `monochrome.png`
- `assets/icons/splash-icon-light.png`, `splash-icon-dark.png`
- `assets/images/favicon.png`

## 9. Environment file

```bash
cp .env.local.example .env.local
# Fill in real values
```

## 10. Remove unused mocks

Delete any `__mocks__/` files for libraries you don't install:
- `expo-audio.ts` — if you don't use audio
- `expo-haptics.ts` — if you don't use haptics
- `expo-keep-awake.ts` — if you don't use keep-awake
- `expo-screen-orientation.ts` — if you don't lock orientation
- `@expo/vector-icons.ts` — if you don't use vector icons

## 11. `jest.config.ts` — `transformIgnorePatterns`

If you add third-party packages that ship ESM, add them to the `transformIgnorePatterns` list so Jest can process them.

## 12. App store — `store/appStore.ts`

The template ships with a minimal `appStore` (theme + locale). Extend it with your app's state, or create separate stores per feature.

## 13. `CLAUDE.md`

Update if your app has different conventions (different locale list, different store name, etc.).

## 14. Install dependencies

```bash
npm install
```

---

## Using this template

Three ways to bootstrap a new project:

**Copy-paste (simplest):**
```bash
cp -r expo-template/ my-new-app/
cd my-new-app
git init
```

**degit (recommended once on GitHub — no git history baggage):**
```bash
npx degit your-github-username/expo-template my-new-app
cd my-new-app
git init
```
`degit` clones without history and requires no npm publish. Upgrade to this once you push the template to GitHub.

**create-expo-app custom template (most official):**
Requires publishing to npm. Overkill for personal use — stick with `degit`.
