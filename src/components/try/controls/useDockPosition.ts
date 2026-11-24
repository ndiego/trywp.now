import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent, PointerEvent } from "react";
import { prefersReducedMotion } from "../motion";

/** Where the dock sits: one of six spots along the top and bottom edges. */
export type DockPosition = { y: "top" | "bottom"; x: "left" | "center" | "right" };

/** The id of the hint that describes the controls: how to move them without dragging (see TryWordPress.tsx). */
export const MOVE_HINT_ID = "try-dock-hint";

const DEFAULT_POSITION: DockPosition = { y: "bottom", x: "center" };
const STORAGE_KEY = "try-dock-position";
/** How far the pointer must move before a press becomes a drag (so clicks still work). */
const DRAG_THRESHOLD = 5;

/**
 * A drag shorter than this leaves the dock in its spot, so a wiggle near a zone's
 * edge doesn't move it. Longer drags go where the pointer is.
 */
const STAY_PX = 32;

/** How close to the window's edges the dock follows the pointer freely. */
const EDGE_PX = 8;
/** Past that it resists, like a rubber band: this is the furthest it stretches. */
const STRETCH_PX = 32;

// The glide follows Next.js's dev tools indicator (its Draggable in next-devtools).
// Its drop doesn't: that flings the dock on by its release speed, which turns the
// small movement of a hand lifting off into a few hundred pixels, so where a
// drag ends up stops being predictable. Here the dock goes where the pointer is,
// and an outline shows that spot for as long as the drag lasts.

/** How long the dock takes to glide from where it was dropped into its spot. */
const SNAP_MS = 491;
/** The glide's spring: `--try-timing-bounce` in try.css, or this curve where linear() isn't supported. */
const SNAP_EASING_FALLBACK = "cubic-bezier(0.2, 1, 0.3, 1)";
/** Matches the outline's fade in try.css. */
const GHOST_FADE_MS = 150;

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

type Point = { x: number; y: number };

/** A box's middle, which stays put while the dock scales up under the pointer. */
const centerOf = (rect: DOMRect): Point => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/**
 * The spot under a point: thirds across, halves down. It's the pointer that's
 * judged, not the dock, so the dock lands where the visitor's hand is, however
 * wide the dock is or wherever on it they grabbed.
 */
function spotAt({ x, y }: Point): DockPosition {
  const fx = x / window.innerWidth;
  const fy = y / window.innerHeight;
  return { y: fy < 0.5 ? "top" : "bottom", x: fx < 1 / 3 ? "left" : fx > 2 / 3 ? "right" : "center" };
}

/** Where a drag ends up: the spot under the pointer when let go. Short drags count as staying put. */
function dropSpot(start: Point, end: Point, current: DockPosition): DockPosition {
  if (Math.hypot(end.x - start.x, end.y - start.y) < STAY_PX) return current;
  return spotAt(end);
}

/** Keeps `value` between `min` and `max`, letting it stretch a little past either. */
function band(value: number, min: number, max: number) {
  const stretch = (over: number) => STRETCH_PX * (1 - 1 / (over / STRETCH_PX + 1));
  if (value < min) return min - stretch(min - value);
  if (value > max) return max + stretch(value - max);
  return value;
}

/**
 * Lets the visitor drag the dock (open or collapsed) and drop it into one of six
 * spots, where it glides into place: the spot under the pointer when they let go.
 * Attach `ref` and `handlers` to whichever element is showing; `position` drives
 * its placement in CSS.
 */
