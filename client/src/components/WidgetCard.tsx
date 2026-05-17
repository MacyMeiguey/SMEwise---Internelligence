/**
 * WidgetCard — dark-native toolkit card on #07070b workspace (readable, on-brand).
 */

import type { ReactNode } from 'react';
import type { WidgetState } from '../types';

function LoadingState() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Generating…">
      <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-3/4" />
      <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-full" />
      <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-5/6" />
      <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-2/3" />
      <span className="sr-only">Generating…</span>
    </div>
  );
}

function IdlePrompt({ hint, idleContent }: { hint?: string; idleContent?: ReactNode }) {
  if (idleContent) return <>{idleContent}</>;
  if (hint?.trim()) {
    return <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">{hint}</p>;
  }
  return (
    <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
      Choose <span className="font-semibold text-neutral-800 dark:text-neutral-200">Generate</span> for a first draft.
      <span className="text-neutral-500"> Results stay until you regenerate or update your profile.</span>
    </p>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
      <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
      >
        Try again
      </button>
    </div>
  );
}

interface RegenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

function RegenerateButton({ onClick, disabled = false, label = 'Regenerate' }: RegenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
      aria-label={label}
    >
      {label}
    </button>
  );
}

export interface WidgetCardProps {
  title: string;
  onGenerate: () => Promise<void>;
  state: WidgetState;
  children?: ReactNode;
  /** Custom idle content (ReactNode) — replaces the default idle prompt entirely. */
  idleContent?: ReactNode;
  /** Custom idle copy instead of the default "Choose Generate…" line. */
  idleHint?: string;
  /** Primary button label when idle (default: Generate). */
  idleButtonLabel?: string;
  /** Label for the post-success refresh action (default: Regenerate). */
  regenerateLabel?: string;
  /** Disable the generate/regenerate button (e.g. waiting for a prerequisite). */
  generateDisabled?: boolean;
  /**
   * When true, hides the idle generate button and the post-success regenerate button.
   * The error-state retry button remains so users can recover from failures.
   * Used by auto-generate mode where the workspace runs widgets without user input.
   */
  hideGenerateButton?: boolean;
}

export default function WidgetCard({
  title,
  onGenerate,
  state,
  children,
  idleContent,
  idleHint,
  idleButtonLabel = 'Generate',
  regenerateLabel = 'Regenerate',
  generateDisabled = false,
  hideGenerateButton = false,
}: WidgetCardProps) {
  const { status, errorMessage } = state;
  const isLoading = status === 'loading';

  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label={`${title} widget`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight pr-2 leading-snug dark:text-white">{title}</h3>

        {!isLoading && !hideGenerateButton && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateDisabled}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={status === 'idle' ? `${idleButtonLabel} — ${title}` : `${regenerateLabel} — ${title}`}
          >
            {status === 'idle' ? idleButtonLabel : regenerateLabel}
          </button>
        )}

        {isLoading && (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent"
            role="status"
            aria-label="Generating…"
          />
        )}
      </header>

      <div className="flex flex-col p-4 sm:p-5">
        {status === 'idle' && <IdlePrompt hint={idleHint} idleContent={idleContent} />}
        {status === 'loading' && <LoadingState />}

        {status === 'success' && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Result</p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-black/40">
              <div className="p-4 text-sm text-neutral-800 leading-relaxed dark:text-neutral-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p+p]:mt-2 [&_strong]:text-neutral-950 dark:[&_strong]:text-white [&_a]:text-primary-600 dark:[&_a]:text-primary-300 [&_a]:underline">
                {children}
              </div>
            </div>
            {!hideGenerateButton && <RegenerateButton onClick={onGenerate} label={regenerateLabel} />}
          </div>
        )}

        {status === 'error' && (
          <ErrorState
            message={errorMessage ?? 'Something went wrong. Please try again.'}
            onRetry={onGenerate}
          />
        )}
      </div>
    </article>
  );
}
