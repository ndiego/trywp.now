"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { WP_GET_URL } from "@/lib/wordpress";
import { destinations, type TryControls } from "../destinations";
import { ControlIcon } from "../ControlIcon";
import { useDockPosition, type DockPosition } from "./useDockPosition";

/**
 * The controls on phones: the round WordPress button alone, which opens a menu of
 * the bar's options. The button drags between the same six spots as the bar, and
 * the menu opens toward the middle of the screen from wherever it sits.
 */
export function PhoneDock({ ready, activePath, goTo, reset }: TryControls) {
  const { position, ref, handlers } = useDockPosition();
  const placement = { "data-dock-x": position.x, "data-dock-y": position.y };
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  // The spot the menu was opened in: dragging the button elsewhere closes it.
  const [openAt, setOpenAt] = useState<DockPosition | null>(null);
  const open = openAt === position;
  const close = () => setOpenAt(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenAt(null);
      buttonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The chosen item disappears with the menu, so focus moves to the button first; that's
  // also where the reset dialog hands focus back when it closes.
  const choose = (action: () => void) => () => {
    close();
    buttonRef.current?.focus();
    action();
  };

  return (
    <>
      {/* Catches taps outside the menu, including over the Playground site. */}
      {open && <div className="try-menu-backdrop" onClick={close} />}

      <div ref={ref as RefObject<HTMLDivElement | null>} {...placement} className="try-phone-dock">
        {open && (
          <nav id={menuId} className="try-dark try-menu" aria-label="Try WordPress controls">
            {destinations
              .filter((d) => d.primary)
              .map((d) => (
                <button
                  key={d.path}
                  type="button"
                  className="try-menu__item"
                  aria-current={activePath === d.path ? "page" : undefined}
                  disabled={!ready}
                  onClick={choose(() => goTo(d.path))}
                >
                  <ControlIcon icon={d.icon} dashicon={d.dashicon} size={24} />
                  {d.label}
                </button>
              ))}
            <span className="try-menu__divider" aria-hidden="true" />
            <button type="button" className="try-menu__item" disabled={!ready} onClick={choose(reset)}>
              <ControlIcon icon="rotateRight" dashicon="update" size={24} />
              Reset Site
            </button>
            {/* Opens in a new tab so the visitor's Playground site keeps running. */}
            <a className="try-cta try-menu__cta" href={WP_GET_URL} target="_blank" rel="noopener" onClick={close}>
              <ControlIcon icon="wordpress" dashicon="wordpress" />
              Get WordPress
              <span className="screen-reader-text">(opens in a new tab)</span>
            </a>
          </nav>
        )}

        <button
          ref={buttonRef}
          {...handlers}
          type="button"
          className="try-dark try-dock-collapsed"
          aria-label={open ? "Close WordPress controls" : "WordPress controls"}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpenAt(open ? null : position)}
        >
          <ControlIcon icon={open ? "close" : "wordpress"} dashicon={open ? "no-alt" : "wordpress"} size={open ? 24 : 34} />
        </button>
      </div>
    </>
  );
}
