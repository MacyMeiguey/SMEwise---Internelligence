/**
 * MarketingPosterWidget — Marketing Section
 * Generates a promotional marketing poster using Amazon Nova Canvas via the nova API.
 * Requirements: 12.2
 *
 * Props:
 *   profile           — the submitted BusinessProfile
 *   marketingStrategy — optional strategy text to inform the poster prompt
 *   onGenerateRef     — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketingPosterWidgetProps {
  profile: BusinessProfile;
  marketingStrategy?: string;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function MarketingPosterWidget({
  profile,
  marketingStrategy,
  onGenerateRef,
}: MarketingPosterWidgetProps) {
  const { state, generate } = useWidgetState();
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setImageBase64(null);
    await generate(async () => {
      const prompt =
        `Professional promotional poster for ${profile.companyName}, a ${profile.industry} business in ${profile.city}, Malaysia` +
        `${marketingStrategy ? `. Marketing focus: ${marketingStrategy.slice(0, 200)}` : ""}` +
        `. Vibrant colours, modern design, Malaysian aesthetic, clear branding.`;

      const res = await fetch(`${API_BASE}/api/nova/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 1024, height: 1024 }),
      });

      if (!res.ok) {
        throw new Error(`Image generation failed: HTTP ${res.status}`);
      }

      const data = await res.json() as { imageBase64?: string; error?: string };
      if (!data.imageBase64) {
        throw new Error(data.error ?? "No image returned. Please try again.");
      }

      setImageBase64(data.imageBase64);
    });
  }, [profile, marketingStrategy, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Marketing Poster"
      onGenerate={handleGenerate}
      state={state}
    >
      {imageBase64 && (
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="Marketing poster"
          className="w-full rounded-lg"
        />
      )}
    </WidgetCard>
  );
}
