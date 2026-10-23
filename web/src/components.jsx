import { useEffect, useRef } from 'react';
import { animate } from '../../packages/js/src/runtime.js';
import { avatar } from './avatar.js';

// Static avatar: one SVG string, no JavaScript running afterwards.
export const Avatar = ({ seed, size = 96, ...opts }) => (
  <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: avatar(seed, { size, ...opts }) }} />
);

// One live avatar (mood motion, blinking, gaze) filling its parent; set roam to let it wander inside.
export function LiveAvatar({ seed, size = 120, mood = 'neutral', pins, motion = 'follow', roam, react }) {
  const host = useRef(null);
  const rt = useRef(null);
  useEffect(() => {
    rt.current = animate(host.current, avatar, { seed, size });
    return () => rt.current.destroy();
  }, []);
  useEffect(() => {
    rt.current.set({ seed, size, pins: pins || {}, mood, motion, react, roam: roam ? { speed: roam } : null });
  }, [seed, size, mood, motion, roam, react, JSON.stringify(pins)]);
  return <div ref={host} style={{ position: 'absolute', inset: 0 }} />;
}

// Many avatars roaming in one host element (the landing page hero).
export function RoamField({ items }) {
  const host = useRef(null);
  useEffect(() => {
    const runs = items.map((it) =>
      animate(host.current, avatar, { seed: it.seed, pins: it.pins, mood: it.mood, size: it.size, motion: 'follow', spawn: 'random', react: it.react, roam: { speed: it.speed } }));
    return () => runs.forEach((r) => r.destroy());
  }, [items]);
  return <div className="field" ref={host} />;
}

// The brand mark is a live Polypal generated from the name "polypal" (nothing pinned): it blinks and follows the pointer.
export const Logo = () => (
  <span className="logo"><LiveAvatar seed="polypal" size={46} mood="happy" react /></span>
);
