/**
 * BackToTop — gradient pill that fades in once you've scrolled past the hero.
 * Sits above the assistant panel (z-40) and below the dot nav.
 */

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => setShow(window.scrollY > window.innerHeight * 0.65);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`
        fixed bottom-7 left-1/2 -translate-x-1/2 z-40
        flex items-center gap-1.5 px-3.5 py-2 rounded-lg
        bg-primary-600 hover:bg-primary-500
        text-white text-[11px] font-semibold tracking-wide uppercase
        shadow-lg shadow-primary-900/40
        border border-primary-400/30
        transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400
        active:scale-[0.98]
        ${show
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-3 pointer-events-none'
        }
      `}
    >
      <ArrowUp className="h-3.5 w-3.5" aria-hidden />
      Top
    </button>
  );
}
