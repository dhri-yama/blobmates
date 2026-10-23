import { useRoute } from './router.js';
import { Footer, Logo, RoamField } from './components.jsx';
import Landing from './pages/Landing.jsx';
import Editor from './pages/Editor.jsx';
import Docs from './pages/Docs.jsx';

// Small blobmates that wander along the navbar. Defined once so the roaming never restarts on route changes.
const NO_ACC = { top: 'none', eyes: 'none', face: 'none', cheeks: 'none' };
const NAV_CAST = [
  ['pip', 'cloud', '#4DA3F5', 'happy', 34, 55],
  ['moss', 'dino-spots', '#2FA35A', 'smug', 36, 40],
  ['peach', 'heart', '#EE6FB0', 'joyful', 32, 70],
  ['sunny', 'sun', '#F7C531', 'excited', 34, 85],
  ['lilac', 'ghost', '#AC8AD6', 'grateful', 34, 45],
  ['kiwi', 'bean', '#4FB39F', 'happy', 32, 60],
].slice(0, innerWidth < 700 ? 3 : 6).map(([seed, body, color, mood, size, speed]) => ({ seed, mood, size, speed, react: true, pins: { body, color, ...NO_ACC } }));

const LINKS = [['/', 'Home'], ['/editor', 'Editor'], ['/docs', 'Docs']];
const PAGES = { '/': Landing, '/editor': Editor, '/docs': Docs };

export default function App() {
  const route = useRoute();
  const Page = PAGES[route] || Landing;
  return (
    <>
      <header className="nav">
        <RoamField items={NAV_CAST} />
        <a className="brand" href="#/"><Logo />Blobmates</a>
        <nav>
          {LINKS.map(([to, label]) => (
            <a key={to} href={`#${to}`} className={route === to ? 'active' : ''}>{label}</a>
          ))}
        </nav>
      </header>
      <Page key={route} />
      <Footer />
    </>
  );
}
