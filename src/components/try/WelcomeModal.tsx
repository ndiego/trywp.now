"use client";

import { WP_DOWNLOAD_URL, WP_HOSTING_URL } from "@/lib/wordpress";
import { TryModal } from "./TryModal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The running WordPress's major.minor version ("7.1"), once known. */
  version: string | null;
};

/** Shown once WordPress has booted to orient first-time visitors. */
export function WelcomeModal({ open, onClose, version }: Props) {
  return (
    <TryModal open={open} onClose={onClose} labelledBy="try-welcome-title" className="try-welcome">
      {/* The release page's blue and green block artwork, drawn in CSS. */}
      <div className="try-art" aria-hidden="true">
        {version && <span className="try-art__number">{version}</span>}
      </div>

      <div className="try-welcome__content">
        {version && <p className="try-eyebrow">WordPress {version}</p>}
        <h2 id="try-welcome-title" className="try-heading try-heading--lg">
          Howdy! Your site is <em>ready</em>
        </h2>
        <p className="try-subhead">A real WordPress site, right in your browser.</p>
        <p className="try-body">
          You&apos;re logged in as the administrator. Change anything you like; nothing is saved, and nothing can
          break.
        </p>
        <button type="button" className="try-btn try-welcome__start" onClick={onClose}>
          Start exploring
        </button>
        {/* New tabs, so the visitor's site keeps running. */}
        <p className="try-modal__aside">
          Ready for the real thing?{" "}
          <a href={WP_DOWNLOAD_URL} target="_blank" rel="noopener">
            Download WordPress
          </a>{" "}
          or{" "}
          <a href={WP_HOSTING_URL} target="_blank" rel="noopener">
            find a host
          </a>
          .
        </p>
      </div>
    </TryModal>
  );
}
