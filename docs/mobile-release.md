# Phone apps (Google Play and App Store)

The Android and iPhone apps are the same React app as the website, packaged with
[Capacitor](https://capacitorjs.com) 8. The built web files are bundled inside the
app (not loaded from the website), and the app talks to the same Supabase backend.

| | |
| --- | --- |
| App ID (both stores) | `com.caresyncpro1.app` |
| Display name | CareSync Pro |
| Native projects | `android/` (Gradle) and `ios/App/App.xcodeproj` (Swift Package Manager) |
| Config | `capacitor.config.json` |
| Icon and splash sources | `assets/` (regenerate with `npm run app:icons`) |
| Builds | `.github/workflows/mobile-apps.yml` |
| Version | `version` in `package.json`; build number is the workflow run number |

## What differs inside the apps

`src/lib/native.js` holds the differences:

- Email links (sign-up, password reset) point at `https://caresyncpro1.com`, because
  the app's own origin (`https://localhost` on Android, `capacitor://localhost` on iOS)
  only exists on the phone.
- "Continue with Google" is hidden: Google blocks sign-in inside app web views, and
  offering it in the iPhone app would also require Sign in with Apple.
- Documents open in an in-app browser sheet (`@capacitor/browser`), since web views
  cannot open new tabs or download files.

The `api` Edge Function allows the two app origins by default. If the
`ALLOWED_ORIGINS` function secret is set, it must include
`capacitor://localhost,https://localhost`.

Android backups are off (`allowBackup="false"`) so the signed-in session and cached
client data are not copied into Google backups.

## Builds

- Pull requests that touch the apps get unsigned test builds (Android debug APK,
  iOS simulator).
- **Actions > Phone apps > Run workflow** makes store builds:
  - Android: a signed `.aab`, saved on the run page under *Artifacts*. Upload it in
    Play Console. Google re-signs it (Play App Signing); ours is only the upload key.
  - iPhone: archived, signed with Apple cloud-managed certificates through the App
    Store Connect API key, and uploaded to App Store Connect (TestFlight).

### Repository secrets

| Secret | Where it comes from |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Upload key, base64 of a PKCS12 keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore and key password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `APPLE_TEAM_ID` | developer.apple.com > Account > Membership details |
| `APP_STORE_CONNECT_KEY_ID` | App Store Connect > Users and Access > Integrations > Team keys (role **Admin**, needed for cloud signing) |
| `APP_STORE_CONNECT_ISSUER_ID` | Same page, above the key list |
| `APP_STORE_CONNECT_KEY_P8` | Full text of the downloaded `AuthKey_XXXX.p8` |

The app record must exist in App Store Connect (bundle ID `com.caresyncpro1.app`)
before the first iPhone upload.

## Local development

```bash
npm run app:sync          # build the web app and copy it into android/ and ios/
npx cap open android      # Android Studio
npx cap open ios          # Xcode (Mac only)
```

## Store review notes

- Both stores need a working demo login for reviewers (an admin or worker account
  with sample, non-real data) and a privacy policy URL.
- Account deletion is in the app (profile > Delete account), which Apple and Google
  require when the app lets people create accounts.
- `ITSAppUsesNonExemptEncryption` is `false` (HTTPS only), so no export compliance
  paperwork is needed for each build.
