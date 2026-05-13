/**
 * MarketingStrategyWidget — Marketing Section
 * Generates a phased marketing plan via the AWS Bedrock agent and renders it
 * using the MarketingPlan component.
 *
 * Props:
 *   profile              — the submitted BusinessProfile
 *   onStrategyGenerated  — callback with the raw JSON string (for other widgets)
 *   onGenerateRef        — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import MarketingPlan, { type MarketingPlan as MarketingPlanData } from "./MarketingPlan";
import { API_BASE } from "../../lib/api";
import { formatRM } from "../../utils/formatRM";

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchMarketingPlan(profile: BusinessProfile, manualBudget?: number): Promise<string> {
  const fundAllocation = manualBudget != null
    ? `RM ${manualBudget.toLocaleString("en-MY")} allocated to marketing`
    : profile.fundAllocation;

  const payload = {
    companyName:    profile.companyName,
    industry:       profile.industry,
    businessStage:  profile.businessStage,
    city:           profile.city,
    targetCustomer: profile.targetCustomer,
    mainGoal:       profile.mainGoal,
    currentFunds:   profile.currentFunds,
    businessType:   profile.businessType,
    ...(fundAllocation ? { fundAllocation } : {}),
  };

  console.log("=== fetchMarketingPlan payload ===");
  console.table(payload);
  console.log("Raw JSON:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${API_BASE}/api/bedrock/marketing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", res.status, res.statusText);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Error response body:", err);
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = await res.json() as { content: string };
  console.log("Response data:", data);
  return data.content;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── Fund Allocation Slider Panel ─────────────────────────────────────────────

interface BudgetSliderPanelProps {
  maxFunds: number;
  value: number;
  onChange: (value: number) => void;
  onClose: () => void;
  onClear: () => void;
}

function BudgetSliderPanel({ maxFunds, value, onChange, onClose, onClear }: BudgetSliderPanelProps) {
  const [rawText, setRawText] = useState<string>(String(value));
  const step = Math.max(100, Math.round(maxFunds / 1000) * 100);
  const min = step;

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    setRawText(String(next));
    onChange(next);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRawText(e.target.value);
  }

  function handleTextBlur() {
    const parsed = parseInt(rawText.replace(/[^0-9]/g, ""), 10);
    const clamped = isNaN(parsed) ? min : Math.min(maxFunds, Math.max(min, parsed));
    setRawText(String(clamped));
    onChange(clamped);
  }

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-neutral-50 dark:bg-white/[0.03] p-4 sm:p-5 space-y-3 motion-safe:animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Set Marketing Budget
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
          aria-label="Close budget slider"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Allocate a specific amount from your total funds ({formatRM(maxFunds)}) for marketing.
      </p>

      {/* Slider + input row */}
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={maxFunds}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-primary-600"
          aria-label="Marketing budget slider"
        />
        <input
          type="text"
          inputMode="numeric"
          value={rawText}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          className="w-28 rounded-lg border border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-white/[0.04] px-3 py-2 text-right text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Marketing budget amount"
        />
      </div>

      {/* Display */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
          {formatRM(value)}
        </p>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {((value / maxFunds) * 100).toFixed(1)}% of total funds
        </span>
      </div>

      {/* Clear button */}
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
      >
        Clear manual budget (use profile default)
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketingStrategyWidgetProps {
  profile: BusinessProfile;
  onStrategyGenerated?: (strategy: string) => void;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function MarketingStrategyWidget({
  profile,
  onStrategyGenerated,
  onGenerateRef,
}: MarketingStrategyWidgetProps) {
  const { state, generate } = useWidgetState();
  const [plan, setPlan] = useState<MarketingPlanData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Manual budget state
  const [showBudgetSlider, setShowBudgetSlider] = useState(false);
  const [manualBudget, setManualBudget] = useState<number | null>(null);
  const defaultBudget = Math.round(profile.currentFunds * 0.2);

  const { status, errorMessage } = state;
  const isLoading = status === "loading";

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      const raw = await fetchMarketingPlan(profile, manualBudget ?? undefined);

      onStrategyGenerated?.(raw);

      try {
        const jsonStr = extractJson(raw);
        const parsed = JSON.parse(jsonStr) as MarketingPlanData;
        setPlan(parsed);
      } catch {
        setParseError(
          "The agent returned a response that couldn't be parsed as a marketing plan. " +
          "Try regenerating."
        );
        throw new Error("Failed to parse marketing plan JSON from agent response.");
      }
    });
  }, [profile, manualBudget, generate, onStrategyGenerated]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label="Marketing Strategy widget"
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight leading-snug dark:text-white">
          Marketing Strategy
        </h3>

        <div className="flex items-center gap-2 shrink-0">
          {/* Set Marketing Budget button — always visible when not loading */}
          {!isLoading && (
            <button
              type="button"
              onClick={() => setShowBudgetSlider((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                manualBudget != null
                  ? "border-primary-300 dark:border-primary-600/50 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                  : "border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.08]"
              }`}
              aria-label="Set marketing budget"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {manualBudget != null ? formatRM(manualBudget) : "Budget"}
            </button>
          )}

          {/* Generate / Rewrite button */}
          {!isLoading && (
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
              aria-label={status === "idle" ? "Write strategy" : "Rewrite plan"}
            >
              {status === "idle" ? "Write strategy" : "Rewrite plan"}
            </button>
          )}

          {/* Loading spinner */}
          {isLoading && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent"
              role="status"
              aria-label="Generating…"
            />
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-col p-4 sm:p-5">
        {/* Budget slider panel — shown when toggled, available in any state */}
        {showBudgetSlider && (
          <div className="mb-4">
            <BudgetSliderPanel
              maxFunds={profile.currentFunds}
              value={manualBudget ?? defaultBudget}
              onChange={(v) => setManualBudget(v)}
              onClose={() => setShowBudgetSlider(false)}
              onClear={() => {
                setManualBudget(null);
                setShowBudgetSlider(false);
              }}
            />
          </div>
        )}

        {/* Idle state */}
        {status === "idle" && !showBudgetSlider && (
          <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
            Channel mix + weekly cadence written for your audience — paste into Notion or Slides.
          </p>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Generating…">
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-3/4" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-full" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-5/6" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-2/3" />
            <span className="sr-only">Generating…</span>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success state */}
        {status === "success" && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Result</p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 max-h-[min(70vh,28rem)] overflow-y-auto overscroll-contain dark:border-white/[0.08] dark:bg-black/40">
              <div className="p-4 text-sm text-neutral-800 leading-relaxed dark:text-neutral-200">
                {parseError ? (
                  <p className="text-red-600 dark:text-red-400">{parseError}</p>
                ) : plan ? (
                  <MarketingPlan plan={plan} />
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
            >
              Rewrite plan
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
