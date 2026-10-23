import { useEffect, useRef, useState } from 'react';
import { useRoute } from './router.js';
import { Footer, Logo, RoamField } from './components.jsx';
import Landing from './pages/Landing.jsx';
import Editor from './pages/Editor.jsx';
import Docs from './pages/Docs.jsx';

// Small blobmates that wander along the navbar (none on phones, where the bar is too tight). Defined once so the roaming never restarts on route changes.
const NO_ACC = { top: 'none', eyes: 'none', face: 'none', cheeks: 'none' };
const NAV_CAST = [
  ['pip', 'cloud', '#4DA3F5', 'happy', 34, 55],
  ['moss', 'dino-spots', '#2FA35A', 'smug', 36, 40],
  ['peach', 'heart', '#EE6FB0', 'joyful', 32, 70],
  ['sunny', 'sun', '#F7C531', 'excited', 34, 85],
  ['lilac', 'ghost', '#AC8AD6', 'grateful', 34, 45],
  ['kiwi', 'bean', '#4FB39F', 'happy', 32, 60],
].slice(0, innerWidth < 640 ? 0 : innerWidth < 700 ? 3 : 6).map(([seed, body, color, mood, size, speed]) => ({ seed, mood, size, speed, react: true, pins: { body, color, ...NO_ACC } }));

const LINKS = [['/', 'Home'], ['/editor', 'Editor'], ['/docs', 'Docs']];
const PAGES = { '/': Landing, '/editor': Editor, '/docs': Docs };

export default function App() {
  const route = useRoute();
  const Page = PAGES[route] || Landing;
  const [open, setOpen] = useState(false);
  const header = useRef(null);

  // The mobile menu closes on navigation, on Escape, and when you tap outside the navbar.
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => !header.current?.contains(e.target) && setOpen(false);
    addEventListener('keydown', onKey);
    addEventListener('pointerdown', onDown);
    return () => { removeEventListener('keydown', onKey); removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <>
      <header className="nav" ref={header}>
        <RoamField items={NAV_CAST} />
        <a className="brand" href="#/"><Logo />Blobmates</a>
        <button className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
          </svg>
        </button>
        <nav id="site-menu" className={open ? 'open' : ''}>
          {LINKS.map(([to, label]) => (
            <a key={to} href={`#${to}`} className={route === to ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
      </header>
      <Page key={route} />
      <Footer />
    </>
  );
}
