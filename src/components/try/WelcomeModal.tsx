"use client";

import { WP_DOWNLOAD_URL, WP_HOSTING_URL } from "@/lib/wordpress";
import { TryModal } from "./TryModal";

type Props = { open: boolean; onClose: () => void };

/** Shown once WordPress has booted to orient first-time visitors. */
export function WelcomeModal({ open, onClose }: Props) {
  return (
    <TryModal open={open} onClose={onClose} labelledBy="try-welcome-title" className="try-welcome">
      <div
        className="wp-block-group has-white-color has-blueberry-1-background-color has-text-color has-background has-link-color try-welcome__header"
      >
        <h2 id="try-welcome-title" className="wp-block-heading" style={{ marginTop: 0 }}>
          Howdy!
        </h2>
        <p className="has-eb-garamond-font-family has-extra-large-font-size wp-block-paragraph">
          Your WordPress site is ready
        </p>
      </div>

      <div className="try-modal__body">
        <p className="wp-block-paragraph">
          This is a real WordPress site, running entirely in your browser. You&apos;re logged in as the
          administrator, so poke around and change anything. Nothing is saved, and nothing can break.
        </p>

        <div className="try-modal__footer">
          <div className="wp-block-button">
            <button type="button" className="wp-block-button__link wp-element-button" onClick={onClose}>
              Start exploring
            </button>
          </div>
          <p className="try-modal__aside">
            Ready for the real thing? <a href={WP_DOWNLOAD_URL}>Download WordPress</a> or{" "}
            <a href={WP_HOSTING_URL}>find a host</a>.
          </p>
        </div>
      </div>
    </TryModal>
  );
}
