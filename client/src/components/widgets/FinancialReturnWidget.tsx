/**
 * FinancialReturnWidget — Financial Planning Section
 * Generates a financial return projection via Claude SSE streaming.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 *
 * Props:
 *   profile — the submitted BusinessProfile
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
  "When including URLs, use the web_search tool to verify they are live before including them. " +
  "Omit any URL you cannot verify.";

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
        const parsed = JSON.parse(data);
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildUserMessage(profile: BusinessProfile): string {
  return (
    `Generate a financial return projection for a Malaysian ${profile.industry} business ` +
    `(${profile.businessStage}) with RM ${profile.currentFunds.toLocaleString()} capital. ` +
    `Include: quarterly revenue breakdown (Q1-Q4), break-even analysis, 3 financial milestones, ` +
    `3 financial risks, and 3 action steps. All monetary values in RM. Maximum 200 words.`
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FinancialReturnWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function FinancialReturnWidget({ profile, onGenerateRef }: FinancialReturnWidgetProps) {
  const { state, generate } = useWidgetState();
  const [content, setContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setContent("");
    await generate(async () => {
      await streamClaude(
        {
          systemPrompt: SYSTEM_PROMPT,
          userMessage: buildUserMessage(profile),
          maxTokens: 512,
        },
        (delta) => setContent((prev) => prev + delta)
      );
    });
  }, [profile, generate]);

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Financial Return Projection"
      onGenerate={handleGenerate}
      state={state}
    >
      <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-800 leading-relaxed">
        {content}
      </pre>
    </WidgetCard>
  );
}
