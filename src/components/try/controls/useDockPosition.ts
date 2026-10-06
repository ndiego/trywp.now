import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { MouseEvent, PointerEvent } from "react";

/** Where the dock sits: one of six spots along the top and bottom edges. */
export type DockPosition = { y: "top" | "bottom"; x: "left" | "center" | "right" };

const DEFAULT_POSITION: DockPosition = { y: "bottom", x: "center" };
const STORAGE_KEY = "try-dock-position";
/** How far the pointer must move before a press becomes a drag (so clicks still work). */
const DRAG_THRESHOLD = 5;
/** How long the dock takes to glide from where it was dropped into its spot. */
const SNAP_MS = 260;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The chosen spot lives in localStorage, read through a tiny external store so
// the prerendered page (which can't know it) hydrates cleanly.
let current: DockPosition | null = null;
const listeners = new Set<() => void>();

function readStored(): DockPosition | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (["top", "bottom"].includes(stored?.y) && ["left", "center", "right"].includes(stored?.x)) {
      return { y: stored.y, x: stored.x };
    }
  } catch {}
  return null;
}

function getPosition() {
  return (current ??= readStored() ?? DEFAULT_POSITION);
}

function setPosition(position: DockPosition) {
  current = position;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The spot nearest to where the dock was dropped: thirds across, halves down. */
function nearestSpot(rect: DOMRect): DockPosition {
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  return { y: y < 0.5 ? "top" : "bottom", x: x < 1 / 3 ? "left" : x > 2 / 3 ? "right" : "center" };
}

/**
 * Lets the visitor drag the dock (open or collapsed) and drop it into one of six
 * spots, where it glides into place. Attach `ref` and `handlers` to whichever
 * element is showing; `position` drives its placement in CSS.
 */
export function useDockPosition() {
  const position = useSyncExternalStore(subscribe, getPosition, () => DEFAULT_POSITION);
  const element = useRef<HTMLElement | null>(null);
  // Where the dock was dropped, so the next layout can glide it from there.
  const droppedAt = useRef<DOMRect | null>(null);
  // Set after a drag, so the click that ends it doesn't also press a button.
  const justDragged = useRef(false);
  // The running glide, so a new press can stop it.
  const glide = useRef<Animation | null>(null);
  // Ends the current press; a new press ends one whose release went missing.
  const endPress = useRef<(() => void) | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    element.current = node;
  }, []);

  // Glide from the drop point into the new spot (FLIP: start where it was, animate to
  // zero). A separate animation, so the dock's own CSS transitions keep working.
  useLayoutEffect(() => {
    const el = element.current;
    const from = droppedAt.current;
    droppedAt.current = null;
    if (!el || !from) return;
    if (prefersReducedMotion()) return;

    const to = el.getBoundingClientRect();
    glide.current = el.animate(
      [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` }, { transform: "none" }],
      { duration: SNAP_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [position]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    endPress.current?.();
    glide.current?.cancel();
    const el = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    // While pressed, iframes ignore the pointer, so moves over the Playground site
    // still reach this page, even a fast first move off the dock.
    const root = document.documentElement;
    root.classList.add("try-dock-pressed");

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", cancel);
      root.classList.remove("try-dock-pressed");
      el.classList.remove("try-dock--dragging");
      endPress.current = null;
    };

    // Ends a drag in `spot`, gliding there from wherever the dock was let go.
    const settle = (spot: DockPosition) => {
      if (!dragging) return;
      // The click that ends a drag follows right away; clear the flag if none comes (touch).
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false));
      droppedAt.current = el.getBoundingClientRect();
      el.style.transform = "";
      // Always a new object, even for the same spot, so the layout effect glides it in.
      setPosition({ ...spot });
    };

    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      // No button held means the release went missing (e.g. after a context menu).
      if (!(e.buttons & 1)) return cancel(e);
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
        el.classList.add("try-dock--dragging");
      }
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    // Released: into the nearest spot.
    const drop = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      stop();
      settle(nearestSpot(el.getBoundingClientRect()));
    };

    // Interrupted: back into the spot it came from.
    const cancel = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== event.pointerId) return;
      stop();
      settle(getPosition());
    };

    endPress.current = () => {
      stop();
      settle(getPosition());
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", cancel);
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return { position, ref, handlers: { onPointerDown, onClickCapture } };
}
