"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "./icons";
import { getPreviewSrc } from "./preview-tabs";

const noSubscribe = () => () => {};

/** How long an empty tab waits for WordPress to send its preview before giving up. */
const PREVIEW_WAIT_MS = 15_000;

/** What to say when there's no preview to show. The `accent` word is set in the heading's italic. */
const notices = {
  /** Someone came here directly, not from WordPress. */
  direct: {
    heading: "Howdy! There's nothing to preview",
    accent: "yet",
    body: "This page shows previews from a WordPress site running in your browser. Start one and you'll have a real site to explore in a few seconds, with nothing to sign up for or install.",
    action: "Try WordPress",
  },
  /** WordPress opened the tab but its preview never arrived. */
  lost: {
    heading: "This preview got",
    accent: "lost",
    body: "It never arrived from your site. Go back to the tab your site is running in and try the preview again, or start a fresh site here.",
    action: "Start a fresh site",
  },
  /** The address isn't a page of a Playground site. */
  unavailable: {
    heading: "This preview isn't",
    accent: "available",
    body: "Previews only work for a WordPress site running in your browser, and this link doesn't lead to one. You can start a site of your own in a few seconds.",
    action: "Try WordPress",
  },
};

/**
 * A new tab for a page of the visitor's Playground site (see preview-tabs.ts). Opens
 * empty while the editor saves its preview, then WordPress points it at `?url=…`.
 * Without a preview to show, it sends the visitor to the demo instead.
 */
export function TryPreview() {
  // `null` while prerendering, then the query string once in the browser.
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
  // A tab WordPress opened has an opener; one the visitor came to directly doesn't.
  const opened = useSyncExternalStore(noSubscribe, () => window.opener !== null, () => false);
  const hasUrl = search !== null && new URLSearchParams(search).has("url");
  const src = search === null ? null : getPreviewSrc(search);
  const waiting = search !== null && !hasUrl && opened;

  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setGaveUp(true), PREVIEW_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waiting]);

  let notice: (typeof notices)[keyof typeof notices] | null = null;
  if (search !== null && !src) {
    if (hasUrl) notice = notices.unavailable;
    else if (!opened) notice = notices.direct;
    else if (gaveUp) notice = notices.lost;
  }

  return (
    <div className="try">
      <div className="try-stage">
        {src ? (
          <iframe title="WordPress preview" className="try-frame__iframe" src={src} />
        ) : notice ? (
          <main className="try-notice">
            <div className="try-notice__card">
              <span className="try-notice__logo">
                <Icon name="wordpress" size={40} />
              </span>
              <h1 className="try-heading">
                {notice.heading} <em>{notice.accent}</em>
              </h1>
              <p className="try-body">{notice.body}</p>
              <Link className="try-btn" href="/">
                {notice.action}
              </Link>
            </div>
          </main>
        ) : (
          // Blank while prerendering, so a direct visit doesn't flash the loader.
          waiting && (
            <div className="try-loader" role="status" aria-live="polite">
              <p className="try-loader__title">Generating preview</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
