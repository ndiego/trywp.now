"use client";

import Image from "next/image";
import { getReleaseArt } from "./release-art";
import { TryModal } from "./TryModal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The running WordPress's version ("7.1.2"), once known. */
  version: string | null;
};

/** Shown once WordPress has booted to orient first-time visitors. */
export function WelcomeModal({ open, onClose, version }: Props) {
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
          This is a WordPress playground, and you&apos;re logged in as the administrator. Look around, change
          anything you like, and experiment freely.
        </p>
        <button type="button" className="try-btn try-welcome__start" onClick={onClose}>
          Start exploring
        </button>
      </div>
    </TryModal>
  );
}
