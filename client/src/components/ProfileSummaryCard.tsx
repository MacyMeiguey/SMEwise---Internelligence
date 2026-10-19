/**
 * ProfileSummaryCard component
 * Generates and displays a 4–6 line AI-generated summary of the user's BusinessProfile.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * Props:
 *   profile  — the submitted BusinessProfile
 *   trigger  — when this flips to true, generation starts automatically
 */

import { useState, useEffect, useCallback } from "react";
import type { BusinessProfile } from "../types";
import { formatRM } from "../utils/formatRM";
import { API_BASE } from "../lib/api";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileSummaryCardProps {
  profile: BusinessProfile;
  trigger: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the user message sent to Claude for the profile summary. */
function buildUserMessage(profile: BusinessProfile): string {
  const fundsFormatted = formatRM(profile.currentFunds);
  const goalLine = profile.mainGoal
    ? `Main Business Goal: ${profile.mainGoal}`
    : "Main Business Goal: Not specified";

  return (
    `Please write a 4–6 line professional summary of the following Malaysian SME business profile. ` +
    `Use a professional tone with minimal emojis. Incorporate all of the details below.\n\n` +
    `Company Name: ${profile.companyName}\n` +
    `Industry or Niche: ${profile.industry}\n` +
    `City or State: ${profile.city}\n` +
    `Target Customer: ${profile.targetCustomer}\n` +
    `${goalLine}\n` +
    `Current Funds: ${fundsFormatted}\n` +
    `Business Stage: ${profile.businessStage}\n` +
    `Business Type: ${profile.businessType}\n\n` +
    `Respond with only the summary — no headings, no bullet points, no preamble.`
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Generating your business summary…">
      {/* Contextual message */}
      <p className="text-sm text-primary-600 dark:text-primary-300 mb-4 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        Analysing your business profile…
      </p>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-full" />
        <div className="h-4 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-11/12" />
        <div className="h-4 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-full" />
        <div className="h-4 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-10/12" />
        <div className="h-4 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-9/12" />
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3"
    >
      <div className="flex items-start gap-2 text-red-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="bg-transparent border border-primary-500/50 text-primary-600 dark:text-primary-300 rounded-lg px-4 py-2 hover:bg-primary-500/10 transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Regenerate Button ────────────────────────────────────────────────────────

interface RegenerateButtonProps {
  onClick: () => void;
  disabled: boolean;
}

function RegenerateButton({ onClick, disabled }: RegenerateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Regenerate business summary"
      className="mt-4 inline-flex items-center gap-2 bg-transparent border border-primary-500/50 text-primary-600 dark:text-primary-300 rounded-lg px-4 py-2
                 hover:bg-primary-500/10 transition-all duration-150 active:scale-[0.98]
                 disabled:opacity-50 disabled:cursor-not-allowed
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {/* Refresh icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      Regenerate
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileSummaryCard({ profile, trigger }: ProfileSummaryCardProps) {
  type Status = "idle" | "loading" | "success" | "error";

  const [status, setStatus] = useState<Status>("idle");
  const [content, setContent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Generation function ──
  const generate = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/bedrock/converse/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "You are SMEwise, an AI business advisor for Malaysian SMEs.",
          userMessage: buildUserMessage(profile),
          maxTokens: 300,
        }),
      });

      if (!response.ok) {
        // Surface rate-limit and server errors with friendly messages
        if (response.status === 429) {
          throw new Error(
            "Our AI service is busy right now. Please wait a moment and try again."
          );
        }
        throw new Error(
          "Something went wrong while generating your summary. Please try again."
        );
      }

      const data = (await response.json()) as { content: string };
      setContent(data.content);
      setStatus("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [profile]);

  // ── Auto-trigger when `trigger` flips to true ──
  useEffect(() => {
    if (trigger) {
      generate();
    }
    // We intentionally only re-run when `trigger` changes.
    // `generate` is stable (memoised with useCallback on `profile`).
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Business Profile Summary"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-subtle dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight tracking-tight">
              Business profile summary
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              AI-generated overview of your business
            </p>
          </div>
        </div>

        {status === "idle" && (
          <p className="text-sm text-neutral-500">
            Submit your profile to generate your business summary.
          </p>
        )}

        {status === "loading" && <LoadingState />}

        {status === "error" && errorMessage && (
          <ErrorState message={errorMessage} onRetry={generate} />
        )}

        {status === "success" && content && (
          <>
            <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed whitespace-pre-line">
              {content}
            </p>
            <RegenerateButton onClick={generate} disabled={false} />
          </>
        )}
      </div>
    </section>
  );
}
