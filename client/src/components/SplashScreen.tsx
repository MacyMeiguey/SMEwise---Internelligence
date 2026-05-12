/**
 * SplashScreen — first-visit intro overlay for the SMEwise landing.
 *
 * Uses the actual SMEwise wordmark logo at the centre, framed by a spinning
 * lavender / coral gradient ring and a pulsing glow. Pure CSS / SVG / <img> —
 * no WebGL — so it paints instantly and never blocks the page beneath.
 *
 * Behaviour:
 *   • Renders a fixed full-viewport intro for ~2.2s, then fades out.
 *   • Uses sessionStorage so it only appears once per browser session.
 *   • Calls `onDone` after the fade-out so the parent can unmount it.
 *   • Honours `prefers-reduced-motion` (skips immediately to onDone).
 */

import { useEffect, useState } from 'react';
import LogoWordmark from './shared/LogoWordmark';

const SESSION_KEY = 'smewise:splash-shown';

interface SplashScreenProps {
  onDone: () => void;
  /** Override the visible duration in ms (default 2200). */
  durationMs?: number;
}

export default function SplashScreen({ onDone, durationMs = 2200 }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
      onDone();
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const leaveTimer = window.setTimeout(() => setLeaving(true), durationMs);
    const doneTimer = window.setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
      onDone();
    }, durationMs + 480);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [durationMs, onDone]);

  return (
    <div
      role="presentation"
      aria-hidden
      className={`fixed inset-0 z-[200] grid place-items-center bg-neutral-950 text-white overflow-hidden transition-opacity duration-500 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Coloured glow blobs */}
      <span
        className="pointer-events-none absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-primary-500/45 blur-3xl motion-safe:animate-glow-pulse"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full bg-accent-coral/40 blur-3xl motion-safe:animate-glow-pulse"
        style={{ animationDelay: '1.1s' }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[360px] rounded-full bg-accent-teal/25 blur-3xl motion-safe:animate-glow-pulse"
        style={{ animationDelay: '0.5s' }}
        aria-hidden
      />
      {/* Soft grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8 text-center">

        {/* Logo lockup: spinning gradient ring + glow + styled wordmark (no PNG) */}
        <div className="relative h-56 w-56 sm:h-64 sm:w-64 grid place-items-center">
          {/* Glow plate behind wordmark */}
          <span
            className="absolute inset-12 rounded-full bg-gradient-to-br from-primary-400/70 via-primary-600/70 to-accent-coral/40 motion-safe:animate-splash-pulse blur-xl"
            aria-hidden
          />

          {/* Spinning gradient ring */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full motion-safe:animate-splash-spin"
            aria-hidden
          >
            <defs>
              <linearGradient id="splash-stroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#c4b5fd" />
                <stop offset="40%"  stopColor="#a78bfa" />
                <stop offset="80%"  stopColor="#fb7185" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.8" />
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="url(#splash-stroke)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray="90 250"
            />
            <circle cx="50" cy="3"  r="2.2" fill="#c4b5fd" />
            <circle cx="50" cy="97" r="2.2" fill="#fbbf24" />
            <circle cx="3"  cy="50" r="2.2" fill="#34d399" />
            <circle cx="97" cy="50" r="2.2" fill="#fb7185" />
          </svg>

          {/* Wordmark at centre — pure text, no PNG */}
          <LogoWordmark
            size="xl"
            variant="light"
            className="relative z-10 drop-shadow-[0_8px_24px_rgba(167,139,250,0.45)] motion-safe:animate-splash-pulse"
            style={{ animationDuration: '2.4s' }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-neutral-400">
            Your business · one workspace
          </p>
          <p className="text-sm text-neutral-300 max-w-[20rem] leading-relaxed">
            Setting up your Malaysian SME advisor…
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-56 sm:w-72">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-300 via-accent-coral to-accent-gold transition-[width] duration-100 ease-linear"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            <span>Loading workspace</span>
            <span>{Math.round(progress * 100).toString().padStart(2, '0')}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function hasShownSplash(): boolean {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
}
