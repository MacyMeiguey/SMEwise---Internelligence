/**
 * useScrollProgress — passive scroll tracker exposing a mutable progress ref.
 *
 * Returns a stable `ref` whose `.current` is the normalised scroll position
 * (0 at the top of the document, 1 at the bottom). The ref is updated inside
 * a `requestAnimationFrame` so the scene can read it from useFrame without
 * triggering React re-renders.
 */

import { useEffect, useRef } from 'react';

export function useScrollProgress(): React.MutableRefObject<number> {
  const ref = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY || window.pageYOffset || 0;
      ref.current = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    };
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  return ref;
}
