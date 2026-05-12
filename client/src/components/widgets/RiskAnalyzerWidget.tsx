/**
 * RiskAnalyzerWidget — Operations Section
 * Identifies the top 5 business risks with severity, consequence, and 3-step mitigation.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 *
 * Props:
 *   profile — the submitted BusinessProfile
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are SMEwise, an AI business advisor specialising in Malaysian SMEs. " +
  "Always use Malaysian context: RM currency, SSM/LHDN/EPF/SOCSO regulations, " +
  "Malaysian platforms (Shopee, Lazada, TikTok, WhatsApp Business, Google My Business), " +
  "and local financing (TEKUN, Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN). " +
  "Never use USD or reference non-Malaysian regulations. " +
  "When including URLs, use the web_search tool to verify they are live before including them. " +
  "Omit any URL you cannot verify.";

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserMessage(profile: BusinessProfile): string {
  return (
    `Identify the top 5 business risks for a Malaysian SME with the following profile:\n\n` +
    `Industry: ${profile.industry}\n` +
    `Business Stage: ${profile.businessStage}\n` +
    `Business Type: ${profile.businessType}\n\n` +
    `For each risk, provide:\n` +
    `1. Risk name\n` +
    `2. Severity level (High / Medium / Low)\n` +
    `3. A brief description of the consequence\n` +
    `4. A 3-step mitigation plan\n\n` +
    `Be specific to the industry, business stage, and business type above. ` +
    `Use Malaysian business context throughout. ` +
    `Respond in 200 words or fewer.`
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RiskAnalyzerWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function RiskAnalyzerWidget({ profile, onGenerateRef }: RiskAnalyzerWidgetProps) {
  const { state, generate } = useWidgetState();
  // Separate state for streamed content so we can update it progressively
  // while useWidgetState manages the loading/success/error status.
  const [streamedContent, setStreamedContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setStreamedContent("");

    await generate(async () => {
      const response = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          userMessage: buildUserMessage(profile),
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(
            "Our AI service is busy right now. Please wait a moment and try again."
          );
        }
        throw new Error(
          "Something went wrong while analysing risks. Please try again."
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body received from the server.");
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by "\n\n"; split on newlines and process
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep any incomplete trailing line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload) as { delta?: string };
            if (parsed.delta) {
              accumulated += parsed.delta;
              // Update displayed content progressively
              setStreamedContent(accumulated);
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim().startsWith("data:")) {
        const payload = buffer.trim().slice(5).trim();
        if (payload && payload !== "[DONE]") {
          try {
            const parsed = JSON.parse(payload) as { delta?: string };
            if (parsed.delta) {
              accumulated += parsed.delta;
              setStreamedContent(accumulated);
            }
          } catch {
            // Ignore
          }
        }
      }

      if (!accumulated) {
        throw new Error("No content was returned. Please try again.");
      }
    });
  }, [profile, generate]);

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Risk Analyzer"
      onGenerate={handleGenerate}
      state={state}
    >
      <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-800 leading-relaxed">
        {streamedContent}
      </pre>
    </WidgetCard>
  );
}
