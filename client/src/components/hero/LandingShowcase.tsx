/**
 * Landing visuals — replaces the old stock-photo gallery with a richer
 * "Inside SMEwise" panel: one product preview frame plus a 3×2 grid of
 * SME-themed illustration tiles (no third-party photos required).
 *
 * Each tile is a pure SVG illustration so we don't ship megabytes of imagery
 * and never need to manage broken remote sources.
 */

import { useCallback, useMemo, useState } from 'react';

const MOCKUP_SRC = '/marketing/workspace-mockup.svg';

/** Local tour (optional) — add under public/marketing/ */
const MP4_LOCAL = '/marketing/product-tour.mp4';
const WEBM_LOCAL = '/marketing/product-tour.webm';

/**
 * Fallback MP4 (works without upload). Replace with hosted product demo.
 * Source: Blender Foundation CC BY open movie (“Elephants Dream”) via archive.org.
 */
const MP4_FALLBACK_REMOTE =
  'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4';

/** Sticky illustration beside hero copy */
export function HeroProductMockup() {
  return (
    <div
      className="relative mx-auto mt-12 lg:mt-0 w-full max-w-lg lg:max-w-none lg:sticky lg:top-28 lg:self-start rounded-2xl border-2 border-neutral-950 bg-gradient-to-br from-primary-50 to-white p-4 sm:p-5 motion-safe:lg:animate-hero-float"
      style={{ boxShadow: '6px 6px 0 0 #0f0f0f' }}
    >
      <span className="absolute -top-px -right-px rounded-bl-xl rounded-tr-[0.875rem] bg-primary-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white border-l-2 border-b-2 border-neutral-950">
        Preview
      </span>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 mb-3 pr-16">
        What you&apos;ll see inside
      </p>
      <img
        src={MOCKUP_SRC}
        alt="Stylised preview of SMEwise: navigation, summaries and generators."
        className="w-full h-auto rounded-xl border-2 border-neutral-200 bg-white shadow-inner"
        loading="lazy"
        decoding="async"
        width={520}
        height={380}
      />
    </div>
  );
}

/** ─── SME illustration tiles (replace the old stock photos) ───────────────── */

interface TileProps {
  label: string;
  tagline: string;
  children: React.ReactNode;
}

function IllustrationTile({ label, tagline, children }: TileProps) {
  return (
    <figure
      className="relative aspect-[4/3] rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md overflow-hidden flex flex-col shadow-panel hover:shadow-panel-hover hover:border-white/[0.12] transition-shadow"
    >
      <div className="relative flex-1 grid place-items-center p-4">
        <span
          aria-hidden
          className="absolute inset-x-6 bottom-2 h-14 rounded-full blur-2xl opacity-35 bg-primary-500"
        />
        <div className="relative w-full max-w-[80%]">{children}</div>
      </div>
      <figcaption className="border-t border-white/[0.08] bg-black/40 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-neutral-100 tracking-wide">{label}</span>
        <span className="text-neutral-500 text-right leading-tight">{tagline}</span>
      </figcaption>
    </figure>
  );
}

function ShopfrontSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
      <rect x="20" y="50" width="160" height="78" rx="6" fill="#fde68a" />
      <polygon points="14,50 100,18 186,50" fill={accent} />
      <rect x="34" y="68" width="36" height="36" rx="3" fill="#c4b5fd" />
      <rect x="130" y="68" width="36" height="36" rx="3" fill="#c4b5fd" />
      <rect x="86" y="84" width="28" height="44" rx="3" fill="#7c3aed" />
      <rect x="32" y="60" width="136" height="10" rx="3" fill="#a78bfa" />
      <text x="100" y="68" fontSize="7" fontWeight="700" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif">
        KEDAI WISE
      </text>
    </svg>
  );
}

function CoinStackSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
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
}

function BarChartSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
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
}

function ShoppingBagSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
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
}

function MegaphoneSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
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
}

function CalculatorSVG({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 200 140" className="w-full h-auto" aria-hidden>
      <rect x="50" y="14" width="100" height="112" rx="10" fill="#0f0f0f" stroke="#262626" strokeWidth="2" />
      <rect x="58" y="22" width="84" height="26" rx="4" fill={accent} />
      <text x="138" y="42" fontSize="14" fontWeight="800" textAnchor="end" fill="#0f0f0f" fontFamily="Inter, sans-serif">
        1,250
      </text>
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
}

const SME_TILES: Array<{
  label: string;
  tagline: string;
  render: () => React.ReactNode;
}> = [
  { label: 'Operations', tagline: 'Shopfront to checklist',  render: () => <ShopfrontSVG accent="#c4b5fd" /> },
  { label: 'Money',      tagline: 'RM you can trust',        render: () => <CoinStackSVG accent="#fbbf24" /> },
  { label: 'Reports',    tagline: 'Numbers a bank will read', render: () => <BarChartSVG accent="#a78bfa" /> },
  { label: 'Customers',  tagline: 'Orders & loyalty',         render: () => <ShoppingBagSVG accent="#8b5cf6" /> },
  { label: 'Marketing',  tagline: 'Campaigns that fit',     render: () => <MegaphoneSVG accent="#c4b5fd" /> },
  { label: 'Pricing',    tagline: 'Margin, not guesswork',    render: () => <CalculatorSVG accent="#a78bfa" /> },
];

/** Dark band — video + SME illustration grid (after hero, before Features) */
export function LandingMediaGallery() {
  const [sourcesExhausted, setSourcesExhausted] = useState(false);

  const videoSources = useMemo(
    () =>
      [
        { src: WEBM_LOCAL, type: 'video/webm' },
        { src: MP4_LOCAL, type: 'video/mp4' },
        { src: MP4_FALLBACK_REMOTE, type: 'video/mp4' },
      ] as const,
    [],
  );

  const onVideoErr = useCallback(() => {
    setSourcesExhausted(true);
  }, []);

  return (
    <section
      id="landing-see-it"
      className="relative border-y border-white/[0.08] bg-[#07070b]/40 backdrop-blur-xl text-white py-16 sm:py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-300 mb-3">
              See it for yourself
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-[1.1] tracking-tight">
              One workspace. <span className="text-primary-200">Six SME toolkits.</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-neutral-400 max-w-md leading-relaxed">
              Each tile matches a workspace tab. One profile powers all of them.
            </p>
          </div>

          <div
            className="relative rounded-2xl border border-white/[0.1] overflow-hidden bg-neutral-900 aspect-video shadow-panel"
          >
            {!sourcesExhausted ? (
              <video
                key={videoSources.map((s) => s.src).join('|')}
                className="absolute inset-0 w-full h-full object-cover bg-neutral-950"
                controls
                playsInline
                preload="metadata"
                poster={MOCKUP_SRC}
                onError={onVideoErr}
              >
                {videoSources.map(({ src, type }) => (
                  <source key={src} src={src} type={type} />
                ))}
              </video>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 bg-neutral-950">
                <img
                  src={MOCKUP_SRC}
                  alt=""
                  className="w-[min(100%,280px)] h-auto rounded-lg border border-neutral-700 opacity-95"
                />
                <p className="text-sm text-neutral-400 text-center max-w-xs">
                  Product tour video unavailable — illustration preview shown. Add{' '}
                  <code className="text-primary-300">public/marketing/product-tour.mp4</code>.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
          {SME_TILES.map(({ label, tagline, render }) => (
            <IllustrationTile key={label} label={label} tagline={tagline}>
              {render()}
            </IllustrationTile>
          ))}
        </div>
      </div>
    </section>
  );
}
