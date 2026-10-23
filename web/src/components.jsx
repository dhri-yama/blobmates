import { useEffect, useRef } from 'react';
import { animate } from 'blobmates/runtime';
import { blobmate } from './blobmate.js';

// Static avatar: one SVG string, no JavaScript running afterwards.
export const Blobmate = ({ seed, size = 96, ...opts }) => (
  <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: blobmate(seed, { size, ...opts }) }} />
);

// One live avatar (mood motion, blinking, gaze) filling its parent; set roam to let it wander inside.
export function LiveBlobmate({ seed, size = 120, mood = 'neutral', pins, motion = 'follow', roam, react }) {
  const host = useRef(null);
  const rt = useRef(null);
  useEffect(() => {
    rt.current = animate(host.current, blobmate, { seed, size });
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
      animate(host.current, blobmate, { seed: it.seed, pins: it.pins, mood: it.mood, size: it.size, motion: 'follow', spawn: 'random', react: it.react, roam: { speed: it.speed } }));
    return () => runs.forEach((r) => r.destroy());
  }, [items]);
  return <div className="field" ref={host} />;
}

// The brand mark is a live Blobmate generated from the name "blobmates" (nothing pinned): it blinks and follows the pointer.
export const Logo = () => (
  <span className="logo"><LiveBlobmate seed="blobmates" size={46} mood="happy" react /></span>
);
