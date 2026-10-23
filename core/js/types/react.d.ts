import type { AnimateOptions } from './runtime';
import type { PolypalOptions } from './main';

type Common = { label?: string; className?: string; style?: Record<string, unknown> };

export type PolypalProps = Common & PolypalOptions & { seed: string };

export type LivePolypalProps = Common & {
  seed: string;
  size?: number;
  mood?: string;
  pins?: PolypalOptions;
  motion?: 'none' | 'follow' | 'idle';
  /** `true` or `{ speed, pause }`. With roam the component fills its parent, so give the parent a size. */
  roam?: boolean | NonNullable<AnimateOptions['roam']>;
  react?: AnimateOptions['react'];
};

/** Static avatar (an SVG). */
export function Polypal(props: PolypalProps): any;
/** Live avatar: blinks, follows the pointer, and can roam or react to taps. */
export function LivePolypal(props: LivePolypalProps): any;
