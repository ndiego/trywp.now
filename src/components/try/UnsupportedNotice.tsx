"use client";

import { useState } from "react";
import { Icon } from "./icons";
import type { BrowserSupport } from "./browser-support";

const inApp = {
  heading: "Open this in your",
  accent: "browser",
  body: "This page runs a real WordPress site right on your device, and the browser inside this app can't do that. Open it in Safari or another browser and you'll have a site to explore in a few seconds.",
};

const notices: Record<Exclude<BrowserSupport, "ok">, typeof inApp> = {
  "in-app": inApp,
  "x-app": inApp,
  unsupported: {
    heading: "This browser can't run",
    accent: "WordPress",
    body: "This page runs a real WordPress site right on your device, which needs a feature this browser doesn't have or has turned off. Try another browser, or a regular window if this one is private.",
  },
};

/**
 * Shown instead of the demo where it can't run (see browser-support.ts), with a way
 * to take the page somewhere it can: Safari, the share sheet, or a copied link.
 */
export function UnsupportedNotice({ support }: { support: Exclude<BrowserSupport, "ok"> }) {
  const notice = notices[support];
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };
  // The share sheet offers "Open in Safari" where the app itself won't.
  const share = () => void navigator.share?.({ url: window.location.href }).catch(() => {});

  return (
    <div className="try">
      <div className="try-stage">
        <main className="try-notice">
          <div className="try-notice__card">
            <span className="try-notice__logo">
              <Icon name="wordpress" size={40} />
            </span>
            <h1 className="try-heading">
              {notice.heading} <em>{notice.accent}</em>
            </h1>
            <p className="try-body">{notice.body}</p>
            <div className="try-notice__actions">
              {support === "in-app" && (
                // iOS hands this scheme to Safari. Tested by Playground in LinkedIn's browser.
                <a className="try-btn" href={window.location.href.replace(/^https?:\/\//, "x-safari-https://")}>
                  Open in Safari
                </a>
              )}
              {support === "x-app" && (
                <button type="button" className="try-btn" onClick={share}>
                  Share link
                </button>
              )}
              <button
                type="button"
                className={`try-btn${support === "unsupported" ? "" : " try-btn--text"}`}
                onClick={copy}
              >
                <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
