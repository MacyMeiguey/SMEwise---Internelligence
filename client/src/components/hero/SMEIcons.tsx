/**
 * SMEIcons — reusable SVG illustrations for every SME topic in SMEwise.
 *
 * Each icon comes in two flavours:
 *   • `<Icon size="lg" />` — full illustration tile (storefront, coin stack …),
 *     used in the LandingMediaGallery grid.
 *   • `<Icon size="md" />` — compact 64px badge version for inline use in
 *     feature cards, pain/gain rows, footer chips, etc.
 *
 * Every icon takes an `accent` colour so tiles tint to match their section.
 */

import type { FC } from 'react';

type Size = 'md' | 'lg';

interface IconProps {
  accent: string;
  size?: Size;
  className?: string;
}

function box(size: Size, mdW = 64, lgW = 200) {
  return size === 'md' ? { width: mdW, height: (mdW * 140) / 200 } : { width: lgW, height: 140 };
}

/* ── Operations · Shopfront ────────────────────────────────────────────────── */
export const ShopIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <rect x="20" y="50" width="160" height="78" rx="6" fill="#fde68a" />
      <polygon points="14,50 100,18 186,50" fill={accent} />
      <rect x="34" y="68" width="36" height="36" rx="3" fill="#c4b5fd" />
      <rect x="130" y="68" width="36" height="36" rx="3" fill="#c4b5fd" />
      <rect x="86" y="84" width="28" height="44" rx="3" fill="#7c3aed" />
      <rect x="32" y="60" width="136" height="10" rx="3" fill="#a78bfa" />
      {size === 'lg' && (
        <text x="100" y="68" fontSize="7" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif">
          KEDAI WISE
        </text>
      )}
    </svg>
  );
};

/* ── Money · Coin stack ────────────────────────────────────────────────────── */
export const CoinStackIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      {[100, 80, 60, 40].map((y) => (
        <g key={y}>
          <ellipse cx="100" cy={y + 14} rx="56" ry="8" fill="#a16207" opacity="0.4" />
          <rect x="44" y={y} width="112" height="18" rx="3" fill={accent} />
          <ellipse cx="100" cy={y} rx="56" ry="8" fill="#fde68a" />
          <text x="100" y={y + 3} fontSize="8" fontWeight="800" textAnchor="middle" fill="#92400e" fontFamily="Inter, sans-serif">
            RM
          </text>
        </g>
      ))}
    </svg>
  );
};

/* ── Reports · Bar chart ───────────────────────────────────────────────────── */
export const BarChartIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <line x1="30" y1="120" x2="180" y2="120" stroke="#475569" strokeWidth="2" />
      <rect x="40"  y="80"  width="22" height="40"  rx="3" fill="#a78bfa" />
      <rect x="74"  y="60"  width="22" height="60"  rx="3" fill="#38bdf8" />
      <rect x="108" y="40"  width="22" height="80"  rx="3" fill="#34d399" />
      <rect x="142" y="20"  width="22" height="100" rx="3" fill={accent} />
      <polyline
        points="51,80 85,60 119,40 153,20"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeDasharray="3 3"
        opacity="0.5"
      />
    </svg>
  );
};

/* ── Customers · Shopping bag ──────────────────────────────────────────────── */
export const BagIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <path
        d="M 62 50 Q 62 28 100 28 Q 138 28 138 50"
        fill="none"
        stroke="#0f766e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="40" y="48" width="120" height="84" rx="8" fill={accent} />
      <rect x="78" y="74" width="44" height="36" rx="4" fill="#ffffff" />
      <line x1="86" y1="84" x2="114" y2="84" stroke={accent} strokeWidth="2" />
      <line x1="86" y1="94" x2="114" y2="94" stroke={accent} strokeWidth="2" />
    </svg>
  );
};

/* ── Marketing · Megaphone ─────────────────────────────────────────────────── */
export const MegaphoneIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <polygon points="40,55 40,95 110,118 110,32" fill={accent} />
      <ellipse cx="110" cy="75" rx="8" ry="42" fill="#fbbf24" />
      <rect x="22" y="64" width="22" height="22" rx="4" fill="#1f2937" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <line x1="138" y1="40" x2="156" y2="30" />
        <line x1="138" y1="75" x2="160" y2="75" />
        <line x1="138" y1="110" x2="156" y2="120" />
      </g>
    </svg>
  );
};

/* ── Pricing · Calculator ──────────────────────────────────────────────────── */
export const CalculatorIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <rect x="50" y="14" width="100" height="112" rx="10" fill="#0f0f0f" stroke="#262626" strokeWidth="2" />
      <rect x="58" y="22" width="84" height="26" rx="4" fill={accent} />
      {size === 'lg' && (
        <text x="138" y="42" fontSize="14" fontWeight="800" textAnchor="end" fill="#0f0f0f" fontFamily="Inter, sans-serif">
          1,250
        </text>
      )}
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 60 + col * 28;
        const y = 56 + row * 18;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="22"
            height="13"
            rx="3"
            fill={i === 11 ? '#fb7185' : '#c4b5fd'}
          />
        );
      })}
    </svg>
  );
};

/* ── Always-on advisor · Chat mascot ───────────────────────────────────────── */
export const AdvisorIcon: FC<IconProps> = ({ accent, size = 'lg', className }) => {
  const { width, height } = box(size);
  return (
    <svg viewBox="0 0 200 140" width={width} height={height} className={className} aria-hidden>
      <rect x="22" y="30" width="120" height="74" rx="14" fill={accent} />
      <polygon points="46,104 70,90 70,118" fill={accent} />
      <circle cx="60"  cy="64" r="6" fill="#0f0f0f" />
      <circle cx="92"  cy="64" r="6" fill="#0f0f0f" />
      <path d="M 56 80 Q 76 92 96 80" stroke="#0f0f0f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Reply bubble */}
      <rect x="124" y="14" width="58" height="36" rx="10" fill="#ffffff" />
      <polygon points="138,50 130,58 142,50" fill="#ffffff" />
      <line x1="134" y1="26" x2="172" y2="26" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
      <line x1="134" y1="34" x2="166" y2="34" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
      <line x1="134" y1="42" x2="158" y2="42" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

/* ── Common topic → icon lookup ────────────────────────────────────────────── */
export const SME_ICONS = {
  operations: ShopIcon,
  money:      CoinStackIcon,
  reports:    BarChartIcon,
  customers:  BagIcon,
  marketing:  MegaphoneIcon,
  pricing:    CalculatorIcon,
  advisor:    AdvisorIcon,
} as const;
export type SMEIconKey = keyof typeof SME_ICONS;
