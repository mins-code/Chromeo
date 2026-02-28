/**
 * Device utility functions
 *
 * Provides lightweight helpers for platform detection and native OS integration.
 * All functions are safe to call in a web-only context — they degrade gracefully
 * when Capacitor is not available.
 */

/**
 * Returns true when running inside a Capacitor native shell (Android or iOS).
 * Safe to call during SSR / server-side rendering — returns false if
 * `window` is not available.
 */
export const isNativePlatform = (): boolean => {
  try {
    return (window as any).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
};

/**
 * Returns the current platform string: 'android', 'ios', or 'web'.
 */
export const getPlatform = (): string => {
  try {
    return (window as any).Capacitor?.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
};

/**
 * Opens the native OS app settings screen for this app.
 *
 * On Android this lets the user customise the 'Custom OS Alert' notification
 * channel sound via System Settings → Notifications → Custom OS Alert.
 *
 * Requires `@capacitor/app` to be installed (`npm install @capacitor/app` in
 * the `web/` directory, followed by `npx cap sync android`). Falls back
 * gracefully with a console warning if the package is not present.
 *
 * On non-native platforms this is a no-op.
 */
export const openNativeAppSettings = async (): Promise<void> => {
  if (!isNativePlatform()) {
    console.debug('[Device] openNativeAppSettings: no-op on web platform');
    return;
  }

  try {
    // Dynamically imported so the web bundle is not broken when
    // @capacitor/app is not yet installed.
    const { App } = await import('@capacitor/app');
    await App.openUrl({ url: 'app-settings:' });
  } catch (error) {
    // This is non-fatal — the user can manually navigate to settings.
    console.warn(
      '[Device] openNativeAppSettings failed. ' +
      'Make sure @capacitor/app is installed (npm install @capacitor/app && npx cap sync android).',
      error
    );
  }
};
