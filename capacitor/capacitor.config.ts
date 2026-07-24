import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.tagspaces.mobileapp',
  appName: 'TagSpaces',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*'],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
    },
  },
  android: {
    minWebViewVersion: 70,
  },
  ios: {
    scheme: 'TagSpaces',
    // 'never' — let the web layer own safe-area handling. The native side
    // already positions the WebView below the status bar (StatusBar
    // overlaysWebView:false) and the body pads itself via env(safe-area-inset-*)
    // in index.html. 'always' added a *third*, redundant inset, so WKWebView
    // pushed the whole content down by ~the status-bar height (~20px) — the
    // "shift in the opposite direction".
    contentInset: 'never',
  },
};

export default config;
