/**
 * SectionPanel — workspace toolkit section with banner header and inset content.
 */

import { useState } from 'react';
import { getSectionMeta } from './workspace/sectionMeta';
import SectionBanner from './workspace/SectionBanner';

interface SectionPanelProps {
  title: string;
  isLocked: boolean;
  children?: React.ReactNode;
  onGenerateAll?: () => void;
  index?: number;
  compact?: boolean;
  showBanner?: boolean;
}

export default function SectionPanel({
  title,
  isLocked,
  children,
  onGenerateAll,
  index = 0,
  compact = false,
  showBanner = true,
}: SectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const id = title.replace(/\s+/g, '-').toLowerCase();
  const meta = getSectionMeta(title);
  const { runAllLabel } = meta;

  // ── Compact variant (auto-generate mode) ──
  if (compact) {
    return (
      <section
        id={`section-${id}`}
        className={`
          scroll-mt-28 sm:scroll-mt-32 motion-safe:animate-fade-up
          rounded-xl overflow-hidden border border-neutral-200/90 bg-white shadow-subtle
          dark:border-white/[0.08] dark:bg-[#101018] dark:shadow-none
          transition-shadow duration-300
          ${isLocked ? 'opacity-45 pointer-events-none select-none' : ''}
        `}
        style={{ animationDelay: `${index * 70}ms` }}
        aria-disabled={isLocked}
      >
        {showBanner && <SectionBanner section={title} />}

        <div className="bg-neutral-50/80 dark:bg-[#07070b]">
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

  // ── Full variant (manual generate mode) ──
  return (
    <section
      id={`section-${id}`}
      className={`
        scroll-mt-28 sm:scroll-mt-32 motion-safe:animate-fade-up
        rounded-xl overflow-hidden border border-neutral-200/90 bg-white shadow-subtle
        dark:border-white/[0.08] dark:bg-[#101018] dark:shadow-none
        transition-shadow duration-300
        ${isLocked ? 'opacity-45 pointer-events-none select-none' : ''}
      `}
      style={{ animationDelay: `${index * 70}ms` }}
      aria-disabled={isLocked}
    >
      {showBanner && <SectionBanner section={title} />}

      {/* Action bar — collapse toggle + generate all button */}
      {!meta.noHeroArt && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-7 py-3 border-b border-neutral-200 bg-neutral-50/80 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => !isLocked && setIsExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md px-2 py-1 -ml-2"
            aria-expanded={isExpanded}
            aria-controls={`section-content-${id}`}
            disabled={isLocked}
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
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAll}
            disabled={isLocked || !isExpanded}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 hover-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-35 dark:focus-visible:ring-offset-[#0a0a10] sm:text-sm"
            aria-label={`${runAllLabel} — ${title}`}
          >
            {runAllLabel}
          </button>
        </div>
      )}

      {isExpanded && (
        <div
          id={`section-content-${id}`}
          className="bg-neutral-50 dark:bg-[#07070b]"
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
