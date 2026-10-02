"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { WP_GET_URL } from "@/lib/wordpress";
import { destinations, type TryControls } from "../destinations";
import { ControlIcon } from "../ControlIcon";

/** open → closing (pill narrows into the button) → collapsed → opening (pill widens) → open */
type Phase = "open" | "closing" | "collapsed" | "opening";

/** Matches .try-dock-collapsed in try.css: the dock's height, so the pill narrows into a circle. */
const BUTTON_SIZE = 48;
/** Matches the width transition in try.css. */
const MORPH_MS = 220;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A dark pill centered at the bottom of the screen with the main
 * destinations always visible. Collapses into a small WordPress button.
 */
export function FloatingDock({ ready, activePath, goTo, reset }: TryControls) {
  const [phase, setPhase] = useState<Phase>("open");
  const navRef = useRef<HTMLElement>(null);
  const collapsedRef = useRef<HTMLButtonElement>(null);

  // Animate the pill's width between its natural size and the button's. The dock is
  // centered, so changing width alone makes it shrink and grow inward/outward.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || (phase !== "closing" && phase !== "opening")) return;

    const natural = nav.offsetWidth;
    const [from, to] = phase === "closing" ? [natural, BUTTON_SIZE] : [BUTTON_SIZE, natural];
    nav.style.width = `${from}px`;
    void nav.offsetWidth; // Commit the start width before transitioning.
    nav.style.width = `${to}px`;

    // A timer rather than transitionend, so a paused or skipped transition can't strand the dock.
    const timer = setTimeout(() => {
      nav.style.width = "";
      setPhase(phase === "closing" ? "collapsed" : "open");
    }, MORPH_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // The dock unmounts on collapse, so hand focus to the button that replaces it.
  useEffect(() => {
    if (phase === "collapsed") collapsedRef.current?.focus();
  }, [phase]);

  if (phase === "collapsed") {
    return (
      <button
        ref={collapsedRef}
        type="button"
        className="try-dark try-dock-collapsed"
        aria-label="Show WordPress controls"
        title="Show controls"
        onClick={() => setPhase(prefersReducedMotion() ? "open" : "opening")}
      >
        <ControlIcon icon="wordpress" dashicon="wordpress" size={36} />
      </button>
    );
  }

  return (
    <nav
      ref={navRef}
      className={`try-dark try-dock${phase === "open" ? "" : ` try-dock--${phase}`}`}
      aria-label="Try WordPress controls"
    >
      {/* Placeholder: where "Back" goes (and its label) is still to be decided. */}
      <a href={WP_GET_URL} className="try-dock__back">
        <ControlIcon icon="arrowLeft" dashicon="arrow-left-alt" />
        <span className="try-dock__text">Back</span>
      </a>

      <span className="try-divider" aria-hidden="true" />

      {destinations
        .filter((d) => d.primary)
        .map((d) => (
          <button
            key={d.path}
            type="button"
            className="try-dock__item"
            aria-current={activePath === d.path ? "page" : undefined}
            disabled={!ready}
            title={d.label}
            onClick={() => goTo(d.path)}
          >
            <ControlIcon icon={d.icon} dashicon={d.dashicon} />
            <span className="try-dock__label">{d.label}</span>
          </button>
        ))}

      <span className="try-divider" aria-hidden="true" />

      <button
        type="button"
        className="try-icon-button"
        aria-label="Reset Playground"
        title="Reset Playground"
        disabled={!ready}
        onClick={reset}
      >
        <ControlIcon icon="rotateRight" dashicon="update" size={24} />
      </button>
      {/* Opens in a new tab so the visitor's Playground site keeps running. */}
      <a className="try-cta" href={WP_GET_URL} target="_blank" rel="noopener">
        <ControlIcon icon="external" dashicon="external" />
        <span className="try-dock__text">Get WordPress</span>
        <span className="screen-reader-text">(opens in a new tab)</span>
      </a>
      <button
        type="button"
        className="try-icon-button"
        aria-label="Hide controls"
        title="Hide controls"
        onClick={() => setPhase(prefersReducedMotion() ? "collapsed" : "closing")}
      >
        <ControlIcon icon="chevronDown" dashicon="arrow-down-alt2" size={24} />
      </button>
    </nav>
  );
}
