/**
 * Whether this browser can run the demo. Playground serves the site through a service
 * worker, and the browsers built into iOS apps (X, LinkedIn, Instagram: a WKWebView)
 * don't have them, so the site would never finish loading there.
 *
 * - `in-app`: an iOS in-app browser that can hand the page to Safari.
 * - `x-app`: X's, which can't, but can open the share sheet.
 * - `unsupported`: any other browser without service workers.
 */
export type BrowserSupport = "ok" | "in-app" | "x-app" | "unsupported";

export function getBrowserSupport(): BrowserSupport {
  const ua = navigator.userAgent;
  // The same test playground.wordpress.net uses: Safari and the other iOS browsers name
  // themselves in the user agent, and an app's WKWebView doesn't.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 && /Mobile\//.test(ua));
  if (isIOS && !/Version\/|CriOS\/|FxiOS\//.test(ua)) {
    return /Twitter for iPhone/i.test(ua) ? "x-app" : "in-app";
  }
  return "serviceWorker" in navigator ? "ok" : "unsupported";
}
