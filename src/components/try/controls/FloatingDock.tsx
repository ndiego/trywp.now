"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { WP_GET_URL } from "@/lib/wordpress";
import { destinations, type TryControls } from "../destinations";
import { ControlIcon } from "../ControlIcon";
import { prefersReducedMotion } from "../motion";
import { PhoneDock } from "./PhoneDock";
import { MOVE_HINT_ID, useDockPosition } from "./useDockPosition";

/** open → closing (pill narrows into the button) → collapsed → opening (pill widens) → open */
type Phase = "open" | "closing" | "collapsed" | "opening";

/** Matches .try-dock-collapsed in try.css: the dock's height, so the pill narrows into a circle. */
const BUTTON_SIZE = 48;
/** Matches the width transition in try.css. */
const MORPH_MS = 220;

/** Matches the phone breakpoint in try.css, below which the bar hides. */
const PHONE_QUERY = "(max-width: 600px)";

function subscribeToPhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** The controls: a floating bar, or on phones a button that opens a menu (PhoneDock). */
export function FloatingDock(controls: TryControls) {
  const isPhone = useSyncExternalStore(
    subscribeToPhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
  return isPhone ? <PhoneDock {...controls} /> : <BarDock {...controls} />;
}

/**
 * A dark pill with the main destinations always visible, which the visitor can drag
 * to any of six spots along the top and bottom edges (or move with Shift and the
 * arrow keys). Its buttons stay focusable while the site boots (`aria-disabled`), so
 * focus isn't lost when a reset turns them off. Collapses into a small
 * WordPress button: toward its center when centered, or into its corner.
 */
function BarDock({ ready, activePath, goTo, reset, switchSite }: TryControls) {
  const [phase, setPhase] = useState<Phase>("open");
  // One ref for whichever is showing: the pill, or the button it collapses into.
  const { position, ref: dockRef, handlers } = useDockPosition();
  const placement = { "data-dock-x": position.x, "data-dock-y": position.y };
  // Escape puts away the tooltip that's showing, until focus or the pointer moves on.
  const [tipsHidden, setTipsHidden] = useState(false);
  // Set when the button brings the bar back, so focus can follow it there.
  const reopened = useRef(false);

  // Animate the pill's width between its natural size and the button's. The dock is
  // pinned to its spot's edge (or centered), so changing width alone makes it shrink
  // into and grow out of its corner (or its center).
  useLayoutEffect(() => {
    const nav = dockRef.current;
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
  }, [phase, dockRef]);

  // The dock unmounts on collapse, so hand focus to the button that replaces it, and
  // back to the bar's hide button when that button brings the bar back.
  useEffect(() => {
    if (phase === "collapsed") dockRef.current?.focus();
    else if (reopened.current) {
      reopened.current = false;
      dockRef.current?.querySelector<HTMLElement>(".try-dock__hide")?.focus();
    }
  }, [phase, dockRef]);

  if (phase === "collapsed") {
    return (
      <button
        // The shared ref holds whichever element is showing; here, this button.
        ref={dockRef as RefObject<HTMLButtonElement | null>}
        {...placement}
        {...handlers}
        type="button"
        className="try-dark try-dock-collapsed"
        aria-label="Show WordPress controls"
        data-tip="Show controls"
        onClick={() => {
          reopened.current = true;
          setPhase(prefersReducedMotion() ? "open" : "opening");
        }}
      >
        <ControlIcon icon="wordpress" dashicon="wordpress" size={34} />
      </button>
    );
  }

  return (
    <nav
      ref={dockRef}
      {...placement}
      {...handlers}
      className={`try-dark try-dock${phase === "open" ? "" : ` try-dock--${phase}`}${tipsHidden ? " try-dock--quiet" : ""}`}
      aria-label="Try WordPress controls"
      aria-describedby={MOVE_HINT_ID}
      onKeyDown={(e) => {
        handlers.onKeyDown(e);
        if (e.key === "Escape") setTipsHidden(true);
      }}
      onFocus={() => setTipsHidden(false)}
      onPointerMove={() => tipsHidden && setTipsHidden(false)}
    >
      {/* Opens in a new tab so the visitor's Playground site keeps running. */}
      <a className="try-cta" href={WP_GET_URL} target="_blank" rel="noopener">
        <ControlIcon icon="wordpress" dashicon="wordpress" />
        <span className="try-dock__text">Get WordPress</span>
        <span className="screen-reader-text">(opens in a new tab)</span>
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
            // Named here too: on narrower screens the label is hidden and shows as a tooltip instead.
            aria-label={d.label}
            data-tip={d.label}
            aria-disabled={!ready || undefined}
            onClick={() => ready && goTo(d.path)}
          >
            <ControlIcon icon={d.icon} dashicon={d.dashicon} />
            <span className="try-dock__label">{d.label}</span>
          </button>
        ))}

      <span className="try-divider" aria-hidden="true" />

      <button
        type="button"
        className="try-icon-button"
        aria-label="Try another site"
        data-tip="Try another site"
        aria-disabled={!ready || undefined}
        onClick={() => ready && switchSite()}
      >
        <ControlIcon icon="category" dashicon="screenoptions" size={24} />
      </button>
      <button
        type="button"
        className="try-icon-button"
        aria-label="Reset site"
        data-tip="Reset site"
        aria-disabled={!ready || undefined}
        onClick={() => ready && reset()}
      >
        <ControlIcon icon="rotateRight" dashicon="update" size={24} />
      </button>
      <button
        type="button"
        className="try-icon-button try-dock__hide"
        aria-label="Hide controls"
        data-tip="Hide controls"
        onClick={() => setPhase(prefersReducedMotion() ? "collapsed" : "closing")}
      >
        <ControlIcon icon="close" dashicon="no-alt" size={20} />
      </button>
    </nav>
  );
}
