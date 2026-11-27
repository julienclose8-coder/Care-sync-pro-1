// Helpers for the phone apps (Android and iPhone), which run this same web app
// inside a native shell (Capacitor). On the website these are no-ops.
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const isNativeApp = Capacitor.isNativePlatform();

// Links in emails (sign-up, password reset) must point at the real website,
// because the app's own address (https://localhost or capacitor://localhost)
// only exists inside the phone app.
export const WEB_ORIGIN = 'https://caresyncpro1.com';
export const publicOrigin = () => (isNativeApp ? WEB_ORIGIN : window.location.origin);

// Opens a file or outside page. In the phone apps it opens in an in-app
// browser sheet, because app web views cannot open new tabs or download files.
export async function openExternal(url) {
  if (isNativeApp) await Browser.open({ url });
  else window.location.href = url;
}
