/**
 * MarketingStrategyWidget — Marketing Section
 * Generates a phased marketing plan using Claude streaming with web_search.
 * Requirements: 12.1
 *
 * Props:
 *   profile              — the submitted BusinessProfile
 *   onStrategyGenerated  — callback with the full generated strategy text
 *   onGenerateRef        — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are SMEwise, an AI business advisor specialising in Malaysian SMEs. " +
  "Always use Malaysian context: RM currency, SSM/LHDN/EPF/SOCSO regulations, " +
  "Malaysian platforms (Shopee, Lazada, TikTok, WhatsApp Business, Google My Business), " +
  "and local financing (TEKUN, Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN). " +
  "Never use USD or reference non-Malaysian regulations. " +
  "When including URLs, use the web_search tool to verify they are live before including them.";

// ─── SSE streaming helper ─────────────────────────────────────────────────────

async function streamClaude(
  body: object,
  onChunk: (delta: string) => void
): Promise<void> {
  const res = await fetch("http://localhost:3001/api/claude/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      try {
        const p = JSON.parse(data);
        if (p.delta) onChunk(p.delta);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
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
  const [content, setContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setContent("");
    await generate(async () => {
      const userMessage =
        `Create a phased marketing plan for a Malaysian ${profile.industry} business (${profile.businessType}) in ${profile.city} with RM ${profile.currentFunds.toLocaleString()} budget targeting ${profile.targetCustomer}. Cover: Facebook/Instagram, WhatsApp Business, TikTok, Google My Business, Shopee/Lazada, and local events. Structure as: phase overview + detailed table with RM budget allocation. Include Malaysia-specific tactics. Maximum 300 words.`;

      let accumulated = "";
      await streamClaude(
        {
          systemPrompt: SYSTEM_PROMPT,
          userMessage,
          temperature: 0.6,
          tools: ["web_search"],
        },
        (delta) => {
          accumulated += delta;
          setContent(accumulated);
        }
      );

      // Notify parent with the full generated strategy
      if (accumulated) {
        onStrategyGenerated?.(accumulated);
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
      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-200 leading-relaxed">
        {content}
      </pre>
    </WidgetCard>
  );
}
