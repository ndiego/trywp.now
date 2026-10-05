import type { StepDefinition } from "@wp-playground/client";
import { PLAYGROUND_REMOTE_URL } from "./blueprint";

/**
 * Pages WordPress opens in a new tab (the editor's Preview, "View site", …) would
 * otherwise land on playground.wordpress.net/scope:…/ as a top-level page. There,
 * the browser gives Playground a different service worker than the one inside our
 * iframe, which knows nothing about the visitor's site, so the tab 404s.
 *
 * Instead, we open those tabs on our own /preview page, which embeds the URL in an
 * iframe. Embedded under trywp.now, it shares the service worker of the visitor's
 * original tab and reaches the WordPress running there.
 */
export const PREVIEW_PATH = "/preview";

/** Only URLs inside a Playground site may be shown on the preview page. */
export function getPreviewSrc(search: string): string | null {
  const url = new URLSearchParams(search).get("url");
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const playgroundOrigin = new URL(PLAYGROUND_REMOTE_URL).origin;
    return parsed.origin === playgroundOrigin && parsed.pathname.startsWith("/scope:") ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Runs in every WordPress page. Reroutes new-tab opens that stay inside this
 * Playground site, both `window.open()` calls and links with a `target`, to the
 * preview page. The editor's Preview opens an empty named tab first and sets its
 * `location` once the preview is saved, so the returned handle reroutes that too.
 */
function previewTabsScript(origin: string) {
  return `(() => {
  const previewPage = ${JSON.stringify(origin + PREVIEW_PATH)};
  const scope = location.pathname.match(/^\\/scope:[^/]+/)?.[0];
  if (!scope || window.top === window) return;
  const inSite = (url) => url.origin === location.origin && (url.pathname === scope || url.pathname.startsWith(scope + "/"));
  const previewUrl = (url) => previewPage + (url ? "?url=" + encodeURIComponent(url.href) : "");
  const resolve = (url) => new URL(String(url), location.href);
  const nativeOpen = window.open.bind(window);

  window.open = (url, target, features) => {
    const resolved = url ? resolve(url) : null;
    if (resolved && !inSite(resolved)) return nativeOpen(url, target, features);
    const tab = nativeOpen(previewUrl(resolved), target, features);
    if (!tab) return tab;
    const navigate = (to) => { tab.location = previewUrl(resolve(to)); };
    return {
      focus: () => tab.focus(),
      close: () => tab.close(),
      get closed() { return tab.closed; },
      get location() { return { set href(to) { navigate(to); } }; },
      set location(to) { navigate(to); },
    };
  };

  window.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href][target]") : null;
    if (!link || ["", "_self", "_parent", "_top", "playground"].includes(link.target)) return;
    const url = resolve(link.href);
    if (!inSite(url)) return;
    event.preventDefault();
    window.open(url.href, link.target);
  });
})();`;
}

/** A blueprint step that installs `previewTabsScript` as a must-use plugin. */
export function previewTabsStep(origin: string): StepDefinition {
  return {
    step: "writeFile",
    path: "/wordpress/wp-content/mu-plugins/trywp-preview-tabs.php",
    data: `<?php
// Added by trywp.now: opens WordPress's new tabs on trywp.now's preview page.
function trywp_preview_tabs_script() {
  echo '<script>' . ${phpString(previewTabsScript(origin))} . '</script>';
}
add_action('wp_head', 'trywp_preview_tabs_script', 0);
add_action('admin_head', 'trywp_preview_tabs_script', 0);
`,
  };
}

/** A PHP nowdoc string literal, so the script needs no escaping. */
function phpString(value: string) {
  return `<<<'JS'\n${value}\nJS\n`;
}
