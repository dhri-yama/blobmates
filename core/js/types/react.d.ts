import type { AnimateOptions } from './runtime';
import type { AvatarOptions } from './main';

type Common = { label?: string; className?: string; style?: Record<string, unknown> };

export type AvatarProps = Common & AvatarOptions & { seed: string };

export type LiveAvatarProps = Common & {
  seed: string;
  size?: number;
  mood?: string;
  pins?: AvatarOptions;
  motion?: 'none' | 'follow' | 'idle';
  /** `true` or `{ speed, pause }`. With roam the component fills its parent, so give the parent a size. */
  roam?: boolean | NonNullable<AnimateOptions['roam']>;
  react?: AnimateOptions['react'];
};

/** Static avatar (an SVG). */
export function Avatar(props: AvatarProps): any;
/** Live avatar: blinks, follows the pointer, and can roam or react to taps. */
export function LiveAvatar(props: LiveAvatarProps): any;
