"use client";

import { TryModal } from "./TryModal";

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

/** Confirms a reset, since it throws away everything the visitor has changed. */
export function ResetModal({ open, onCancel, onConfirm }: Props) {
  return (
    <TryModal open={open} onClose={onCancel} labelledBy="try-reset-title" className="try-reset" closeButton={false}>
      <div className="try-modal__body">
        <h2 id="try-reset-title" className="wp-block-heading try-reset__title">
          Start over with a fresh site?
        </h2>
        <p className="wp-block-paragraph">
          This resets WordPress to how it was when you arrived. Anything you&apos;ve changed, like posts, pages, or
          settings, will be gone.
        </p>
        <div className="try-modal__actions">
          <div className="wp-block-button is-style-outline">
            <button type="button" className="wp-block-button__link wp-element-button" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <div className="wp-block-button">
            <button type="button" className="wp-block-button__link wp-element-button" onClick={onConfirm}>
              Reset site
            </button>
          </div>
        </div>
      </div>
    </TryModal>
  );
}
