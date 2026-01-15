import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Opens a Linear URL, optionally transforming it to use the native app URL scheme.
 * Falls back to browser if native app fails to open.
 */
export async function openLinearUrl(webUrl: string, useNativeApp: boolean): Promise<void> {
  if (useNativeApp) {
    const nativeUrl = webUrl.replace('https://linear.app/', 'linear://');
    try {
      await openUrl(nativeUrl);
    } catch {
      // Fallback to browser if native app fails
      await openUrl(webUrl);
    }
  } else {
    await openUrl(webUrl);
  }
}
