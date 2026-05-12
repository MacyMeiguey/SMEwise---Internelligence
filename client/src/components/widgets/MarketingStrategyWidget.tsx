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
import WidgetCard from "../WidgetCard";
import MarketingPlan, { type MarketingPlan as MarketingPlanData } from "./MarketingPlan";

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchMarketingPlan(profile: BusinessProfile): Promise<string> {
  const payload = {
    companyName:    profile.companyName,
    industry:       profile.industry,
    businessStage:  profile.businessStage,
    city:           profile.city,
    targetCustomer: profile.targetCustomer,
    mainGoal:       profile.mainGoal,
    currentFunds:   profile.currentFunds,
    businessType:   profile.businessType,
    // Only include if the user actually provided one — let the server generate the fallback otherwise
    ...(profile.fundAllocation ? { fundAllocation: profile.fundAllocation } : {}),
  };

  // ── Debug: inspect every field before sending ──
  console.log("=== fetchMarketingPlan payload ===");
  console.table(payload);                        // neat table in DevTools
  console.log("Raw JSON:", JSON.stringify(payload, null, 2));

  const res = await fetch("http://localhost:3001/api/bedrock/marketing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // ── Debug: inspect the response ──
  console.log("Response status:", res.status, res.statusText);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Error response body:", err);
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = await res.json() as { content: string };
  console.log("Response data:", data);           // see what came back
  return data.content;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────
// The agent may wrap the JSON in markdown code fences — strip them if present.

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try to find the first { ... } block
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
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

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      const raw = await fetchMarketingPlan(profile);

      // Notify parent with the raw content (MarketingPosterWidget may use it)
      onStrategyGenerated?.(raw);

      // Parse the JSON the agent returned
      try {
        const jsonStr = extractJson(raw);
        const parsed = JSON.parse(jsonStr) as MarketingPlanData;
        setPlan(parsed);
      } catch {
        // If parsing fails, surface a clear message rather than crashing
        setParseError(
          "The agent returned a response that couldn't be parsed as a marketing plan. " +
          "Try regenerating."
        );
        // Still throw so useWidgetState transitions to error
        throw new Error("Failed to parse marketing plan JSON from agent response.");
      }
    });
  }, [profile, generate, onStrategyGenerated]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Marketing Strategy"
      onGenerate={handleGenerate}
      state={state}
    >
      {parseError ? (
        <p className="text-sm text-error-600">{parseError}</p>
      ) : plan ? (
        <MarketingPlan plan={plan} />
      ) : null}
    </WidgetCard>
  );
}
