import type { IconName } from "./icons";

/**
 * `icon` is the @wordpress/icons glyph; `dashicon` is the Dashicon wp-admin's admin
 * bar and menu use for the same screen (see USE_DASHICONS in ControlIcon.tsx).
 */
export type Destination = {
  label: string;
  path: string;
  icon: IconName;
  dashicon: string;
  primary?: boolean;
};

/** WordPress screens the controls offer as one-step destinations. */
export const destinations: Destination[] = [
  { label: "Homepage", path: "/", icon: "home", dashicon: "admin-home", primary: true },
  { label: "Dashboard", path: "/wp-admin/", icon: "dashboard", dashicon: "dashboard", primary: true },
  {
    label: "Edit Site",
    path: "/wp-admin/site-editor.php",
    icon: "layout",
    dashicon: "admin-appearance",
    primary: true,
  },
  { label: "Plugins", path: "/wp-admin/plugins.php", icon: "plugins", dashicon: "admin-plugins" },
  { label: "Themes", path: "/wp-admin/themes.php", icon: "brush", dashicon: "admin-appearance" },
];

/** The destination with the longest matching path prefix ("/" matches the whole front end). */
export function getActivePath(currentUrl: string): string | undefined {
  const pathname = currentUrl.split(/[?#]/)[0];
  if (!pathname) return undefined;
  return destinations
    .map((d) => d.path)
    .filter((p) => (p === "/" ? !pathname.startsWith("/wp-admin") : pathname.startsWith(p)))
    .sort((a, b) => b.length - a.length)[0];
}

/** What the controls need from the Try page. */
export type TryControls = {
  ready: boolean;
  activePath?: string;
  goTo: (path: string) => void;
  reset: () => void;
  showWelcome: () => void;
};
