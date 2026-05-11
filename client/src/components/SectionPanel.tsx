/**
 * SectionPanel — collapsible section container with GenerateAll button
 * Requirements: 3.4, 3.5, 3.6, 3.7
 *
 * Props:
 *   title        — section heading text
 *   isLocked     — when true, overlays a locked/greyed state
 *   children     — widget cards rendered inside the panel
 *   onGenerateAll — callback fired when "Generate All" is clicked
 *   index        — position index for stagger animation delay
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
        bg-[#1a1728] rounded-xl border border-[#3d3660] border-l-4 border-l-[#7c3aed] p-5
        transition-all duration-200 hover:-translate-y-0.5
        animate-fadeInUp
        ${isLocked ? "opacity-50 pointer-events-none select-none" : ""}
      `}
      style={{ animationDelay: `${index * 100}ms` }}
      aria-disabled={isLocked}
    >
      {/* ── Collapsible header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        {/* Left: chevron + title */}
        <button
          type="button"
          onClick={() => !isLocked && setIsExpanded((prev) => !prev)}
          className="flex items-center gap-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] rounded-lg"
          aria-expanded={isExpanded}
          aria-controls={`section-content-${title.replace(/\s+/g, "-").toLowerCase()}`}
          disabled={isLocked}
        >
          {/* Chevron icon */}
          <span
            className={`transition-transform duration-200 text-[#a78bfa] ${
              isExpanded ? "rotate-90" : "rotate-0"
            }`}
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>

          <h2 className="text-lg font-bold text-white mb-0 group-hover:text-[#a78bfa] transition-colors">
            {title}
          </h2>
        </button>

        {/* Right: Generate All button */}
        <button
          type="button"
          onClick={onGenerateAll}
          disabled={isLocked || !isExpanded}
          className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[10px] px-4 py-2 transition-all duration-200
                     disabled:opacity-40 disabled:cursor-not-allowed
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a78bfa]"
          aria-label={`Generate all widgets in ${title}`}
        >
          {/* Sparkle / lightning icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Generate All
        </button>
      </div>

      {/* ── Collapsible content area ── */}
      {isExpanded && (
        <div
          id={`section-content-${title.replace(/\s+/g, "-").toLowerCase()}`}
        >
          {children ? (
            /* Card-based layout grid for widget content */
            <div className="grid grid-cols-1 gap-4">
              {children}
            </div>
          ) : (
            /* Empty state placeholder */
            <div className="rounded-xl border border-dashed border-[#3d3660] bg-[#221f35]/50 px-4 py-8 text-center">
              <p className="text-sm text-[#6b6890]">
                No widgets yet — they will appear here once built.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
