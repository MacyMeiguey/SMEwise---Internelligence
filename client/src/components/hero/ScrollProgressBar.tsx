/**
 * ScrollProgressBar — thin gradient ribbon pinned to the very top of the
 * viewport that fills as the user scrolls the landing page.
 *
 * Implementation notes:
 *   • Uses a passive scroll listener + requestAnimationFrame, no React state
 *     on every frame, so it stays cheap.
 *   • Sits above the splash and header by absolute z-index ordering, but is
 *     pointer-events: none so it never blocks clicks.
 *   • Respects `prefers-reduced-motion` by disabling the colour shimmer.
 */

import { useEffect, useRef } from 'react';

export default function ScrollProgressBar() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let raf = 0;
    const update = () => {
      const el = fillRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY || window.pageYOffset || 0;
      const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      el.style.transform = `scaleX(${p})`;
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

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[150] h-[4px] pointer-events-none"
    >
      <div className="absolute inset-0 bg-white/[0.04]" />
      <div
        ref={fillRef}
        className="absolute inset-y-0 left-0 right-0 origin-left bg-gradient-to-r from-primary-400 to-primary-600 motion-safe:animate-gradient-shift"
        style={{ transform: 'scaleX(0)', transition: 'transform 120ms linear', backgroundSize: '300% 100%' }}
      />
    </div>
  );
}
