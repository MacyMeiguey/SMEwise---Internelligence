/**
 * SectionPanel — workspace toolkit with hero band, unique art, highlights, and inset content.
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { getSectionMeta } from './workspace/sectionMeta';
import SectionHeroArt from './workspace/SectionHeroArt';

interface SectionPanelProps {
  title: string;
  isLocked: boolean;
  children?: React.ReactNode;
  onGenerateAll?: () => void;
  index?: number;
  /**
   * When true, renders only the section title + content, hiding the hero band
   * (icon, tagline, highlights, hero art and Run-all button). Used by the
   * auto-generate workspace mode where every widget runs without user action.
   */
  compact?: boolean;
}

export default function SectionPanel({
  title,
  isLocked,
  children,
  onGenerateAll,
  index = 0,
  compact = false,
}: SectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const id = title.replace(/\s+/g, '-').toLowerCase();
  const meta = getSectionMeta(title);
  const { Icon, tagline, glow, highlights, runAllLabel, runAllHint, heroArt } = meta;
  const displayTitle = meta.displayTitle ?? title;

  // ── Compact variant ──
  // Used when the dashboard auto-generates every widget. We strip the hero band
  // (description, highlights, run-all button, hero art) and just keep the
  // section title + content, which keeps the visual rhythm without the
  // marketing copy or the manual generate trigger.
  if (compact) {
    return (
      <section
        id={`section-${id}`}
        className={`
          scroll-mt-28 sm:scroll-mt-32 motion-safe:animate-fade-up
          rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-md
          dark:border-white/[0.08] dark:bg-[#0a0a10] dark:shadow-panel
          transition-shadow duration-300
          ${isLocked ? 'opacity-45 pointer-events-none select-none' : ''}
        `}
        style={{ animationDelay: `${index * 70}ms` }}
        aria-disabled={isLocked}
      >
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-7 py-4">
          <div className="shrink-0 rounded-xl border border-primary-300/50 bg-primary-50 p-2.5 text-primary-700 shadow-sm dark:border-primary-400/25 dark:bg-primary-500/10 dark:text-primary-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 sm:text-xl dark:text-white">
            {displayTitle}
          </h2>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 dark:border-white/[0.04] dark:bg-[#07070b]">
          {children ? (
            <div className="p-4 sm:p-5 lg:p-6">{children}</div>
          ) : (
            <div className="m-4 sm:m-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-100/60 px-4 py-12 text-center text-sm text-neutral-500 dark:border-white/[0.12] dark:bg-white/[0.02]">
              Nothing here yet.
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      id={`section-${id}`}
      className={`
        scroll-mt-28 sm:scroll-mt-32 motion-safe:animate-fade-up
        rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-md
        dark:border-white/[0.08] dark:bg-[#0a0a10] dark:shadow-panel
        transition-shadow duration-300
        ${isLocked ? 'opacity-45 pointer-events-none select-none' : ''}
      `}
      style={{ animationDelay: `${index * 70}ms` }}
      aria-disabled={isLocked}
    >
      <div className="relative overflow-hidden border-b border-neutral-200 dark:border-white/[0.06]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 70% 80% at 12% -20%, ${glow}, transparent 52%),
              radial-gradient(ellipse 55% 70% at 100% 0%, rgba(196,181,253,0.08), transparent 45%),
              linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 42%)
            `,
          }}
        />
        {/* Grid: neutral lines in light mode, soft white lines in dark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:hidden"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 85% 70% at 50% 20%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 70% at 50% 20%, black, transparent)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden opacity-[0.12] dark:block"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 85% 70% at 50% 20%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 70% at 50% 20%, black, transparent)',
          }}
        />

        <div className="relative z-10 px-4 sm:px-6 lg:px-7 py-5 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            <div className="flex min-w-0 flex-1 gap-4 sm:items-start sm:gap-5">
              <div className="shrink-0 rounded-xl border border-primary-300/50 bg-primary-50 p-3 text-primary-700 shadow-sm dark:border-primary-400/25 dark:bg-primary-500/10 dark:text-primary-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Icon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => !isLocked && setIsExpanded((prev) => !prev)}
                    className="mt-0.5 -ml-1 shrink-0 rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                    aria-expanded={isExpanded}
                    aria-controls={`section-content-${id}`}
                    disabled={isLocked}
                    aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 sm:text-xl dark:text-white">
                      {displayTitle}
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {tagline}
                    </p>
                    <ul className="mt-4 space-y-2.5" aria-label="What you get in this section">
                      {highlights.map((line) => (
                        <li key={line} className="flex gap-2.5 text-sm leading-snug text-neutral-700 dark:text-neutral-300">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:max-w-md lg:max-w-[min(100%,17.5rem)] lg:items-end">
              <SectionHeroArt variant={heroArt} className="w-full lg:max-w-none" />
              <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 lg:flex-col lg:items-stretch">
                <button
                  type="button"
                  onClick={onGenerateAll}
                  disabled={isLocked || !isExpanded}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-35 dark:focus-visible:ring-offset-[#0a0a10] sm:text-sm"
                  aria-label={`${runAllLabel} — ${title}`}
                >
                  {runAllLabel}
                </button>
                <p className="text-center text-[11px] leading-snug text-neutral-500 sm:flex-1 sm:text-left lg:text-right dark:text-neutral-500">
                  {runAllHint}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          id={`section-content-${id}`}
          className="border-t border-neutral-200 bg-neutral-50 dark:border-white/[0.04] dark:bg-[#07070b]"
        >
          {children ? (
            <div className="p-4 sm:p-5 lg:p-6">{children}</div>
          ) : (
            <div className="m-4 sm:m-5 rounded-xl border border-dashed border-neutral-300 bg-neutral-100/60 px-4 py-12 text-center text-sm text-neutral-500 dark:border-white/[0.12] dark:bg-white/[0.02]">
              Nothing here yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
