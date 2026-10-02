/**
 * A WordPress Dashicon (https://developer.wordpress.org/resource/dashicons/), the icon
 * font wp-admin uses. The font and classes come from the vendored dashicons stylesheet.
 */
export function Dashicon({ name, size }: { name: string; size?: number }) {
  return (
    <span
      className={`dashicons dashicons-${name}`}
      style={size ? { width: size, height: size, fontSize: size } : undefined}
      aria-hidden="true"
    />
  );
}
