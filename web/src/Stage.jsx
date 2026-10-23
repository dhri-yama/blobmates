import { useEffect, useRef } from 'react';
import { animate } from '@dhriyama/polypals/runtime';
import { polypal } from './polypal.js';

// Hosts the library runtime (mood motion, blinking, gaze, roam). React only feeds it props.
export default function Stage({ name, pins, mood, motion, roam, react }) {
  const host = useRef(null);
  const rt = useRef(null);

  useEffect(() => {
    rt.current = animate(host.current, polypal, { seed: name, size: 220 });
    return () => rt.current.destroy();
  }, []);

  useEffect(() => {
    rt.current.set({ seed: name, pins, mood, motion, react, roam: roam ? { speed: 70 } : null });
  }, [name, pins, mood, motion, roam, react]);

  return <div id="stage" ref={host} className={roam ? 'roam' : ''} />;
}
