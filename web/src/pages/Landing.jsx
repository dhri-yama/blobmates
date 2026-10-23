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
        <h2>{MOODS.length} moods, each with its own motion</h2>
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
    </>
  );
}
