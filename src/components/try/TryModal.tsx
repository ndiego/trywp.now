"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The id of the dialog's heading. */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

/**
 * A dialog card over a dimmed, blurred site, styled after the WordPress 7.1 release
 * page (see try.css). Closes on Escape and on a backdrop click, takes focus when it
 * opens, and hands it back when it closes.
 */
export function TryModal({ open, onClose, labelledBy, className = "", children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`try-modal ${className}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="try-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
