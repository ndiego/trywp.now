"use client";

import Image from "next/image";
import { useState } from "react";
import { tryBlueprints } from "./blueprint";
import { TryModal } from "./TryModal";

type Props = {
  open: boolean;
  /** The site that's running. */
  currentId: string;
  onCancel: () => void;
  onSwitch: (blueprintId: string) => void;
};

/**
 * The sites a visitor can try (`tryBlueprints`), each with a picture. Switching boots
 * the chosen one from scratch, so it asks here rather than in a second dialog.
 */
export function SitesModal({ open, currentId, onCancel, onSwitch }: Props) {
  return (
    <TryModal open={open} onClose={onCancel} labelledBy="try-sites-title" className="try-sites">
      {/* Mounted with the dialog, so each opening starts on the running site. */}
      <SitePicker currentId={currentId} onCancel={onCancel} onSwitch={onSwitch} />
    </TryModal>
  );
}

function SitePicker({ currentId, onCancel, onSwitch }: Omit<Props, "open">) {
  const [chosenId, setChosenId] = useState(currentId);
  const changed = chosenId !== currentId;

  return (
    <>
      <h2 id="try-sites-title" className="try-heading">
        Try another <em>site</em>
      </h2>
      <p className="try-body">Each one is a real WordPress site with its own theme and content.</p>

      <div className="try-sites__grid" role="radiogroup" aria-labelledby="try-sites-title">
        {tryBlueprints.map((site) => (
          <button
            key={site.id}
            type="button"
            role="radio"
            aria-checked={site.id === chosenId}
            className="try-site"
            onClick={() => setChosenId(site.id)}
          >
            <span className="try-site__preview">
              <Image src={site.preview} width={400} height={300} alt="" />
              {site.id === currentId && <span className="try-site__current">Current</span>}
            </span>
            <span className="try-site__text">
              <span className="try-site__theme">{site.theme}</span>
              <span className="try-site__name">{site.design}</span>
              <span className="try-site__description">{site.description}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="try-modal__actions try-sites__actions">
        <p className="try-sites__note" aria-live="polite">
          {changed && "Switching starts a fresh site. Anything you've changed here will be gone."}
        </p>
        <button type="button" className="try-btn try-btn--text" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="try-btn" disabled={!changed} onClick={() => onSwitch(chosenId)}>
          Switch site
        </button>
      </div>
    </>
  );
}
