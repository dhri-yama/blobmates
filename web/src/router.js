import { useEffect, useState } from 'react';

// Hash routing: works on any static host with no rewrite rules.
const read = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
