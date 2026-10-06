/** Whether the visitor asked for less motion; the dock skips its morph and glide. */
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
