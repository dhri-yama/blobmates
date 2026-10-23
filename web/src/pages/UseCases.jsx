import { useEffect, useRef, useState } from 'react';
import { Blobmate, LiveBlobmate } from '../components.jsx';
import { P } from '../blobmate.js';

const NO_ACC = { top: 'none', eyes: 'none', face: 'none', cheeks: 'none' };
const pins = (body, color) => ({ body, color, ...NO_ACC });

// One moment in an app for each mood: what to show it for.
const MOMENTS = [
  ['neutral', 'Default state. Waiting for the user.'],
  ['happy', 'Success, a welcome back, positive feedback.'],
  ['joyful', 'A big win: purchase done, goal reached.'],
  ['excited', 'New feature, launch day, level up.'],
  ['grateful', 'Thank-you messages, a donation received.'],
  ['sad', 'Bad news, a cancellation, a low rating.'],
  ['hurt', 'A request was rejected or an action failed.'],
  ['angry', 'Critical errors and blocked actions.'],
  ['stressed', 'Deadlines, an overloaded queue, many errors.'],
  ['bored', 'Nothing to do, idle for a while.'],
  ['confused', '404 pages, unclear input, empty search results.'],
  ['insecure', 'Asking for permissions or an uncertain choice.'],
  ['guilty', 'Apologies, a missed streak, a late payment.'],
  ['surprised', 'A new message or an unexpected result.'],
  ['sleepy', 'Late at night, low activity, winding down.'],
  ['smug', 'Easter eggs, achievements, "told you so".'],
  ['thinking', 'Loading, an AI answering, processing.'],
  ['sleeping', 'Offline, paused, an empty inbox.'],
].filter(([m]) => P.moods[m]);

const BODIES = ['cloud', 'sun', 'squircle', 'daisy', 'bean', 'heart', 'trefoil', 'gear', 'ghost', 'egg', 'dino-spots', 'octagon', 'flower', 'drip', 'jelly', 'dino-stego', 'togepi', 'cloud-wide'];

// A demo card: a live blobmate on a tile, with a title, a one-line idea and the controls below it.
const Case = ({ title, idea, mood, seed, look, children }) => (
  <article className="case">
    <div className="tile demo">
      <LiveBlobmate seed={seed} size={120} mood={mood} pins={look} react />
    </div>
    <h3>{title}</h3>
    <p>{idea}</p>
    {children}
  </article>
);

// ---- demos -----------------------------------------------------------------

