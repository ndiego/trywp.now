"use client";

import { useSyncExternalStore } from "react";
import { getPreviewSrc } from "./preview-tabs";

const noSubscribe = () => () => {};

/**
 * A new tab for a page of the visitor's Playground site (see preview-tabs.ts). Opens
 * empty while the editor saves its preview, then WordPress points it at `?url=…`.
 */
export function TryPreview() {
  // `null` while prerendering, then the query string once in the browser.
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
  const src = search === null ? null : getPreviewSrc(search);
  const hasUrl = search !== null && new URLSearchParams(search).has("url");

  return (
    <div className="try">
      <div className="try-stage">
        {src ? (
          <iframe title="WordPress preview" className="try-frame__iframe" src={src} />
        ) : (
          <div className="try-loader" role="status" aria-live="polite">
            <p className="try-loader__title">
              {hasUrl ? "This preview isn't available" : "Generating preview"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
