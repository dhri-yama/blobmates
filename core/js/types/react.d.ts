import type { AnimateOptions } from './runtime';
import type { BlobmateOptions } from './main';

type Common = { label?: string; className?: string; style?: Record<string, unknown> };

export type BlobmateProps = Common & BlobmateOptions & { seed: string };

export type LiveBlobmateProps = Common & {
  seed: string;
  size?: number;
  mood?: string;
  pins?: BlobmateOptions;
  motion?: 'none' | 'follow' | 'idle';
  /** `true` or `{ speed, pause }`. With roam the component fills its parent, so give the parent a size. */
  roam?: boolean | NonNullable<AnimateOptions['roam']>;
  react?: AnimateOptions['react'];
};

/** Static avatar (an SVG). */
export function Blobmate(props: BlobmateProps): any;
/** Live avatar: blinks, follows the pointer, and can roam or react to taps. */
export function LiveBlobmate(props: LiveBlobmateProps): any;
