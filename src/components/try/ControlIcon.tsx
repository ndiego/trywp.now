import { Dashicon } from "./Dashicon";
import { Icon, type IconName } from "./icons";

/**
 * Which icon set the Try WordPress controls use. `false` uses @wordpress/icons
 * (the block editor's icons); `true` switches every control to the Dashicons
 * wp-admin uses for the same screens. Each control declares both.
 */
export const USE_DASHICONS = false;

type Props = { icon: IconName; dashicon: string; size?: number };

export function ControlIcon({ icon, dashicon, size = 20 }: Props) {
  return USE_DASHICONS ? <Dashicon name={dashicon} size={size} /> : <Icon name={icon} size={size} />;
}
