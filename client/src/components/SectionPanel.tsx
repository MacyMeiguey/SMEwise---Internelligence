/**
 * SectionPanel — collapsible section with hard-shadow editorial style
 */

import { useState } from "react";

interface SectionPanelProps {
  title: string;
  isLocked: boolean;
  children?: React.ReactNode;
  onGenerateAll?: () => void;
  index?: number;
}

export default function SectionPanel({
  title,
  isLocked,
  children,
  onGenerateAll,
  index = 0,
}: SectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      id={`section-${title.replace(/\s+/g, "-").toLowerCase()}`}
      className={`
        bg-white border-2 border-neutral-950 rounded-2xl
        scroll-mt-28 sm:scroll-mt-32
        animate-fade-in-up
        transition-all duration-200
        ${isLocked ? "opacity-40 pointer-events-none select-none" : ""}
      `}
      style={{ animationDelay: `${index * 80}ms`, boxShadow: isExpanded ? '4px 4px 0 0 #0f0f0f' : 'none' }}
      aria-disabled={isLocked}
    >
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b-2 border-neutral-950">
        <button
          type="button"
          onClick={() => !isLocked && setIsExpanded((prev) => !prev)}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 rounded-lg min-w-0"
          aria-expanded={isExpanded}
          aria-controls={`section-content-${title.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={isLocked}
        >
          <span
            className={`transition-transform duration-200 text-neutral-400 shrink-0 ${isExpanded ? "rotate-90" : "rotate-0"}`}
            aria-hidden="true"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <h2 className="text-sm sm:text-base font-bold text-neutral-950 tracking-tight">{title}</h2>
        </button>

        <button
          type="button"
          onClick={onGenerateAll}
          disabled={isLocked || !isExpanded}
          className="shrink-0 inline-flex items-center gap-2 btn-primary text-xs sm:text-sm py-2 px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Generate all in ${title}`}
        >
          Generate all
        </button>
      </div>

      {/* ── Collapsible body ── */}
      {isExpanded && (
        <div
          id={`section-content-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="p-4 sm:p-5"
        >
          {children ? (
            <div className="grid grid-cols-1 gap-4">
              {children}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-neutral-200 px-4 py-10 text-center">
              <p className="text-sm text-neutral-500">Nothing here yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
