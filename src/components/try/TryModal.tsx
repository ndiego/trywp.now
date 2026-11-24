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

/** What Tab stops at inside a dialog. */
const TAB_STOPS = ':is(a[href], button:not(:disabled), [tabindex]):not([tabindex="-1"])';

/**
 * A dialog card over a dimmed, blurred site, styled after the WordPress 7.1 release
 * page (see try.css). Closes on Escape and on a backdrop click. It takes focus when it
 * opens, keeps it while it's open (the rest of the page is inert, and Tab wraps), and
 * hands it back when it closes.
 */
export function TryModal({ open, onClose, labelledBy, className = "", children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modal = modalRef.current;
    const dialog = dialogRef.current;
    if (!open || !modal || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // The controls and the site behind the dialog can't be reached while it's open.
    // Announcements still go out: a reset starts loading as its dialog closes.
    const outside = Array.from(modal.parentElement?.children ?? []).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el !== modal && !el.inert && el.role !== "status",
    );
    outside.forEach((el) => (el.inert = true));
    dialog.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;
      // Tab goes round the dialog's controls rather than out to the browser's.
      const stops = Array.from(dialog.querySelectorAll<HTMLElement>(TAB_STOPS));
      const [from, to] = e.shiftKey ? [stops[0], stops.at(-1)] : [stops.at(-1), stops[0]];
      const active = document.activeElement;
      if (active !== from && !(e.shiftKey && active === dialog) && dialog.contains(active)) return;
      e.preventDefault();
      to?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Before handing focus back: nothing inert can take it.
      outside.forEach((el) => (el.inert = false));
      opener?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={modalRef}
      className={`try-modal ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
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
