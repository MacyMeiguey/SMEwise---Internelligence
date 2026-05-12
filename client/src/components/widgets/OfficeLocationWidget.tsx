/**
 * OfficeLocationWidget — Operations Section
 * Generates workspace recommendations with RM cost breakdowns, negotiation tips,
 * and zoning/permit notes specific to the user's city and industry.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

interface OfficeLocationWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

const SYSTEM_PROMPT = `You are SMEwise, an AI business advisor specialising in Malaysian SMEs.
Always use Malaysian context: RM currency, SSM/LHDN/EPF/SOCSO regulations,
Malaysian platforms (Shopee, Lazada, TikTok, WhatsApp Business, Google My Business),
and local financing (TEKUN, Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN).
Never use USD or reference non-Malaysian regulations.
When including URLs, use the web_search tool to verify they are live before including them.
Omit any URL you cannot verify.`;

function buildUserMessage(profile: BusinessProfile): string {
  return `Provide workspace recommendations for a ${profile.industry} business in ${profile.city}, Malaysia.

Include:
- 2–3 specific workspace or office options suitable for this industry (e.g. co-working spaces, shophouses, commercial units)
- RM cost breakdowns (monthly rent ranges, deposit, utilities estimate)
- Practical negotiation tips for securing a good lease in ${profile.city}
- Relevant zoning or permit notes for a ${profile.industry} business operating in ${profile.city}

Keep the response to a maximum of 200 words. Use RM for all monetary values.`;
}

export default function OfficeLocationWidget({ profile, onGenerateRef }: OfficeLocationWidgetProps) {
  const { state, generate } = useWidgetState();
  const [content, setContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    // Reset content before each generation
    setContent("");

    await generate(async () => {
      const response = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          userMessage: buildUserMessage(profile),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ??
            `Request failed with status ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { delta?: string };
            if (parsed.delta) {
              accumulated += parsed.delta;
              // Update state progressively for live streaming
              setContent(accumulated);
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }

      if (!accumulated) {
        throw new Error("No content received from AI service.");
      }
    });
  }, [profile, generate]);

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Office & Location Finder"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Weighs city, business type, and traffic patterns into a shortlist you can actually visit."
      idleButtonLabel="Suggest sites"
      regenerateLabel="Rerun search"
    >
      <p className="whitespace-pre-wrap">{content}</p>
    </WidgetCard>
  );
}
