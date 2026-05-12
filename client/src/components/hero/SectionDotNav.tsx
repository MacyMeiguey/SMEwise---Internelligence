/**
 * SectionDotNav — right-rail section markers + scroll progress.
 *
 * • IntersectionObserver picks the “current” section (active dot).
 * • Document scroll drives a lavender fill + moving puck on the rail so
 *   vertical progress is obvious alongside the dots (pairs with top bar).
 */

import { useEffect, useRef, useState } from 'react';

const SECTIONS = [
  { id: 'landing-hero',       label: 'Home' },
  { id: 'meet-advisor',      label: 'Advisor' },
  { id: 'landing-see-it',    label: 'Workspace' },
  { id: 'landing-pain-gain', label: 'Why SMEwise' },
  { id: 'landing-features',  label: 'Features' },
  { id: 'landing-cta',       label: 'Get started' },
] as const;

function readScrollProgress(): number {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const y = window.scrollY || window.pageYOffset || 0;
  return max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
}

export default function SectionDotNav() {
  const [active, setActive] = useState<string>('landing-hero');
  const [present, setPresent] = useState<string[]>([]);
  const [scrollP, setScrollP] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);
  const lastP = useRef(-1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onMq = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onMq);
    return () => mq.removeEventListener('change', onMq);
  }, []);

  useEffect(() => {
    const alive = SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    setPresent(alive.map((el) => el.id));

    if (!alive.length) return;

    obsRef.current?.disconnect();
    obsRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const best = visible.reduce((a, b) =>
          a.intersectionRatio >= b.intersectionRatio ? a : b,
        );
        setActive(best.target.id);
      },
      { rootMargin: '-32% 0px -32% 0px', threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] },
    );

    alive.forEach((el) => obsRef.current!.observe(el));
    return () => obsRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const tick = () => {
      const p = readScrollProgress();
      if (
        Math.abs(p - lastP.current) > 0.003 ||
        (p === 0 && lastP.current !== 0) ||
        (p === 1 && lastP.current !== 1)
      ) {
        lastP.current = p;
        setScrollP(p);
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(scrollRaf.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const visibleSections = SECTIONS.filter(({ id }) => present.includes(id));
  if (visibleSections.length < 2) return null;

  return (
    <nav
      aria-label="Page sections and scroll progress"
      className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden lg:block w-11"
    >
      <div ref={railRef} className="relative flex flex-col items-center gap-5 py-3">
        {/* Dim track */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 rounded-full bg-white/[0.14]"
        />

        {/* Scroll fill — spans rail; scaleY tied to page scroll */}
        {!reduceMotion && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-3 bottom-3 w-[3px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary-300 via-primary-400 to-primary-500 origin-top shadow-[0_0_18px_rgba(167,139,250,0.45)]"
            style={{ transform: `scaleY(${Math.max(0.03, scrollP)})` }}
          />
        )}

        {/* Puck — exact scroll position along the same span as the fill */}
        {!reduceMotion && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 z-[2] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary-400 shadow-[0_0_20px_rgba(196,181,253,0.9)]"
            style={{
              top: `calc(12px + ${scrollP} * (100% - 24px))`,
            }}
          />
        )}

        {visibleSections.map(({ id, label }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() =>
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              aria-label={`Go to ${label}`}
              aria-current={isActive ? 'true' : undefined}
              title={label}
              className="group relative z-[3] flex h-4 w-4 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <span
                className={`
                  pointer-events-none absolute right-full mr-3.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold
                  whitespace-nowrap bg-neutral-900/95 backdrop-blur-md text-white
                  border border-white/10
                  transition-all duration-200
                  opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0
                `}
              >
                {label}
              </span>

              <span
                className={`
                  block rounded-full transition-all duration-200 ease-out
                  ${isActive
                    ? 'h-3.5 w-3.5 bg-primary-300 ring-2 ring-primary-500/50 ring-offset-2 ring-offset-[#0a0a0a]'
                    : 'h-2.5 w-2.5 bg-white/30 group-hover:bg-white/70 group-hover:scale-110'
                  }
                `}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
