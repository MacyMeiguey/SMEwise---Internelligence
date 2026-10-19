/**
 * MarketingForecastWidget â€” Marketing Section
 * Generates a 12-month marketing forecast (growth projections, time-series data,
 * phase projections, benchmarking) by invoking the forecast Bedrock agent with
 * the marketing plan JSON as input.
 *
 * Locked until MarketingStrategyWidget has generated a plan.
 *
 * Props:
 *   marketingPlanJson â€” raw JSON string from the /api/bedrock/marketing response
 *   onGenerateRef     â€” callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useWidgetState } from "../../hooks/useWidgetState";
import MarketingForecastView, { type MarketingForecast as MarketingForecastData } from "./MarketingForecast";
import { API_BASE } from "../../lib/api";

// â”€â”€â”€ API call â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchMarketingForecast(marketingPlanJson: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/bedrock/marketing-forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marketingPlanJson }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = await res.json() as { content: string };
  return data.content;
}

// â”€â”€â”€ JSON extraction helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache';

const CACHE_KEY = 'marketing-forecast';

interface MarketingForecastWidgetProps {
  /** Raw JSON string from the marketing strategy agent. Null means not yet generated. */
  marketingPlanJson: string | null;
  onGenerateRef?: (fn: (planJsonOverride?: string) => Promise<void>) => void;
  hideGenerateButton?: boolean;
  /** Called once the widget has a successful result (fresh or from cache). */
  onSuccess?: () => void;
}

export default function MarketingForecastWidget({
  marketingPlanJson,
  onGenerateRef,
  hideGenerateButton = false,
  onSuccess,
}: MarketingForecastWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [forecast, setForecast] = useState<MarketingForecastData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const { status, errorMessage } = state;
  const isLoading = status === "loading";
  const isDisabled = !marketingPlanJson;

  const handleGenerateRef = useRef<(planJsonOverride?: string) => Promise<void>>();

  const makeCacheInputs = (planJson: string) => ({ marketingPlanJson: planJson });

  // Guard against duplicate concurrent calls (e.g. onStrategyGenerated fires
  // while the auto-gen pipeline also calls handleGenerate for the same input).
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    if (!marketingPlanJson) return;
    const cached = checkCache<MarketingForecastData>(CACHE_KEY, makeCacheInputs(marketingPlanJson));
    if (cached) {
      setForecast(cached.result);
      restoreSuccess();
      onSuccess?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingPlanJson]);

  const handleGenerate = useCallback(async (planJsonOverride?: string) => {
    const jsonToUse = planJsonOverride ?? marketingPlanJson;
    if (!jsonToUse) return;

    // Skip if already in-flight — prevents duplicate API calls.
    if (isGeneratingRef.current) return;

    const cached = checkCache<MarketingForecastData>(CACHE_KEY, makeCacheInputs(jsonToUse));
    if (cached) {
      setForecast(cached.result);
      setParseError(null);
      restoreSuccess();
      onSuccess?.();
      return;
    }

    isGeneratingRef.current = true;
    setForecast(null);
    setParseError(null);

    try {
      await generate(async () => {
        const raw = await fetchMarketingForecast(jsonToUse);

        try {
          const jsonStr = extractJson(raw);
          const parsed = JSON.parse(jsonStr) as MarketingForecastData;
          setForecast(parsed);
          writeCache(CACHE_KEY, hashInputs(makeCacheInputs(jsonToUse)), parsed);
          onSuccess?.();
        } catch {
          setParseError(
            "The agent returned a response that couldn't be parsed as a forecast. Try regenerating."
          );
          throw new Error("Failed to parse marketing forecast JSON from agent response.");
        }
      });
    } finally {
      isGeneratingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketingPlanJson, generate]);

  // Keep the ref always pointing to the latest handleGenerate so the registered
  // callback in onGenerateRef is never stale when called from handleGenerateAll.
  handleGenerateRef.current = handleGenerate;


  useEffect(() => {
    // Register a stable wrapper that always calls the latest handleGenerate via ref.
    onGenerateRef?.((planJsonOverride?: string) => handleGenerateRef.current!(planJsonOverride));
  }, [onGenerateRef]);

  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label="Marketing Forecast widget"
    >
      {/* â”€â”€ Header â”€â”€ */}
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight leading-snug dark:text-white">
            Marketing Forecast
          </h3>
          {isDisabled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 dark:border-white/[0.12] bg-neutral-100 dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Generate strategy first
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isLoading && !hideGenerateButton && (
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isDisabled}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-35 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
              aria-label={status === "idle" ? "Generate forecast" : "Regenerate forecast"}
            >
              {status === "idle" ? "Generate" : "Regenerate"}
            </button>
          )}
          {isLoading && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent"
              role="status"
              aria-label="Generatingâ€¦"
            />
          )}
        </div>
      </header>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex flex-col p-4 sm:p-5">
        {status === "idle" && (
          <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
            {isDisabled
              ? "Generate the Marketing Strategy first â€” this widget uses that plan as its input."
              : "Generates a 12-month growth forecast with time-series projections, phase conversion rates, and Malaysian market benchmarking."}
          </p>
        )}

        {isLoading && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Generatingâ€¦">
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-3/4" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-full" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-5/6" />
            <div className="h-3.5 bg-neutral-200 dark:bg-white/10 rounded-full w-2/3" />
            <span className="sr-only">Generatingâ€¦</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
              {errorMessage ?? "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isDisabled}
              className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Result</p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-black/40">
              <div className="p-4 text-sm text-neutral-800 leading-relaxed dark:text-neutral-200">
                {parseError ? (
                  <p className="text-red-600 dark:text-red-400">{parseError}</p>
                ) : forecast ? (
                  <MarketingForecastView forecast={forecast} />
                ) : null}
              </div>
            </div>
            {!hideGenerateButton && (
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isDisabled}
                className="self-start rounded-lg px-3 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-neutral-100 hover:text-primary-500 dark:text-primary-300 dark:hover:bg-white/[0.06] dark:hover:text-primary-200"
              >
                Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

