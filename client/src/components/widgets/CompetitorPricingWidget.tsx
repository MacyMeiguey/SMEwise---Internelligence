/**
 * CompetitorPricingWidget — Pricing Strategy Section
 * Provides competitor pricing analysis using Claude streaming with web_search.
 * Requirements: 11.2
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

interface CompetitorPricingWidgetProps {
  profile: BusinessProfile;
  pricingInputs: PricingOptionalInputs;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function CompetitorPricingWidget({
  profile,
  pricingInputs,
  onGenerateRef,
}: CompetitorPricingWidgetProps) {
  const { state, generate } = useWidgetState();
  const [content, setContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setContent("");
    await generate(async () => {
      const userMessage =
        `Provide a competitor pricing analysis for a ${profile.industry} business in ${profile.city}, Malaysia` +
        `${pricingInputs.productServiceNames ? ` selling: ${pricingInputs.productServiceNames}` : ""}` +
        `. Include: market price overview, competitor table (3-4 competitor types with price ranges), positioning recommendation, and market reality check. Conversational tone. Maximum 200 words.`;

      await streamClaude(
        {
          systemPrompt: SYSTEM_PROMPT,
          userMessage,
          tools: ["web_search"],
        },
        (delta) => setContent((prev) => prev + delta)
      );
    });
  }, [profile, pricingInputs, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Competitor Pricing Analysis"
      onGenerate={handleGenerate}
      state={state}
    >
      <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-800 leading-relaxed">
        {content}
      </pre>
    </WidgetCard>
  );
}
