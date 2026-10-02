import type { CSSProperties } from "react";

/** Color settings wordpress.org passes to the `wporg/modal` block (white close button over a blueberry header). */
export const wporgModalVars = {
  "--wp--custom--wporg-modal--color--background": "var(--wp--preset--color--white)",
  "--wp--custom--wporg-modal--color--text": "var(--wp--preset--color--charcoal-1)",
  "--wp--custom--wporg-modal--color--overlay": "#1e1e1ecc",
  "--wp--custom--wporg-modal--color--close-button": "#ffffff",
} as CSSProperties;
