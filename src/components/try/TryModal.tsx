"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { wporgModalVars } from "@/components/wporg/modal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The id of the dialog's heading. */
  labelledBy: string;
  className?: string;
  /** Whether to show the `wporg/modal` close button (white, for dialogs with a dark header). */
  closeButton?: boolean;
  children: ReactNode;
};

/**
 * A dialog in wordpress.org's `wporg/modal` block styles. Closes on Escape and on
 * a backdrop click, takes focus when it opens, and hands it back when it closes.
 */
export function TryModal({ open, onClose, labelledBy, className = "", closeButton = true, children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={wporgModalVars} className={`wp-block-wporg-modal is-modal-open try-modal ${className}`}>
      <div className="wporg-modal__modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div
          ref={modalRef}
          className="wporg-modal__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
        >
          {closeButton && <button className="wporg-modal__modal-close" aria-label="Close" onClick={onClose} />}
          <div className="wporg-modal__modal-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