export function useDockPosition() {
  const position = useSyncExternalStore(subscribe, getPosition, () => DEFAULT_POSITION);
  const ref = useRef<HTMLElement>(null);
  // The middle of the dock where it was dropped, so the next layout can glide it from there.
  const droppedAt = useRef<Point | null>(null);
  // Set after a drag, so the click that ends it doesn't also press a button.
  const justDragged = useRef(false);
  // The running glide, so a new press can pick the dock up from wherever it has got to.
  const glide = useRef<Animation | null>(null);
  // Ends the current press; a new press ends one whose release went missing.
  const endPress = useRef<(() => void) | null>(null);

  // Glide from the drop point into the new spot (FLIP: start where it was, animate to
  // zero). A separate animation, so the dock's own CSS transitions keep working.
  useLayoutEffect(() => {
    const el = ref.current;
    const from = droppedAt.current;
    droppedAt.current = null;
    if (!el || !from || prefersReducedMotion()) return;

    const to = centerOf(el.getBoundingClientRect());
    if (Math.hypot(from.x - to.x, from.y - to.y) < 0.5) return;
    const keyframes = [{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)` }, { transform: "none" }];
    const easing = getComputedStyle(el).getPropertyValue("--try-timing-bounce").trim() || SNAP_EASING_FALLBACK;
    try {
      glide.current = el.animate(keyframes, { duration: SNAP_MS, easing });
    } catch {
      // A browser without linear() easing: the same glide on a plain curve.
      glide.current = el.animate(keyframes, { duration: SNAP_MS, easing: SNAP_EASING_FALLBACK });
    }
  }, [position]);

  // A press that ends when the dock unmounts (collapsing, a phone rotating) cleans up after itself.
  useEffect(() => () => endPress.current?.(), []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    endPress.current?.();
    const el = event.currentTarget;
    const pressed = event.target as Element;
    const pointerId = event.pointerId;
    const start = { x: event.clientX, y: event.clientY };

    // Pressed mid-glide: stop the glide and carry on from wherever the dock has got to.
    const shown = el.getBoundingClientRect();
    glide.current?.cancel();
    glide.current = null;
    const rest = el.getBoundingClientRect();
    const origin = { x: shown.left - rest.left, y: shown.top - rest.top };
    const displaced = Math.hypot(origin.x, origin.y) > 0.5;

    let dragging = false;
    let pointer = start;
    let offset = origin;
    let frame = 0;
    let ghost: HTMLElement | null = null;

    const paint = () => {
      frame = 0;
      el.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    };
    if (displaced) paint();

    // The pointer belongs to the dock from the press on, wherever it goes: over the
    // Playground site (a cross-origin iframe, which would otherwise take the moves and
    // even the release for itself) or out of the window. It's captured on the element
    // that was pressed rather than on the dock, so the click that ends a plain press
    // still lands on that button.
    try {
      pressed.setPointerCapture(pointerId);
    } catch {}
    // And for browsers that route by what's under the pointer anyway, the site stops
    // taking the pointer while the press lasts (see .try-dock-pressed in try.css).
    const root = document.documentElement;
    root.classList.add("try-dock-pressed");

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      el.removeEventListener("lostpointercapture", lost);
      if (frame) cancelAnimationFrame(frame);
      // The dock is measured where the pointer last put it, not where the last frame did.
      if (dragging) paint();
      root.classList.remove("try-dock-pressed");
      el.classList.remove("try-dock--dragging");
      if (pressed.hasPointerCapture(pointerId)) pressed.releasePointerCapture(pointerId);
      const outline = ghost;
      if (outline) {
        outline.classList.remove("try-dock-ghost--shown");
        setTimeout(() => outline.remove(), GHOST_FADE_MS);
      }
      endPress.current = null;
    };

    // Ends the press in `spot`, gliding there from wherever the dock is.
    const settle = (spot: DockPosition) => {
      // A plain click moves nothing, unless it caught the dock mid-glide.
      if (!dragging && !displaced) return;
      if (dragging) {
        // The click that ends a drag follows right away; clear the flag if none comes (touch).
        justDragged.current = true;
        setTimeout(() => (justDragged.current = false));
      }
      droppedAt.current = centerOf(el.getBoundingClientRect());
      el.style.transform = "";
      // Always a new object, even for the same spot, so the layout effect glides it in.
      setPosition({ ...spot });
    };

    // Shows where the dock would land if let go now.
    const aim = (spot: DockPosition) => {
      if (!ghost) {
        ghost = document.createElement("div");
        ghost.className = "try-dock-ghost";
        ghost.style.width = `${rest.width}px`;
        ghost.style.height = `${rest.height}px`;
        (el.closest(".try") ?? document.body).append(ghost);
        void ghost.offsetWidth; // Commit it hidden, so it fades in.
        ghost.classList.add("try-dock-ghost--shown");
      }
      ghost.dataset.dockX = spot.x;
      ghost.dataset.dockY = spot.y;
    };

    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      // No button held means the release went missing: the visitor let go somewhere
      // between the last move and here, so this is close enough to where.
      if (!(e.buttons & 1)) return finish({ x: e.clientX, y: e.clientY });
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
        el.classList.add("try-dock--dragging");
      }
      pointer = { x: e.clientX, y: e.clientY };
      // The dock follows the pointer, but only stretches a little way out of the window.
      const maxX = Math.max(EDGE_PX, window.innerWidth - EDGE_PX - rest.width);
      const maxY = Math.max(EDGE_PX, window.innerHeight - EDGE_PX - rest.height);
      offset = {
        x: band(rest.left + origin.x + dx, EDGE_PX, maxX) - rest.left,
        y: band(rest.top + origin.y + dy, EDGE_PX, maxY) - rest.top,
      };
      // Mice report far more often than the screen redraws; move the dock once per frame.
      frame ||= requestAnimationFrame(paint);
      aim(dropSpot(start, pointer, getPosition()));
    };

    // Ends the press with the pointer at `end`: into the spot under it.
    const finish = (end: Point) => {
      pointer = end;
      stop();
      settle(dropSpot(start, end, getPosition()));
    };

    // Released: into the spot under the pointer.
    const drop = (e: globalThis.PointerEvent) => {
      if (e.pointerId === pointerId) finish({ x: e.clientX, y: e.clientY });
    };

    // Capture gone with no release seen: the browser handled the release elsewhere,
    // so drop where the pointer was last seen.
    const lost = () => finish(pointer);

    // Interrupted: back into the spot it came from.
    const abort = () => {
      stop();
      settle(getPosition());
    };
    const cancel = (e: globalThis.PointerEvent) => {
      if (e.pointerId === pointerId) abort();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragging) abort();
    };

    endPress.current = abort;
    el.addEventListener("lostpointercapture", lost);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
  }, []);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Links and images would otherwise start the browser's own drag instead of moving the dock.
  const onDragStart = useCallback((event: DragEvent<HTMLElement>) => event.preventDefault(), []);

  // Without dragging: Shift and an arrow key move the dock one spot that way.
  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const { x, y } = getPosition();
    const across = ["left", "center", "right"] as const;
    let spot: DockPosition;
    if (event.key === "ArrowUp") spot = { x, y: "top" };
    else if (event.key === "ArrowDown") spot = { x, y: "bottom" };
    else if (event.key === "ArrowLeft") spot = { x: across[Math.max(across.indexOf(x) - 1, 0)], y };
    else if (event.key === "ArrowRight") spot = { x: across[Math.min(across.indexOf(x) + 1, 2)], y };
    else return;
    event.preventDefault();
    if (spot.x === x && spot.y === y) return;
    // Glides there like a dropped dock does.
    if (ref.current) droppedAt.current = centerOf(ref.current.getBoundingClientRect());
    setPosition(spot);
  }, []);

  return { position, ref, handlers: { onPointerDown, onClickCapture, onDragStart, onKeyDown } };
}
