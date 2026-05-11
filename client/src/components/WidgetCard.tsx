/**
 * WidgetCard — reusable shell for all AI-powered Widgets.
 * Requirements: 20.6, 20.7, 23.1, 23.2, 23.4, 23.5
 *
 * Manages WidgetState (idle / loading / success / error) and renders the
 * appropriate sub-component based on the current status.
 *
 * Props:
 *  - title: string          — widget title shown in the card header
 *  - onGenerate: () => Promise<void>  — async function that performs the API call
 *  - state: WidgetState     — current widget state (managed by parent / useWidgetState)
 *  - children?: ReactNode   — rendered when status === "success"
 */

import type { ReactNode } from "react";
import type { WidgetState } from "../types";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div
      className="animate-pulse space-y-3"
      role="status"
      aria-label="Loading widget content"
    >
      <div className="h-4 bg-[#3d3660]/40 rounded-lg w-3/4" />
      <div className="h-4 bg-[#3d3660]/40 rounded-lg w-full" />
      <div className="h-4 bg-[#3d3660]/40 rounded-lg w-5/6" />
      <div className="h-4 bg-[#3d3660]/40 rounded-lg w-2/3" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// ─── Idle prompt ──────────────────────────────────────────────────────────────

function IdlePrompt() {
  return (
    <p className="text-sm text-[#6b6890] italic">
      Click <span className="text-[#a78bfa] font-medium">Generate</span> to get
      AI-powered insights for this widget.
    </p>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col gap-3"
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm text-red-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start bg-transparent border border-[#7c3aed] text-[#a78bfa] rounded-[10px] px-4 py-2 hover:bg-[#7c3aed]/10 transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
        aria-label="Retry generating widget content"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Regenerate button ────────────────────────────────────────────────────────

interface RegenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function RegenerateButton({ onClick, disabled = false }: RegenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 self-start bg-transparent border border-[#7c3aed] text-[#a78bfa] rounded-[10px] px-4 py-2 hover:bg-[#7c3aed]/10 transition-all duration-200
                 disabled:cursor-not-allowed disabled:opacity-50
                 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
      aria-label="Regenerate widget content"
    >
      ↺ Regenerate
    </button>
  );
}

// ─── WidgetCard ───────────────────────────────────────────────────────────────

export interface WidgetCardProps {
  /** Widget title shown in the card header */
  title: string;
  /** Async function that performs the API call and updates state */
  onGenerate: () => Promise<void>;
  /** Current widget state from parent */
  state: WidgetState;
  /** Rendered when status is "success" (the actual widget output) */
  children?: ReactNode;
}

export default function WidgetCard({
  title,
  onGenerate,
  state,
  children,
}: WidgetCardProps) {
  const { status, errorMessage } = state;
  const isLoading = status === "loading";

  return (
    <article
      className="flex flex-col rounded-xl border border-[#3d3660] bg-[#1a1728] shadow-lg hover:-translate-y-0.5 transition-transform duration-200"
      aria-label={`${title} widget`}
    >
      {/* ── Card header ── */}
      <header className="flex items-center justify-between gap-4 border-b border-[#3d3660] px-5 py-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>

        {/* Generate / Regenerate button in header — only shown when not loading */}
        {status !== "loading" && (
          <button
            type="button"
            onClick={onGenerate}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-[10px] px-4 py-1.5 text-sm transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
            aria-label={
              status === "idle"
                ? `Generate ${title}`
                : `Regenerate ${title}`
            }
          >
            {status === "idle" ? "Generate" : "Regenerate"}
          </button>
        )}

        {/* Spinner indicator while loading */}
        {isLoading && (
          <span
            className="inline-block h-5 w-5 animate-spin rounded-full border-2
                       border-[#7c3aed] border-t-transparent"
            role="status"
            aria-label="Generating…"
          />
        )}
      </header>

      {/* ── Card body ── */}
      <div className="flex flex-col px-5 py-4">
        {status === "idle" && <IdlePrompt />}

        {status === "loading" && <LoadingState />}

        {status === "success" && (
          <div className="flex flex-col">
            {/* AI output content area with glow border */}
            <div className="border border-[#4c3d8f] rounded-lg p-4 shadow-[inset_0_0_0_1px_#4c3d8f] text-sm text-gray-200 leading-relaxed">
              {children}
            </div>

            {/* Regenerate button below output */}
            <RegenerateButton onClick={onGenerate} />
          </div>
        )}

        {status === "error" && (
          <ErrorState
            message={
              errorMessage ?? "Something went wrong. Please try again."
            }
            onRetry={onGenerate}
          />
        )}
      </div>
    </article>
  );
}
