/**
 * OwnerToolsWorkspace — layout shell for Reports / Owner Tools: clear flow strip,
 * full-width snapshot, then exports / documents (no advisor rail — use right panel).
 */

import type { ReactNode } from 'react';
import { Image as ImageIcon, FileText } from 'lucide-react';

interface OwnerToolsWorkspaceProps {
  snapshotSlot: ReactNode;
  documentsSlot: ReactNode;
}

export default function OwnerToolsWorkspace({ snapshotSlot, documentsSlot }: OwnerToolsWorkspaceProps) {
  return (
    <div className="space-y-8">
      {/* Lightweight workflow orientation — not duplicate widget titles */}
      <nav
        aria-label="Suggested order for owner outputs"
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-white to-neutral-50/80 px-4 py-3.5 shadow-sm dark:border-white/[0.08] dark:from-white/[0.04] dark:to-transparent dark:shadow-none"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          Suggested flow
        </span>
        <ol className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
          <li className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-200">
              <ImageIcon className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="text-neutral-500 dark:text-neutral-400">1 ·</span> Snapshot for slides or lenders
            </span>
          </li>
          <span className="hidden text-neutral-300 dark:text-white/15 sm:inline" aria-hidden>
            →
          </span>
          <li className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-200/80 text-neutral-800 dark:bg-white/10 dark:text-neutral-200">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="text-neutral-500 dark:text-neutral-400">2 ·</span> Briefs you can download & edit
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-8">
        <div className="min-w-0">{snapshotSlot}</div>

        <div className="min-w-0 border-t border-neutral-200 pt-8 dark:border-white/[0.06]">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                Exports
              </p>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Generated reports</h3>
            </div>
            <p className="max-w-xl text-xs text-neutral-600 dark:text-neutral-400">
              Pick a report brief to generate, optionally add a reference file, then download as PDF or Word.
            </p>
          </div>
          {documentsSlot}
        </div>
      </div>
    </div>
  );
}
