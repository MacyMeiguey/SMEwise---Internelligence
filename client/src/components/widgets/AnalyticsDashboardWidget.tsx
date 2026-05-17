/**
 * AnalyticsDashboardWidget — Owner Tools Section
 * Generates an analytics dashboard image using Amazon Nova Canvas via the nova API.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 *
 * Props:
 *   profile       — the submitted BusinessProfile
 *   onGenerateRef — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Component ────────────────────────────────────────────────────────────────

interface AnalyticsDashboardWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function AnalyticsDashboardWidget({
  profile,
  onGenerateRef,
}: AnalyticsDashboardWidgetProps) {
  const { state, generate } = useWidgetState();
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setImageBase64(null);
    await generate(async () => {
      const prompt =
        `Minimalist SaaS-style analytics dashboard for a Malaysian ${profile.industry} business. ` +
        `Include: bar charts showing monthly revenue, line graph showing growth trend, ` +
        `pie chart showing expense breakdown, KPI cards. ` +
        `Dark background with purple/blue accent colours, clean modern UI design, professional data visualisation.`;

      const res = await fetch(`${API_BASE}/api/nova/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 1024, height: 768 }),
      });

      if (!res.ok) {
        throw new Error(`Image generation failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { imageBase64?: string; error?: string };
      if (!data.imageBase64) {
        throw new Error(data.error ?? "No image returned. Please try again.");
      }

      setImageBase64(data.imageBase64);
    });
  }, [profile, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Analytics Dashboard"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Each run is a fresh illustrative board — ideal for pitch decks; figures are not live accounting data."
      idleButtonLabel="Create snapshot"
      regenerateLabel="New snapshot"
    >
      {imageBase64 && (
        <figure className="space-y-2">
          <img
            src={`data:image/png;base64,${imageBase64}`}
            alt="Generated analytics-style dashboard illustration"
            className="w-full rounded-xl border border-neutral-200/90 bg-neutral-100/50 shadow-inner dark:border-white/[0.08] dark:bg-black/30"
          />
          <figcaption className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
            Illustrative visualisation — not connected to live books or bank feeds.
          </figcaption>
        </figure>
      )}
    </WidgetCard>
  );
}
