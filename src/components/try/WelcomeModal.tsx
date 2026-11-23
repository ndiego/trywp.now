"use client";

import Image from "next/image";
import { getReleaseArt } from "./release-art";
import { TryModal } from "./TryModal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The running WordPress's version ("7.1.2"), once known. */
  version: string | null;
  /** What the site is running ("Ipsum, the new default theme"), or null for plain WordPress. */
  running: string | null;
  /** Leaves the welcome for the list of sites to switch to. */
  onPickSite: () => void;
};

/** Shown once WordPress has booted to orient first-time visitors. */
export function WelcomeModal({ open, onClose, version, running, onPickSite }: Props) {
  const art = getReleaseArt(version);
  return (
    <TryModal
      open={open}
      onClose={onClose}
      labelledBy="try-welcome-title"
      className={`try-welcome${art ? " try-welcome--art" : ""}`}
    >
      {/* The running release's hero artwork from wordpress.org. */}
      {art && <Image className="try-welcome__art" src={art.src} width={art.width} height={art.height} alt="" priority />}

      <div className="try-welcome__content">
        {version && <p className="try-eyebrow">WordPress {version}</p>}
        <h2 id="try-welcome-title" className="try-heading try-heading--lg">
          Howdy! Your site is <em>ready</em>
        </h2>
        <p className="try-body">
          This is a WordPress playground{running && ` running ${running}`}, and you&apos;re logged in as the
          administrator. Look around, change anything you like, and experiment freely.
        </p>
        <div className="try-welcome__actions">
          <button type="button" className="try-btn" onClick={onClose}>
            Start exploring
          </button>
          <button type="button" className="try-btn try-btn--text" onClick={onPickSite}>
            Try another site
          </button>
        </div>
      </div>
    </TryModal>
  );
}
