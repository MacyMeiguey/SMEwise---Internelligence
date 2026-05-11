/**
 * ProductVisualWidget — Pricing Strategy Section
 * Generates a product/service image using Amazon Nova Canvas via the nova API.
 * Requirements: 11.4
 *
 * Props:
 *   profile       — the submitted BusinessProfile
 *   pricingInputs — optional pricing context inputs
 *   onGenerateRef — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile, PricingOptionalInputs } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";

// ─── Component ────────────────────────────────────────────────────────────────

interface ProductVisualWidgetProps {
  profile: BusinessProfile;
  pricingInputs: PricingOptionalInputs;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function ProductVisualWidget({
  profile,
  pricingInputs,
  onGenerateRef,
}: ProductVisualWidgetProps) {
  const { state, generate } = useWidgetState();
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setImageBase64(null);
    await generate(async () => {
      const prompt =
        `Professional product or service image for ${profile.companyName}, a Malaysian ${profile.industry} business` +
        `${pricingInputs.productServiceNames ? `. Products/services: ${pricingInputs.productServiceNames}` : ""}` +
        `. Clean white background, professional photography style, high quality.`;

      const res = await fetch("http://localhost:3001/api/nova/image", {
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
  }, [profile, pricingInputs, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Product Visual"
      onGenerate={handleGenerate}
      state={state}
    >
      {imageBase64 && (
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="Product visual"
          className="w-full rounded-lg"
        />
      )}
    </WidgetCard>
  );
}
