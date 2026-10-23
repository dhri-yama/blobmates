import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { polypal, P } from '../polypal.js';
import Panel from '../Panel.jsx';
import Stage from '../Stage.jsx';
import { FRAMEWORKS, TESTED, snippet } from '../snippets.js';

export default function Editor() {
  const [name, setName] = useState('alain00');
  const [pins, setPins] = useState({});
  const [mood, setMood] = useState('neutral');
  const [motion, setMotion] = useState('follow');
  const [roam, setRoam] = useState(false);
  const [react, setReact] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fw, setFw] = useState('react');
  const [kind, setKind] = useState('static');
  const [codeCopied, setCodeCopied] = useState(false);
  const dPins = useDeferredValue(pins);
  const moodThumbs = useMemo(() => Object.keys(P.moods).map((m) => [m, polypal(name, { ...dPins, mood: m, size: 52 })]), [name, dPins]);

  const setPin = useCallback((k, v) => setPins((p) => {
    const next = { ...p };
    if (v === undefined) delete next[k]; else next[k] = v;
    return next;
  }), []);
  const unpin = useCallback((keys) => setPins((p) => {
    const next = { ...p };
    keys.forEach((k) => delete next[k]);
    return next;
  }), []);

  const count = Object.keys(pins).length;
  // What the name picked for everything that is not pinned, so the code box changes when the name does.
  const picked = useMemo(() => {
    const r = polypal.resolve(name, pins);
    const all = {
      style: r.style, body: r.body.id, color: r.color,
      mouth: r.mouth, brow: r.brow, eyeSize: r.eyeScale,
      top: r.acc.top?.id || 'none', eyes: r.acc.eyes?.id || 'none', face: r.acc.face?.id || 'none', cheeks: r.acc.cheeks?.id || 'none',
    };
    if (Object.values(r.acc).some(Boolean)) all.accColor = r.accColor;
    return Object.entries(all).filter(([k]) => pins[k] === undefined);
  }, [name, pins]);
  const code = snippet(fw, kind, { name, pins, mood, motion, roam, react });
  const pickedText = `// picked by the name${count ? ' (everything not pinned)' : ''}:\n` + picked.map(([k, v]) => `//   ${k}: ${JSON.stringify(v)}`).join('\n');
  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1200);
  };

  const svg = (size) => polypal(name, { ...pins, mood, size });
  const copy = () => {
    navigator.clipboard?.writeText(svg(128));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([svg(512)], { type: 'image/svg+xml' }));
    a.download = `${name}.svg`;
    a.click();
  };

  return (
    <div className="editor">
      <div className="left">
        <div className="stagecol">
        <div className="row">
          <input type="text" value={name} spellCheck={false} onChange={(e) => setName(e.target.value || 'x')} />
          <button className="icon" title="Shuffle" aria-label="Shuffle name" onClick={() => setName(Math.random().toString(36).slice(2, 8))}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </button>
        </div>
        <Stage name={name} pins={pins} mood={mood} motion={motion} roam={roam} react={react} />
        <div className="controls">
          <div className="seg" role="group" aria-label="Motion">
            {['none', 'follow', 'idle'].map((m) => (
              <button key={m} className={motion === m ? 'on' : ''} onClick={() => setMotion(m)}>{m}</button>
            ))}
          </div>
          <label className="switch">
            <input type="checkbox" checked={roam} onChange={(e) => setRoam(e.target.checked)} />
            <span>Roam</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={react} onChange={(e) => setReact(e.target.checked)} />
            <span>Tap</span>
          </label>
          <span className="spacer" />
          <button className="icon" title={copied ? 'Copied' : 'Copy SVG'} aria-label="Copy SVG" onClick={copy}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {copied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></>}
            </svg>
          </button>
          <button className="icon" title="Download SVG" aria-label="Download SVG" onClick={download}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
            </svg>
          </button>
        </div>
        </div>
        <div className="sidecol">
          <div className="label">Mood</div>
        <div className="moodgrid">
          {moodThumbs.map(([m, svg]) => (
            <button key={m} className={`cell ${mood === m ? 'sel' : ''}`} onClick={() => setMood(m)}>
              <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: svg }} />
              {m}
            </button>
          ))}
        </div>
          <div className="label">Code</div>
          <div className="codebar">
            <div className="seg" role="group" aria-label="Framework">
              {FRAMEWORKS.map(([id, label]) => (
                <button key={id} className={fw === id ? 'on' : ''} onClick={() => setFw(id)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="codebar">
            <div className="seg" role="group" aria-label="Polypal type">
              {['static', 'live'].map((k) => (
                <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
            <span className="spacer" />
            <button className="icon" title={codeCopied ? 'Copied' : 'Copy code'} aria-label="Copy code" onClick={copyCode}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {codeCopied ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></>}
              </svg>
            </button>
          </div>
          <pre>{code}</pre>
          <p className="hint">
            {TESTED[fw] ? 'Mirrors code that runs in this site.' : 'Same two calls, adapted to this framework. Not run here, so treat it as a starting point.'}
            {' '}Imports are local paths until the package is published.
          </p>
          <details className="picked">
            <summary>Picked by the name</summary>
            <pre>{pickedText}</pre>
          </details>
        </div>
      </div>
      <Panel name={name} pins={pins} setPin={setPin} unpin={unpin} />
    </div>
  );
}
