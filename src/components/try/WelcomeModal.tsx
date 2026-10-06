"use client";

import Image from "next/image";
import { WP_DOWNLOAD_URL, WP_HOSTING_URL } from "@/lib/wordpress";
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
