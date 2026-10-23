import { useMemo } from 'react';
import { Blobmate, LiveBlobmate, RoamField } from '../components.jsx';
import { P } from '../blobmate.js';

// Curated cast for the hero: explicit body + color so the page always looks good, whatever the seed hashes to.
const CAST = [
  ['sol', 'sun', '#F7C531', 'joyful', 140, 60],
  ['mimi', 'heart', '#E84A3C', 'happy', 112, 50],
  ['nube', 'cloud', '#4DA3F5', 'excited', 124, 78],
  ['rex', 'dino-tricera', '#2FA35A', 'smug', 132, 45],
  ['toge', 'togepi', '#F7F1E3', 'grateful', 120, 40],
  ['boo', 'ghost', '#AC8AD6', 'surprised', 112, 58],
  ['stego', 'dino-stego', '#F4A3C9', 'sleepy', 120, 30],
  ['bean', 'bean', '#4FB39F', 'bored', 104, 36],
  ['daisy', 'daisy', '#F08A2C', 'happy', 104, 64],
  ['blue', 'squircle', '#2B66E8', 'smug', 96, 54, { eyes: 'shades-wide' }],
  ['tre', 'trefoil', '#EE6FB0', 'confused', 100, 48],
  ['trex', 'dino-trex', '#3A4A9C', 'happy', 120, 52, { top: 'horns', accColor: '#F5A83A' }],
];
const REPO = 'https://github.com/dhri-yama/blobmates';
const MOODS = Object.keys(P.moods);
const BODIES = ['cloud', 'sun', 'squircle', 'daisy', 'bean', 'heart', 'trefoil', 'gear', 'ghost', 'egg', 'dino-spots', 'octagon', 'flower', 'drip', 'jelly', 'dino-stego'];

export default function Landing() {
  const items = useMemo(() => {
    const n = innerWidth < 700 ? 6 : CAST.length;
    return CAST.slice(0, n).map(([seed, body, color, mood, size, speed, extra]) => ({ seed, mood, size: innerWidth < 700 ? size * 0.75 : size, speed, react: true, pins: { body, color, ...extra } }));
  }, []);

  return (
    <>
      <section className="hero">
        <RoamField items={items} />
        <div className="hero-copy">
          <h1>Avatars that feel alive</h1>
          <p>Give every user, bot or persona a face. A name picks a blob, its colors and its look, the same way every time. Then it blinks, wanders and reacts to how it feels.</p>
          <a className="cta" href="#/editor">Open the editor</a>
          <a className="link" href="#/docs">Read the docs →</a>
        </div>
      </section>

      <section className="band">
        <h2>Sixteen moods, each with its own motion</h2>
        <p className="lead">Joyful bounces, angry trembles, sleepy sways, sad slumps. Move your mouse around: their eyes follow.</p>
        <div className="moods">
          {MOODS.map((m, i) => (
            <div key={m}>
              <div className="tile">
                <LiveBlobmate seed={`mood-${i}`} size={104} mood={m} pins={{ body: BODIES[i % BODIES.length], color: P.palettes[(i * 5) % P.palettes.length].color, top: 'none', eyes: 'none', face: 'none', cheeks: 'none' }} />
              </div>
              <div className="tile-label">{m}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <h2>Made to be tuned or left alone</h2>
        <p className="lead">Use the name and be done, or pin any single thing: shape, color, eyes, mouth, glasses, a bow.</p>
        <div className="cards">
          <div className="card"><div className="tile"><Blobmate seed="static" pins={{}} /></div><h3>Static</h3><p>One SVG string. Use it for profile pictures, lists and emails.</p></div>
          <div className="card"><div className="tile"><Blobmate seed="static" body="dino-tricera" color="#2FA35A" mood="joyful" /></div><h3>Live</h3><p>Blinks, follows the pointer and can roam around a box you give it.</p></div>
          <div className="card"><div className="tile"><Blobmate seed="static" body="togepi" color="#F7F1E3" eyes="glasses-round" face="handlebar" /></div><h3>Customizable</h3><p>{P.bodies.length} shapes, optional accessories, all editable in the editor.</p></div>
        </div>
      </section>

      <footer className="foot">
        <span>Blobmates · made with blobs</span>
        <a className="gh" href={REPO} target="_blank" rel="noopener noreferrer" aria-label="Blobmates on GitHub" title="View the project on GitHub">
          <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </footer>
    </>
  );
}
