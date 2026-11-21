import type { StepDefinition } from "@wp-playground/client";

/**
 * Playground serves the visitor's site from its sandbox origin, at
 * wpsandbox.wordpress.net/scope:…/. Pages WordPress opens in a new tab (the editor's
 * Preview, "View site", …) would otherwise land there as a top-level page, where the
 * browser gives Playground a different service worker than the one inside our iframe.
 * That one knows nothing about the visitor's site, so the tab can't show it.
 *
 * Instead, we open those tabs on our own /preview page, which embeds the URL in an
 * iframe. Embedded under trywp.now, it shares the service worker of the visitor's
 * original tab and reaches the WordPress running there.
 */
export const PREVIEW_PATH = "/preview";

/**
 * The hosts Playground serves sites from, over https. A `host` starting with "."
 * matches any subdomain of it. `scoped` hosts hold many sites, one per /scope:…/ path.
 */
const PLAYGROUND_SITE_HOSTS: { host: string; scoped: boolean }[] = [
  // Where sites are served today.
  { host: "wpsandbox.wordpress.net", scoped: true },
  // Where they were served before the sandbox, in case Playground falls back to it.
  { host: "playground.wordpress.net", scoped: true },
  // If Playground moves to an origin per site, add its suffix here:
  // { host: ".sites.example.net", scoped: false },
];

/** Only URLs inside a Playground site may be shown on the preview page. */
export function getPreviewSrc(search: string): string | null {
  const url = new URLSearchParams(search).get("url");
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.port || parsed.username || parsed.password) return null;
    const site = PLAYGROUND_SITE_HOSTS.find(({ host }) =>
      host.startsWith(".") ? parsed.hostname.endsWith(host) : parsed.hostname === host,
    );
    if (!site || (site.scoped && !parsed.pathname.startsWith("/scope:"))) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Runs in every WordPress page, on Playground's sandbox origin. Reroutes new-tab opens
 * that stay inside this Playground site to the preview page: `window.open()` calls,
 * links with a `target`, and links the visitor opens in a new tab themselves
 * (middle-click, or a click with Cmd, Ctrl or Shift). The editor's Preview opens an
 * empty named tab first and sets its `location` once the preview is saved, so the
 * returned handle reroutes that too.
 */
function previewTabsScript(origin: string) {
  return `(() => {
  const previewPage = ${JSON.stringify(origin + PREVIEW_PATH)};
  const scope = location.pathname.match(/^\\/scope:[^/]+/)?.[0];
  if (!scope || window.top === window) return;
  const inSite = (url) => url.origin === location.origin && (url.pathname === scope || url.pathname.startsWith(scope + "/"));
  const previewUrl = (url) => previewPage + (url ? "?url=" + encodeURIComponent(url.href) : "");
  const resolve = (url) => {
    try {
      return new URL(String(url), location.href);
    } catch {
      return null;
    }
  };
  // Where a tab should go for a URL: the preview page for in-site URLs, anywhere else as given.
  const destination = (url) => {
    const resolved = resolve(url);
    return resolved && inSite(resolved) ? previewUrl(resolved) : String(url);
  };
  const sameWindow = ["_self", "_parent", "_top", "playground"];
  const nativeOpen = window.open.bind(window);

  window.open = (url, target, features) => {
    const resolved = url ? resolve(url) : null;
    if (sameWindow.includes(target) || (url && !(resolved && inSite(resolved)))) {
      return nativeOpen(url, target, features);
    }
    const tab = nativeOpen(previewUrl(resolved), target, features);
    if (!tab) return tab;
    const tabLocation = {
      assign: (to) => { tab.location = destination(to); },
      replace: (to) => tab.location.replace(destination(to)),
      set href(to) { tab.location = destination(to); },
    };
    return {
      focus: () => tab.focus(),
      close: () => tab.close(),
      get closed() { return tab.closed; },
      get location() { return tabLocation; },
      set location(to) { tab.location = destination(to); },
    };
  };

  const onLinkClick = (event) => {
    if (event.defaultPrevented || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download")) return;
    // A new tab because the visitor asked for one, or because the link has a target.
    const asked = event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey;
    if (!asked && (link.target === "" || sameWindow.includes(link.target))) return;
    const url = resolve(link.href);
    if (!url || !inSite(url)) return;
    event.preventDefault();
    window.open(url.href, asked ? "_blank" : link.target);
  };
  window.addEventListener("click", (event) => event.button === 0 && onLinkClick(event));
  // Middle-clicks.
  window.addEventListener("auxclick", (event) => event.button === 1 && onLinkClick(event));
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
