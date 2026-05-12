/**
 * SectionHeroArt — compact inline illustrations for each workspace toolkit section.
 * Each variant is a distinct scene (no shared asset across sections).
 */

import type { ReactNode } from 'react';
import type { SectionHeroArtKey } from './sectionMeta';

function SvgFrame({
  children,
  className = '',
  viewBox = '0 0 240 140',
}: {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className={`h-auto w-full max-h-[9.5rem] text-neutral-900/90 dark:text-white/90 ${className}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Premise, doors, locality — operations */
function ArtOperations() {
  return (
    <SvgFrame>
      <defs>
        <linearGradient id="ops-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="240" height="140" rx="16" fill="url(#ops-sky)" />
      <rect x="48" y="48" width="144" height="72" rx="6" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <rect x="108" y="88" width="24" height="32" rx="2" fill="#7c3aed" fillOpacity="0.55" />
      <rect x="68" y="64" width="36" height="28" rx="3" fill="#fde68a" fillOpacity="0.85" />
      <rect x="136" y="64" width="36" height="28" rx="3" fill="#fde68a" fillOpacity="0.85" />
      <path d="M120 40 L188 52 L52 52 Z" fill="#a78bfa" fillOpacity="0.5" />
      <circle cx="200" cy="36" r="10" fill="#34d399" fillOpacity="0.35" />
      <text x="24" y="28" fontSize="11" fontWeight="700" fill="currentColor" fillOpacity="0.45" fontFamily="system-ui">
        Ops
      </text>
    </SvgFrame>
  );
}

/** Bars + runway — finance */
function ArtFinancial() {
  return (
    <SvgFrame>
      <defs>
        <linearGradient id="fin-bg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <rect width="240" height="140" rx="16" fill="url(#fin-bg)" className="dark:opacity-90" />
      <line x1="40" y1="112" x2="208" y2="112" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <rect x="52" y="72" width="22" height="40" rx="3" fill="#8b5cf6" fillOpacity="0.65" />
      <rect x="86" y="56" width="22" height="56" rx="3" fill="#a78bfa" fillOpacity="0.75" />
      <rect x="120" y="40" width="22" height="72" rx="3" fill="#fbbf24" fillOpacity="0.75" />
      <rect x="154" y="64" width="22" height="48" rx="3" fill="#34d399" fillOpacity="0.55" />
      <path d="M52 48 Q120 20 188 44" fill="none" stroke="#fb7185" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="4 4" />
      <text x="24" y="28" fontSize="11" fontWeight="700" fill="currentColor" fillOpacity="0.45" fontFamily="system-ui">
        RM
      </text>
    </SvgFrame>
  );
}

/** Tag + dial — pricing */
function ArtPricing() {
  return (
    <SvgFrame>
      <rect width="240" height="140" rx="16" fill="#fdf2f8" className="dark:fill-[rgba(30,20,35,0.85)]" />
      <path d="M56 52 L120 40 L184 52 L176 96 L64 96 Z" fill="#fbcfe8" fillOpacity="0.65" stroke="#fb7185" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="120" cy="72" r="22" fill="white" fillOpacity="0.85" className="dark:fill-white/10" stroke="currentColor" strokeOpacity="0.15" />
      <text x="120" y="78" textAnchor="middle" fontSize="13" fontWeight="800" fill="#be185d" fillOpacity="0.85" fontFamily="system-ui">
        RM
      </text>
      <rect x="168" y="44" width="48" height="56" rx="8" fill="#ede9fe" fillOpacity="0.9" className="dark:fill-primary-950/50" stroke="currentColor" strokeOpacity="0.12" />
      <line x1="180" y1="60" x2="204" y2="60" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <line x1="180" y1="72" x2="200" y2="72" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <line x1="180" y1="84" x2="196" y2="84" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <text x="24" y="28" fontSize="11" fontWeight="700" fill="currentColor" fillOpacity="0.45" fontFamily="system-ui">
        Shelf
      </text>
    </SvgFrame>
  );
}

/** Waves + spotlight — marketing */
function ArtMarketing() {
  return (
    <SvgFrame>
      <rect width="240" height="140" rx="16" fill="#ecfeff" className="dark:fill-[rgba(15,35,45,0.75)]" />
      <ellipse cx="120" cy="118" rx="90" ry="18" fill="#38bdf8" fillOpacity="0.12" />
      <path d="M32 88 Q72 52 112 72 T192 64" fill="none" stroke="#38bdf8" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 100 Q88 70 128 92 T210 80" fill="none" stroke="#a78bfa" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="148,36 196,58 148,80 130,58" fill="#fbbf24" fillOpacity="0.75" />
      <circle cx="58" cy="44" r="6" fill="#f472b6" fillOpacity="0.55" />
      <circle cx="78" cy="36" r="4" fill="#34d399" fillOpacity="0.45" />
      <text x="24" y="28" fontSize="11" fontWeight="700" fill="currentColor" fillOpacity="0.45" fontFamily="system-ui">
        Reach
      </text>
    </SvgFrame>
  );
}

/** Doc stack + sparkline — owner */
function ArtOwner() {
  return (
    <SvgFrame>
      <rect width="240" height="140" rx="16" fill="#f5f3ff" className="dark:fill-[rgba(20,18,40,0.85)]" />
      <rect x="56" y="44" width="100" height="72" rx="8" fill="white" fillOpacity="0.9" className="dark:fill-white/8" stroke="currentColor" strokeOpacity="0.12" />
      <rect x="68" y="56" width="76" height="8" rx="2" fill="currentColor" fillOpacity="0.12" />
      <rect x="68" y="72" width="56" height="6" rx="2" fill="currentColor" fillOpacity="0.08" />
      <rect x="68" y="86" width="64" height="6" rx="2" fill="currentColor" fillOpacity="0.08" />
      <rect x="148" y="32" width="56" height="72" rx="8" fill="#ddd6fe" fillOpacity="0.65" className="dark:fill-primary-900/40" stroke="currentColor" strokeOpacity="0.1" />
      <polyline points="156,88 168,68 180,78 192,52 204,60" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="204" cy="60" r="4" fill="#7c3aed" />
      <text x="24" y="28" fontSize="11" fontWeight="700" fill="currentColor" fillOpacity="0.45" fontFamily="system-ui">
        Pack
      </text>
    </SvgFrame>
  );
}

export interface SectionHeroArtProps {
  variant: SectionHeroArtKey;
  className?: string;
}

export default function SectionHeroArt({ variant, className = '' }: SectionHeroArtProps) {
  const inner =
    variant === 'operations' ? (
      <ArtOperations />
    ) : variant === 'financial' ? (
      <ArtFinancial />
    ) : variant === 'pricing' ? (
      <ArtPricing />
    ) : variant === 'marketing' ? (
      <ArtMarketing />
    ) : (
      <ArtOwner />
    );

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-100/70 p-3 shadow-inner dark:border-white/[0.08] dark:bg-white/[0.04] ${className}`}
    >
      {inner}
    </div>
  );
}
