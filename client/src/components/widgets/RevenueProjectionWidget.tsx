/**
 * RevenueProjectionWidget — generates a 12-month revenue projection chart
 * via Amazon Nova Canvas and renders the returned base64 image.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 *
 * Props:
 *   profile — the submitted BusinessProfile (provides context for the prompt)
 */

import { useState, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

interface RevenueProjectionWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

/** Build a detailed Nova Canvas prompt for the revenue projection chart. */
function buildImagePrompt(profile: BusinessProfile): string {
  const fundsFormatted = `RM ${profile.currentFunds.toLocaleString("en-MY")}`;

  return (
    `A professional 12-month revenue projection line graph for a Malaysian SME. ` +
    `Y-axis labelled in Malaysian Ringgit (RM), X-axis showing months 1 through 12. ` +
    `The graph is colour-coded into four business phases: ` +
    `Startup phase (months 1–3, blue), Growth phase (months 4–6, green), ` +
    `Scaling phase (months 7–9, orange), Optimization phase (months 10–12, purple). ` +
    `Each phase is clearly labelled with a legend. ` +
    `The revenue curve starts near the current funds of ${fundsFormatted} and trends upward, ` +
    `reflecting a ${profile.businessStage} business in the ${profile.industry} industry. ` +
    `Clean white background, grid lines, data point markers, smooth line chart style, ` +
    `professional business infographic aesthetic, high contrast, readable axis labels.`
  );
}

export default function RevenueProjectionWidget({
  profile,
  onGenerateRef,
}: RevenueProjectionWidgetProps) {
  const { state, generate } = useWidgetState();
  // Store the generated image separately so it persists across re-renders
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function handleGenerate(): Promise<void> {
    // Clear previous image before generating a new one
    setImageBase64(null);

    await generate(async () => {
      const prompt = buildImagePrompt(profile);

      const response = await fetch(`${API_BASE}/api/nova/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 1024, height: 512 }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          (errorBody as { error?: string }).error ??
            `Request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        imageBase64: string;
        mimeType: string;
      };

      // Store the base64 image in local state so it can be rendered
      setImageBase64(data.imageBase64);
    });
  }

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGenerateRef]);

  return (
    <WidgetCard
      title="Revenue Projection"
      onGenerate={handleGenerate}
      state={state}
    >
      {imageBase64 && (
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="12-month revenue projection"
          className="w-full rounded-lg"
        />
      )}
    </WidgetCard>
  );
}
