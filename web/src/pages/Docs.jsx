import { useState } from 'react';
import { Blobmate } from '../components.jsx';
import { P } from '../blobmate.js';
import { FRAMEWORKS, INSTALL, TESTED, snippet } from '../snippets.js';

const SECTIONS = [
  ['overview', 'Overview'], ['install', 'Install'], ['static', 'Static avatars'], ['live', 'Live avatars'], ['frameworks', 'Frameworks'],
  ['options', 'Options'], ['moods', 'Moods'], ['shapes', 'Shapes'], ['accessories', 'Accessories'],
  ['motion', 'Motion and roaming'], ['determinism', 'Determinism'], ['platforms', 'Platforms'],
];

const Code = ({ children }) => <pre><code>{children}</code></pre>;
const Chips = ({ items }) => <div className="chips">{items.map((i) => <span key={i}>{i}</span>)}</div>;

export default function Docs() {
  const [seed, setSeed] = useState('sagar');
  const [mood, setMood] = useState('happy');
  const [fw, setFw] = useState('react');
  const [kind, setKind] = useState('live');
  const [reactOn, setReactOn] = useState(true);
  const slots = { top: 'Head', eyes: 'Glasses', face: 'Moustache & beard', cheeks: 'Cheeks' };

  return (
    <div className="docs">
      <aside className="toc">
        <b>On this page</b>
        {SECTIONS.map(([id, label]) => <a key={id} href={`#/docs`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>{label}</a>)}
      </aside>

      <article className="doc">
        <h1>Documentation</h1>
        <p id="overview">Blobmates turns a string (a username, an email, anything) into a friendly blob avatar. The same string always gives the same avatar, on every device. You can then change any part of it, and make it move.</p>

        <div className="try">
          <Blobmate seed={seed} mood={mood} size={96} />
          <div>
            <input type="text" value={seed} onChange={(e) => setSeed(e.target.value || 'x')} spellCheck={false} />
            <div className="chips">
              {['happy', 'angry', 'sleepy', 'surprised'].map((m) => (
                <span key={m} style={{ cursor: 'pointer', background: mood === m ? 'var(--orange)' : '#fff', color: mood === m ? '#fff' : 'inherit' }} onClick={() => setMood(m)}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        <h2 id="install">Install</h2>
        <Code>{INSTALL}</Code>
        <p>Then import what you need. TypeScript types are included.</p>
        <Code>{`import { blobmate } from "blobmates";                  // static avatars
import { animate } from "blobmates/runtime";          // live avatars (browser only)
import { Blobmate, LiveBlobmate } from "blobmates/react"; // React components`}</Code>

        <h2 id="static">Static avatars</h2>
        <p><code>blobmate(seed, options)</code> returns an SVG string. There is no animation and nothing runs in the browser afterwards, so it suits profile pictures, lists, emails and server rendering.</p>
        <Code>{`const svg = blobmate("sagar", { mood: "happy", size: 96, shape: "circle" });

// in React
<Blobmate seed="sagar" mood="happy" size={96} shape="circle" />`}</Code>
        <p>A different <code>mood</code> is a different picture. To change expression, swap the image.</p>

        <h2 id="live">Live avatars</h2>
        <p><code>animate(host, blobmate, options)</code> draws an avatar inside an element and keeps it alive: it blinks, its eyes follow the pointer, and it moves according to its mood. Browser only.</p>
        <Code>{`const rt = animate(document.querySelector("#box"), blobmate, {
  seed: "sagar",
  mood: "happy",
  size: 120,
  motion: "follow",          // "none" | "follow" | "idle"
  roam: { speed: 70 },       // optional: wander around inside #box
});

rt.set({ mood: "angry" });   // eases into the new mood
rt.lookAt(x, y);             // point its eyes at a screen position
rt.destroy();`}</Code>
        <p>Add <code>react: true</code> and the avatar responds when tapped, touched or focused and activated with Enter or Space: it jumps, wobbles and shows a surprised, joyful, excited or happy face for about a second, and stops walking while it does. Pass <code>react: {'{'} moods: ["surprised"], duration: 1.5 {'}'}</code> to choose the faces and the length, or call <code>rt.poke()</code> yourself, for example when something succeeds. It is off by default.</p>
        <p>Put several in one element to get a crowd. Pass <code>spawn: "random"</code> to scatter them instead of starting in the middle.</p>

        <h3>Live options</h3>
        <table>
          <thead><tr><th>Option</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><code>seed</code>, <code>pins</code></td><td>who it is: the seed, plus any pinned options from the table below</td></tr>
            <tr><td><code>mood</code></td><td>starting mood. Change it later with <code>rt.set(&#123; mood &#125;)</code></td></tr>
            <tr><td><code>size</code></td><td>pixels, default 120</td></tr>
            <tr><td><code>motion</code></td><td><code>"none"</code>, <code>"follow"</code> (eyes follow the pointer) or <code>"idle"</code> (eyes wander)</td></tr>
            <tr><td><code>roam</code></td><td><code>&#123; speed: 70, pause: [0.6, 2.2] &#125;</code> to wander inside the host. Leave out to stay put</td></tr>
            <tr><td><code>spawn</code></td><td><code>"random"</code> scatters many avatars instead of starting in the middle</td></tr>
            <tr><td><code>react</code></td><td><code>true</code> or <code>&#123; moods, duration &#125;</code>. Off by default</td></tr>
          </tbody>
        </table>
        <p>Methods: <code>rt.set(patch)</code>, <code>rt.lookAt(x, y)</code>, <code>rt.poke()</code> and <code>rt.destroy()</code>. Call <code>destroy</code> when the element goes away.</p>

        <h2 id="frameworks">Frameworks</h2>
        <p>The same two calls work everywhere. Pick a framework to see the code for it.</p>
        <div className="seg" role="group" aria-label="Framework" style={{ marginBottom: 8 }}>
          {FRAMEWORKS.map(([id, label]) => <button key={id} className={fw === id ? 'on' : ''} onClick={() => setFw(id)}>{label}</button>)}
        </div>{' '}
        <div className="seg" role="group" aria-label="Type" style={{ marginBottom: 8 }}>
          {['static', 'live'].map((k) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
        </div>
        <Code>{snippet(fw, kind, { name: seed, pins: {}, mood, motion: 'follow', roam: false, react: reactOn })}</Code>
        <p style={{ fontSize: 13 }}>
          <label><input type="checkbox" checked={reactOn} onChange={(e) => setReactOn(e.target.checked)} /> reacts to taps</label>
          {' '}· {TESTED[fw] ? 'Mirrors code that runs on this site.' : 'Adapted to this framework but not run here, so treat it as a starting point.'}
        </p>

        <h2 id="options">Options</h2>
        <p>By default the seed decides everything. Pass an option to pin that one thing.</p>
        <table>
          <thead><tr><th>Option</th><th>Values</th></tr></thead>
          <tbody>
            <tr><td><code>body</code></td><td>a shape id, see Shapes</td></tr>
            <tr><td><code>style</code></td><td>{Object.keys(P.styles).join(', ')}</td></tr>
            <tr><td><code>color</code></td><td>a hex like <code>#F4A3C9</code>, or one of {P.palettes.map((p) => p.id).join(', ')}</td></tr>
            <tr><td><code>variant</code></td><td>eye type, 0 to 4</td></tr>
            <tr><td><code>eyeSize</code></td><td>0.7 to 1.4</td></tr>
            <tr><td><code>faceY</code></td><td>-10 to 10, moves the face up or down</td></tr>
            <tr><td><code>mouth</code></td><td>{Object.keys(P.mouths).filter((m) => m !== 'none').join(', ')}</td></tr>
            <tr><td><code>brow</code></td><td>{Object.keys(P.brows).join(', ')}</td></tr>
            <tr><td><code>top, eyes, face, cheeks</code></td><td>an accessory id, or <code>"none"</code></td></tr>
            <tr><td><code>accColor</code></td><td>hex color for accessories</td></tr>
            <tr><td><code>mood</code></td><td>see Moods</td></tr>
            <tr><td><code>gaze</code></td><td><code>[x, y]</code> from -1 to 1</td></tr>
            <tr><td><code>shape</code></td><td><code>circle</code>, <code>rounded</code>, <code>square</code> (crops the picture)</td></tr>
            <tr><td><code>bg</code></td><td>background color</td></tr>
            <tr><td><code>size</code></td><td>pixels, default 128</td></tr>
          </tbody>
        </table>
        <p><code>blobmate.resolve(seed, options)</code> returns what the seed chose, which is handy for showing the current value of anything you have not pinned.</p>

        <h2 id="moods">Moods</h2>
        <Chips items={Object.keys(P.moods)} />
        <p>A mood sets the eyes, brows and mouth, and also how the shape moves and how often it blinks.</p>
        <p><code>thinking</code> and <code>sleeping</code> also draw a small overlay above the head: a thought bubble whose three dots light up in turn, and drifting z's. Live avatars animate them. A static SVG shows one fixed frame. <code>sleepy</code> is the drowsy half-open-eyed one, and <code>sleeping</code> is asleep.</p>

        <h2 id="shapes">Shapes</h2>
        <p>{P.bodies.length} bodies, including dinos and a Togepi-style egg.</p>
        <Chips items={P.bodies.map((b) => b.id)} />

        <h2 id="accessories">Accessories</h2>
        <p>Optional. For each slot the seed decides whether to add one (not every avatar gets one), or you pin an item or <code>"none"</code>.</p>
        {Object.entries(slots).map(([slot, title]) => (
          <div key={slot}><h3>{title} <code>{slot}</code></h3><Chips items={P.accessories[slot].map((a) => a.id)} /></div>
        ))}

        <h2 id="motion">Motion and roaming</h2>
        <p>Each mood carries its own numbers for bounce, squash, tilt, tremble, walking speed and how often it blinks. They are plain data in <code>parts.json</code>, so another platform can animate from the same values.</p>
        <p>With <code>roam</code> on, the avatar walks to a random spot in its host element, pauses, then picks another. It hops as it goes, leans into the direction, looks where it is heading, and walks faster or slower depending on its mood.</p>
        <p>If the visitor's system asks for reduced motion, movement and blinking are switched off.</p>

        <h2 id="determinism">Determinism</h2>
        <p>The seed is hashed (FNV-1a) into a small random generator (mulberry32). Choices are drawn in a fixed order using integer math only, so the result does not depend on the platform.</p>
        <div className="note">Adding or removing shapes changes which shape some seeds land on. Treat a published set of parts as a version and do not edit it in place.</div>

        <h2 id="platforms">Platforms</h2>
        <table>
          <thead><tr><th>Where</th><th>Static</th><th>Live</th></tr></thead>
          <tbody>
            <tr><td>Web, React, Electron</td><td>yes</td><td>yes</td></tr>
            <tr><td>Node (server rendering)</td><td>yes</td><td>no</td></tr>
            <tr><td>Android, iOS and Mac apps</td><td>show an SVG made by the JS core</td><td>not yet</td></tr>
          </tbody>
        </table>
        <p>Native Kotlin and Swift ports of the core are planned. They would read the same <code>parts.json</code> so the shapes and moods match.</p>
      </article>
    </div>
  );
}
