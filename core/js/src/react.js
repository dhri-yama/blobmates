// React components. Written with createElement so the package needs no build step.
import { createElement as h, useEffect, useRef } from 'react';
import { blobmate } from './main.js';
import { animate } from './runtime.js';

// Static avatar: one SVG, no JavaScript running afterwards. Fine in lists and server rendering.
export function Blobmate({ seed, size = 96, label, className, style, ...options }) {
  return h('span', {
    className,
    role: 'img',
    'aria-label': label ?? `${seed} avatar`,
    style: { display: 'inline-block', width: size, height: size, lineHeight: 0, ...style },
    dangerouslySetInnerHTML: { __html: blobmate(seed, { ...options, size }) },
  });
}

// Live avatar: blinks, follows the pointer, moves with its mood, and can roam or react to taps.
// Without `roam` it is size x size. With `roam` it fills its parent, so give the parent a size.
export function LiveBlobmate({ seed, size = 120, mood = 'neutral', pins, motion = 'follow', roam, react, label, className, style }) {
  const host = useRef(null);
  const rt = useRef(null);

  useEffect(() => {
    rt.current = animate(host.current, blobmate, { seed, size });
    return () => rt.current.destroy();
  }, []);

  useEffect(() => {
    rt.current.set({ seed, size, pins: pins || {}, mood, motion, react, roam: roam ? (typeof roam === 'object' ? roam : { speed: 70 }) : null });
  }, [seed, size, mood, motion, react, JSON.stringify(roam), JSON.stringify(pins)]);

  return h('div', {
    ref: host,
    className,
    role: 'img',
    'aria-label': label ?? `${seed} avatar`,
    style: { position: 'relative', width: roam ? '100%' : size, height: roam ? '100%' : size, ...style },
  });
}
