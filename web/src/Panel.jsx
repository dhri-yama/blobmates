import { useDeferredValue, useMemo } from 'react';
import { blobmate, P } from './blobmate.js';

const Svg = ({ svg }) => <span dangerouslySetInnerHTML={{ __html: svg }} style={{ display: 'contents' }} />;

function Section({ title, keys, hint, pins, onUnpin, children }) {
  const isPinned = keys.some((k) => pins[k] !== undefined);
  return (
    <div className="sec">
      <h3>
        <span><b>{title}</b> {hint}</span>
        <a className={isPinned ? '' : 'off'} onClick={() => isPinned && onUnpin(keys)}>{isPinned ? 'unpin' : 'auto'}</a>
      </h3>
      {children}
    </div>
  );
}

const Cell = ({ selected, onClick, svg, text, label }) => (
  <button className={`cell ${selected ? 'sel' : ''}`} onClick={onClick}>
    {svg ? <Svg svg={svg} /> : <span className="tx">{text}</span>}
    {label}
  </button>
);

const Chips = ({ pins, k, values, setPin, fmt = (v) => v }) => (
  <div className="sw">
    <span className={pins[k] === undefined ? 'sel' : ''} onClick={() => setPin(k, undefined)}>auto</span>
    {values.map((v) => (
      <span key={v} className={pins[k] === v ? 'sel' : ''} onClick={() => setPin(k, v)}>{fmt(v)}</span>
    ))}
  </div>
);

const Swatches = ({ pins, k, list, setPin }) => (
  <div className="sw">
    <span className={pins[k] === undefined ? 'sel' : ''} onClick={() => setPin(k, undefined)}>auto</span>
    {list.map((c) => (
      <i key={c} className={pins[k]?.toLowerCase?.() === c.toLowerCase() ? 'sel' : ''} style={{ background: c }} onClick={() => setPin(k, c)} />
    ))}
    <input type="color" value={(pins[k] || '#888888').slice(0, 7)} title="custom" onChange={(e) => setPin(k, e.target.value)} />
  </div>
);

const Slider = ({ pins, k, label, min, max, step, def, setPin }) => {
  const value = pins[k] ?? def;
  return (
    <label className="sl">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} style={{ opacity: pins[k] !== undefined ? 1 : 0.65 }} onChange={(e) => setPin(k, +e.target.value)} />
      <output>{+Number(value).toFixed(2)}</output>
    </label>
  );
};

const ACC = [['top', 'Hair & hats'], ['eyes', 'Glasses'], ['face', 'Moustache & beard'], ['cheeks', 'Cheeks']];

export default function Panel({ name, pins, setPin, unpin }) {
  // Thumbnails are the expensive part; let slider drags stay smooth by deferring them.
  const dPins = useDeferredValue(pins);
  const auto = useMemo(() => blobmate.resolve(name, dPins), [name, dPins]);
  const thumb = (extra) => blobmate(name, { ...dPins, size: 52, ...extra });

  const thumbs = useMemo(() => ({
    body: P.bodies.map((b) => thumb({ body: b.id, style: b.block ? 'block-eyes' : dPins.style })),
    mouth: Object.keys(P.mouths).filter((m) => m !== 'none').map((m) => [m, thumb({ mouth: m })]),
    acc: Object.fromEntries(ACC.map(([slot]) => [slot, P.accessories[slot].map((x) => [x.id, thumb({ [slot]: x.id })])])),
  }), [name, dPins]);

  const common = { pins, onUnpin: unpin };
  const sw = { pins, setPin };

  return (
    <div className="panel">
      <Section title="Shape" keys={['body', 'style']} hint={pins.body === undefined && <small>→ {auto.body.id}</small>} {...common}>
        <div className="grid">
          <Cell text="↺" label="auto" selected={pins.body === undefined} onClick={() => setPin('body', undefined)} />
          {P.bodies.map((b, i) => (
            <Cell key={b.id} svg={thumbs.body[i]} label={b.id} selected={pins.body === b.id} onClick={() => setPin('body', b.id)} />
          ))}
        </div>
        <div className="sub">style</div>
        <Chips {...sw} k="style" values={Object.keys(P.styles)} />
      </Section>

      <Section title="Color" keys={['color']} {...common}>
        <Swatches {...sw} k="color" list={P.palettes.map((p) => p.color)} />
      </Section>

      <Section title="Eyes" keys={['variant', 'eyeSize']} {...common}>
        <Chips {...sw} k="variant" values={[0, 1, 2, 3, 4]} fmt={(v) => `type ${v + 1}`} />
        <Slider {...sw} k="eyeSize" label="size" min={0.7} max={1.4} step={0.05} def={auto.eyeScale} />
        <Slider {...sw} k="faceY" label="face height" min={-10} max={10} step={1} def={0} />
      </Section>

      <Section title="Mouth" keys={['mouth']} {...common}>
        <div className="grid">
          <Cell text="↺" label="auto" selected={pins.mouth === undefined} onClick={() => setPin('mouth', undefined)} />
          {thumbs.mouth.map(([m, svg]) => (
            <Cell key={m} svg={svg} label={m} selected={pins.mouth === m} onClick={() => setPin('mouth', m)} />
          ))}
        </div>
      </Section>

      <Section title="Brows" keys={['brow']} {...common}>
        <Chips {...sw} k="brow" values={Object.keys(P.brows)} />
      </Section>

      {ACC.map(([slot, title]) => (
        <Section key={slot} title={title} keys={[slot]} hint={pins[slot] === undefined && <small>→ {auto.acc[slot]?.id || 'none'}</small>} {...common}>
          <div className="grid">
            <Cell text="↺" label="auto" selected={pins[slot] === undefined} onClick={() => setPin(slot, undefined)} />
            <Cell text="∅" label="none" selected={pins[slot] === 'none'} onClick={() => setPin(slot, 'none')} />
            {thumbs.acc[slot].map(([id, svg]) => (
              <Cell key={id} svg={svg} label={id} selected={pins[slot] === id} onClick={() => setPin(slot, id)} />
            ))}
          </div>
        </Section>
      ))}

      <Section title="Accessory color" keys={['accColor']} {...common}>
        <Swatches {...sw} k="accColor" list={P.accColors} />
      </Section>
    </div>
  );
}
