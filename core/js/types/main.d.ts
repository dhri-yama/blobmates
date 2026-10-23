export interface Parts {
  version: number;
  moods: Record<string, unknown>;
  bodies: { id: string }[];
  [key: string]: unknown;
}

export interface AvatarOptions {
  /** Look */
  style?: 'blob-face' | 'mood-mark' | 'block-eyes' | 'minimal';
  /** A body id, see `bodies`. */
  body?: string;
  /** A hex color like "#F4A3C9", or a palette name like "pink". */
  color?: string;
  /** Eye type, 0 to 4. */
  variant?: number;
  /** 0.7 to 1.4 */
  eyeSize?: number;
  /** -10 to 10, moves the face up or down. */
  faceY?: number;
  mouth?: string;
  brow?: string;
  /** Accessories: an id from `accessories`, or "none". */
  top?: string;
  eyes?: string;
  face?: string;
  cheeks?: string;
  /** Hex color for accessories. */
  accColor?: string;

  /** State, never seeded. */
  mood?: string;
  /** Pupil direction, each from -1 to 1. */
  gaze?: [number, number];
  /** 0 (open) to 1 (closed). */
  blink?: number;

  /** Crop the picture. */
  shape?: 'circle' | 'rounded' | 'square';
  bg?: string;
  /** Pixels, default 128. */
  size?: number;
  /** Which frame of a mood overlay (thought bubble, snoring) to draw. */
  overlayFrame?: number;
}

export interface Resolved {
  style: string;
  body: { id: string };
  color: string;
  accColor: string;
  acc: Record<'top' | 'eyes' | 'face' | 'cheeks', { id: string } | null>;
  mouth: string;
  brow: string;
  eyeScale: number;
  faceY: number;
  variant: number;
}

export interface Avatar {
  /** Returns an SVG string. The same seed and options always give the same string. */
  (seed: string, options?: AvatarOptions): string;
  /** What the seed chose (with your pins applied), without drawing. */
  resolve(seed: string, options?: AvatarOptions): Resolved;
  parts: Parts;
}

/** Build an avatar function from your own parts data. */
export function makeAvatar(parts: Parts): Avatar;

/** Ready to use, bound to the bundled parts. */
export const avatar: Avatar;
export const parts: Parts;
export const moods: string[];
export const bodies: string[];
export const accessories: Record<'top' | 'eyes' | 'face' | 'cheeks', string[]>;