const STRENGTH = [
  ['neutral', 'Type a password'],
  ['stressed', 'Weak'],
  ['confused', 'Fair'],
  ['happy', 'Good'],
  ['joyful', 'Strong'],
];
const strength = (pw) => {
  if (!pw) return 0;
  const points = [pw.length >= 8, pw.length >= 12, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return points <= 1 ? 1 : points === 2 ? 2 : points === 3 ? 3 : 4;
};

function PasswordCase() {
  const [pw, setPw] = useState('');
  const level = strength(pw);
  const [mood, label] = STRENGTH[level];
  return (
    <Case title="Form feedback" idea="The face tells people how their input is going, before they read any text." mood={mood} seed="form" look={pins('cloud', '#4DA3F5')}>
      <label className="field-label" htmlFor="pw-demo">Try a password</label>
      <input id="pw-demo" type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Start typing" autoComplete="off" spellCheck={false} />
      <div className="meter" aria-hidden="true"><i style={{ width: `${(level / 4) * 100}%` }} /></div>
      <p className="status" aria-live="polite">{label}</p>
      <p className="fine">Demo only. Nothing you type leaves this page.</p>
    </Case>
  );
}

function UploadCase() {
  const [phase, setPhase] = useState('idle'); // idle | uploading | done | failed
  const [progress, setProgress] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const start = (willFail) => {
    clearInterval(timer.current);
    setPhase('uploading');
    setProgress(0);
    let p = 0;
    timer.current = setInterval(() => {
      p += 6;
      setProgress(Math.min(p, 100));
      if (willFail && p >= 60) { clearInterval(timer.current); setPhase('failed'); }
      else if (p >= 100) { clearInterval(timer.current); setPhase('done'); }
    }, 120);
  };
  const MOODS = { idle: 'neutral', uploading: 'thinking', done: 'excited', failed: 'hurt' };
  const TEXT = { idle: 'Ready to upload', uploading: `Uploading… ${progress}%`, done: 'All done!', failed: 'Upload failed. Try again.' };
  return (
    <Case title="Loading and results" idea="Thinking while it works, excited when it lands, hurt when it breaks." mood={MOODS[phase]} seed="upload" look={pins('sun', '#F7C531')}>
      <div className="meter" aria-hidden="true"><i style={{ width: `${phase === 'idle' ? 0 : progress}%` }} /></div>
      <p className="status" aria-live="polite">{TEXT[phase]}</p>
      <div className="row start">
        <button className="on" disabled={phase === 'uploading'} onClick={() => start(false)}>Upload a file</button>
        <button disabled={phase === 'uploading'} onClick={() => start(true)}>Make it fail</button>
      </div>
    </Case>
  );
}

const RATINGS = [
  ['angry', 'Terrible'],
  ['sad', 'Not great'],
  ['neutral', 'It was fine'],
  ['happy', 'Good'],
  ['joyful', 'Loved it'],
];

function RatingCase() {
  const [score, setScore] = useState(3);
  const [mood, label] = RATINGS[score - 1];
  return (
    <Case title="Ratings and feedback" idea="A rating that people can see and feel, instead of a row of stars." mood={mood} seed="rating" look={pins('heart', '#EE6FB0')}>
      <label className="field-label" htmlFor="rating-demo">How was your visit?</label>
      <input id="rating-demo" className="range" type="range" min="1" max="5" step="1" value={score} onChange={(e) => setScore(+e.target.value)} />
      <p className="status" aria-live="polite">{score} of 5 · {label}</p>
    </Case>
  );
}

const ASSISTANT = [
  ['Idle', 'neutral', 'Hi, ask me anything.'],
  ['Thinking', 'thinking', 'One moment…'],
  ['Replying', 'happy', 'Here is what I found.'],
  ['Offline', 'sleeping', 'Back soon.'],
];

function AssistantCase() {
  const [i, setI] = useState(0);
  const [, mood, line] = ASSISTANT[i];
  return (
    <Case title="Assistants and bots" idea="Give a chatbot or an AI helper a face that shows what it is doing." mood={mood} seed="assistant" look={pins('dino-tricera', '#2FA35A')}>
      <div className="seg" role="group" aria-label="Assistant state">
        {ASSISTANT.map(([name], k) => <button key={name} className={i === k ? 'on' : ''} onClick={() => setI(k)}>{name}</button>)}
      </div>
      <p className="bubble" aria-live="polite">{line}</p>
    </Case>
  );
}

const FEELINGS = [
  ['joyful', 'Joyful'], ['excited', 'Excited'], ['grateful', 'Grateful'], ['neutral', 'Okay'],
  ['bored', 'Bored'], ['sleepy', 'Tired'], ['sad', 'Sad'], ['stressed', 'Stressed'], ['angry', 'Angry'], ['confused', 'Confused'],
];

function CheckinCase() {
  const [feeling, setFeeling] = useState('grateful');
  const label = FEELINGS.find(([m]) => m === feeling)[1];
  return (
    <Case title="Wellness check-ins" idea="Pick how you feel and your blobmate feels it with you. Good for journals, habit and mindfulness apps." mood={feeling} seed="checkin" look={pins('daisy', '#F08A2C')}>
      <p className="field-label">How are you feeling today?</p>
      <div className="chips-pick" role="group" aria-label="Feeling">
        {FEELINGS.map(([m, name]) => <button key={m} className={feeling === m ? 'on' : ''} onClick={() => setFeeling(m)}>{name}</button>)}
      </div>
      <p className="status" aria-live="polite">Today: {label}</p>
    </Case>
  );
}

const TEAM = ['Mia', 'Noah', 'Zed', 'Ana', 'Kofi', 'Lena', 'Omar', 'Yuki'];

function ProfilesCase() {
  const [name, setName] = useState('Sam');
  const who = name.trim() || 'Sam';
  return (
    <article className="case wide">
      <h3>Profile pictures</h3>
      <p>No uploads and no stock photos. Every person gets their own character from their name, and the same name always gives the same one, on every device.</p>
      <div className="profiles">
        <div className="me">
          <Blobmate seed={who} size={112} shape="circle" label={`${who}'s avatar`} />
          <label className="field-label" htmlFor="name-demo">Type a name</label>
          <input id="name-demo" type="text" value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} />
        </div>
        <ul className="team" aria-label="Example team">
          {TEAM.map((n) => (
            <li key={n}>
              <Blobmate seed={n} size={56} shape="circle" label={`${n}'s avatar`} />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function UseCases() {
  return (
    <>
      <section className="band intro">
        <h1>Use cases</h1>
        <p className="lead">Wherever your app has a moment with a feeling in it, a blobmate can show it. These are live, so poke at them.</p>
      </section>

      <section className="band tight">
        <h2>Try it in context</h2>
        <p className="lead">Each demo drives a real blobmate with the same library you install.</p>
        <div className="cases">
          <PasswordCase />
          <UploadCase />
          <RatingCase />
          <AssistantCase />
          <CheckinCase />
          <ProfilesCase />
        </div>
      </section>

      <section className="band tight">
        <h2>Which mood for which moment</h2>
        <p className="lead">All {MOMENTS.length} moods, each with its own face and its own movement, and the moment it fits.</p>
        <div className="moments">
          {MOMENTS.map(([m, when], i) => (
            <div key={m} className="moment">
              <div className="tile">
                <LiveBlobmate seed={`moment-${m}`} size={96} mood={m} pins={pins(BODIES[i % BODIES.length], P.palettes[(i * 5) % P.palettes.length].color)} />
              </div>
              <h3>{m}</h3>
              <p>{when}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band tight more">
        <h2>More places they fit</h2>
        <ul className="ideas">
          <li><b>Onboarding.</b> A guide that greets people and reacts as they finish each step.</li>
          <li><b>Empty and error pages.</b> Confused on a 404, sleeping on an empty inbox, hurt when a payment fails.</li>
          <li><b>Games and streaks.</b> Excited for a streak, guilty or bored when it lapses.</li>
          <li><b>Customer support.</b> A calmer face for a queue, a happier one when an issue is solved.</li>
          <li><b>Team directories and comments.</b> A friendly default picture for everyone, with no photos to moderate.</li>
        </ul>
        <p className="lead cta-line">Ready to use one? <a className="link" href="#/editor">Design yours in the editor</a> or <a className="link" href="#/docs">read the docs</a>.</p>
      </section>
    </>
  );
}
