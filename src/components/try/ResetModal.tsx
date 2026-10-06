"use client";

import { TryModal } from "./TryModal";

type Props = { open: boolean; onCancel: () => void; onConfirm: () => void };

/** Confirms a reset, since it throws away everything the visitor has changed. */
export function ResetModal({ open, onCancel, onConfirm }: Props) {
  return (
    <TryModal open={open} onClose={onCancel} labelledBy="try-reset-title" className="try-reset">
      <h2 id="try-reset-title" className="try-heading try-heading--lg">
        Start <em>fresh</em>
      </h2>
      <p className="try-body">
        Proceeding resets WordPress to how it was when you arrived. Anything you&apos;ve changed, like posts, pages, or
        settings, will be gone.
      </p>
      <div className="try-modal__actions">
        <button type="button" className="try-btn try-btn--text" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="try-btn" onClick={onConfirm}>
          Reset site
        </button>
      </div>
    </TryModal>
  );
}
