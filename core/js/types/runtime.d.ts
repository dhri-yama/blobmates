import type { Avatar, AvatarOptions } from './main';

export interface AnimateOptions {
  seed?: string;
  /** Pinned options, same as the options of `avatar()`. */
  pins?: AvatarOptions;
  mood?: string;
  /** Pixels, default 120. */
  size?: number;
  /** "none", "follow" (eyes follow the pointer) or "idle" (eyes wander). Default "follow". */
  motion?: 'none' | 'follow' | 'idle';
  /** Wander around inside the host element. Leave out to stay put. */
  roam?: { speed?: number; pause?: [number, number] } | null | false;
  /** "random" scatters many avatars instead of starting in the middle. */
  spawn?: 'random' | 'center';
  /** Jump and show a short face when tapped, touched, or activated with Enter or Space. Off by default. */
  react?: boolean | { moods?: string[]; duration?: number };
}

export interface Runtime {
  set(patch: AnimateOptions): void;
  lookAt(x: number, y: number): void;
  /** Trigger the tap reaction from code. */
  poke(): void;
  destroy(): void;
}

/** Draws a live avatar inside `host` (browser only). Call `destroy()` when the element goes away. */
export function animate(host: HTMLElement, avatar: Avatar, options?: AnimateOptions): Runtime;
