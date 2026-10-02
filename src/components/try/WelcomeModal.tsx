"use client";

import { useEffect, useRef } from "react";
import { wporgModalVars } from "@/components/wporg/modal";
import { WP_DOWNLOAD_URL, WP_HOSTING_URL } from "@/lib/wordpress";

type Props = { open: boolean; onClose: () => void };

/** Shown once WordPress has booted to orient first-time visitors. */
export function WelcomeModal({ open, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    modalRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={wporgModalVars} className="wp-block-wporg-modal is-modal-open try-welcome">
      <div className="wporg-modal__modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          ref={modalRef}
          className="wporg-modal__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="try-welcome-title"
          tabIndex={-1}
        >
          <button className="wporg-modal__modal-close" aria-label="Close" onClick={onClose} />
          <div className="wporg-modal__modal-content">
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

            <div className="try-welcome__body">
              <p className="wp-block-paragraph">
                This is a real WordPress site, running entirely in your browser. You&apos;re logged in as the
                administrator, so poke around and change anything. Nothing is saved, and nothing can break.
              </p>

              <div className="try-welcome__footer">
                <div className="wp-block-button">
                  <button type="button" className="wp-block-button__link wp-element-button" onClick={onClose}>
                    Start exploring
                  </button>
                </div>
                <p className="try-welcome__aside">
                  Ready for the real thing? <a href={WP_DOWNLOAD_URL}>Download WordPress</a> or{" "}
                  <a href={WP_HOSTING_URL}>find a host</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
