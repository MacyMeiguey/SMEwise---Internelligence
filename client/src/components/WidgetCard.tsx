/**
 * WidgetCard — editorial-style card for AI outputs
 */

import type { ReactNode } from "react";
import type { WidgetState } from "../types";

function LoadingState() {
  return (
    <div className="animate-pulse space-y-3" role="status" aria-label="Generating…">
      <div className="h-3.5 bg-neutral-100 rounded-full w-3/4" />
      <div className="h-3.5 bg-neutral-100 rounded-full w-full" />
      <div className="h-3.5 bg-neutral-100 rounded-full w-5/6" />
      <div className="h-3.5 bg-neutral-100 rounded-full w-2/3" />
      <span className="sr-only">Generating…</span>
    </div>
  );
}

function IdlePrompt() {
  return (
    <p className="text-sm text-neutral-500 leading-relaxed">
      Press <span className="font-semibold text-neutral-950">Generate</span> to create a draft.
      Takes a few seconds — the result appears in the box below.
    </p>
  );
}

interface ErrorStateProps { message: string; onRetry: () => void; }

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
      <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">{message}</p>
      <button type="button" onClick={onRetry} className="btn-ghost self-start text-sm py-1.5 px-3 rounded-lg">
        Try again
      </button>
    </div>
  );
}

interface RegenerateButtonProps { onClick: () => void; disabled?: boolean; }

function RegenerateButton({ onClick, disabled = false }: RegenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-ghost mt-3 self-start text-sm py-1.5 px-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Regenerate"
    >
      Regenerate
    </button>
  );
}

export interface WidgetCardProps {
  title: string;
  onGenerate: () => Promise<void>;
  state: WidgetState;
  children?: ReactNode;
}

export default function WidgetCard({ title, onGenerate, state, children }: WidgetCardProps) {
  const { status, errorMessage } = state;
  const isLoading = status === "loading";

  return (
    <article
      className="flex flex-col bg-white border-2 border-neutral-950 rounded-xl overflow-hidden"
      style={{ boxShadow: '2px 2px 0 0 #0f0f0f' }}
      aria-label={`${title} widget`}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3 border-b-2 border-neutral-950 px-4 sm:px-5 py-3.5">
        <h3 className="text-sm font-bold text-neutral-950 tracking-tight">{title}</h3>

        {status !== "loading" && (
          <button
            type="button"
            onClick={onGenerate}
            className="btn-brand text-xs py-1.5 px-3.5 rounded-lg"
            aria-label={status === "idle" ? `Generate ${title}` : `Regenerate ${title}`}
          >
            {status === "idle" ? "Generate" : "Regenerate"}
          </button>
        )}

        {isLoading && (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
            role="status"
            aria-label="Generating…"
          />
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col p-4 sm:p-5">
        {status === "idle"    && <IdlePrompt />}
        {status === "loading" && <LoadingState />}

        {status === "success" && (
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Result</p>
            <div className="border-2 border-neutral-100 rounded-xl bg-neutral-50 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain">
              <div className="p-4 text-sm text-neutral-800 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_p+p]:mt-2">
                {children}
              </div>
            </div>
            <RegenerateButton onClick={onGenerate} />
          </div>
        )}

        {status === "error" && (
          <ErrorState
            message={errorMessage ?? "Something went wrong. Please try again."}
            onRetry={onGenerate}
          />
        )}
      </div>
    </article>
  );
}
