/**
 * LoansFundingWidget — Financial Planning Section
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 *
 * Makes TWO parallel streaming calls to POST /api/claude/stream:
 *   1. Loan Guide — SME Bank, TEKUN, Bank Negara, commercial banks (max 100 words)
 *   2. Investor & Grants Guide — Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN (max 100 words)
 *
 * Both calls use tools: ["web_search"] and inject the full BusinessProfile as context.
 * Results are displayed as two side-by-side cards (grid-cols-2 on md+, stacked on mobile).
 *
 * Props:
 *   profile — the submitted BusinessProfile
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoansFundingWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

// ─── Shared system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SMEwise, an AI business advisor specialising in Malaysian SMEs.
Always use Malaysian context: RM currency, SSM/LHDN/EPF/SOCSO regulations,
Malaysian platforms (Shopee, Lazada, TikTok, WhatsApp Business, Google My Business),
and local financing (TEKUN, Cradle, MDEC, MIDA, MBAN, MaGIC, pitchIN).
Never use USD or reference non-Malaysian regulations.
When including URLs, use the web_search tool to verify they are live before including them.
Omit any URL you cannot verify.`;

// ─── Streaming helper ─────────────────────────────────────────────────────────

/**
 * Streams a response from POST /api/claude/stream and calls onChunk for each
 * text delta. Returns the full accumulated text when the stream ends.
 */
async function streamClaudeResponse(
  systemPrompt: string,
  userMessage: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const response = await fetch("http://localhost:3001/api/claude/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      temperature: 0.7,
      tools: ["web_search"],
      maxTokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload) as { delta?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }
}

// ─── Sub-card component ───────────────────────────────────────────────────────

interface SubCardProps {
  title: string;
  icon: React.ReactNode;
  content: string;
  isLoading: boolean;
}

function SubCard({ title, icon, content, isLoading }: SubCardProps) {
  return (
    <div className="flex flex-col rounded-xl border-2 border-neutral-950 bg-white p-4 gap-3" style={{ boxShadow: '2px 2px 0 0 #ede9fe' }}>
      <div className="flex items-center gap-2">
        <span className="text-primary-600" aria-hidden="true">
          {icon}
        </span>
        <h4 className="text-sm font-bold text-neutral-950">{title}</h4>
      </div>

      {isLoading && !content ? (
        <div className="animate-pulse space-y-2" role="status" aria-label={`Loading ${title}`}>
          <div className="h-3 bg-neutral-200 rounded-lg w-full" />
          <div className="h-3 bg-neutral-200 rounded-lg w-5/6" />
          <div className="h-3 bg-neutral-200 rounded-lg w-4/6" />
          <div className="h-3 bg-neutral-200 rounded-lg w-full" />
          <div className="h-3 bg-neutral-200 rounded-lg w-3/4" />
          <span className="sr-only">Loading…</span>
        </div>
      ) : (
        <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
          {content}
        </p>
      )}
    </div>
  );
}

// ─── LoansFundingWidget ───────────────────────────────────────────────────────

export default function LoansFundingWidget({ profile, onGenerateRef }: LoansFundingWidgetProps) {
  const { state, generate } = useWidgetState();

  // Track streaming content for each sub-widget independently
  const [loanContent, setLoanContent] = useState<string>("");
  const [grantsContent, setGrantsContent] = useState<string>("");

  const profileContext = `
Business Profile:
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- City/State: ${profile.city}
- Business Stage: ${profile.businessStage}
- Business Type: ${profile.businessType}
- Current Funds: RM ${profile.currentFunds.toLocaleString()}
- Target Customer: ${profile.targetCustomer}
${profile.mainGoal ? `- Main Goal: ${profile.mainGoal}` : ""}
`.trim();

  const loanPrompt = `${profileContext}

Generate a concise Loan Guide for a Malaysian SME founder. Cover:
- SME Bank (smebank.com.my) — loan products, eligibility, RM amounts
- TEKUN Nasional (tekun.com.my) — micro-financing, eligibility, RM amounts
- Bank Negara Malaysia (bnm.gov.my) — SME financing schemes, eligibility
- Major commercial banks (Maybank, CIMB, RHB) — SME loan products, RM amounts

Use the web_search tool to verify each URL before including it. Omit any URL you cannot verify.
Include real URLs, eligibility criteria, and loan amounts in RM.
Tailor recommendations to the business stage (${profile.businessStage}), type (${profile.businessType}), and industry (${profile.industry}).
Respond in 100 words or fewer.`;

  const grantsPrompt = `${profileContext}

Generate a concise Investor & Grants Guide for a Malaysian SME founder. Cover:
- Cradle Fund (cradle.com.my) — CIP grants, eligibility, RM amounts
- MDEC (mdec.com.my) — digital economy grants, eligibility
- MIDA (mida.gov.my) — investment incentives, eligibility
- MBAN (mban.com.my) — angel investment network, eligibility
- MaGIC (mymagic.my) — accelerator programmes, eligibility
- pitchIN (pitchin.my) — equity crowdfunding, eligibility, RM amounts

Use the web_search tool to verify each URL before including it. Omit any URL you cannot verify.
Include real URLs, grant amounts in RM, and eligibility criteria.
Tailor recommendations to the business stage (${profile.businessStage}), type (${profile.businessType}), and industry (${profile.industry}).
Respond in 100 words or fewer.`;

  const handleGenerate = useCallback(async () => {
    // Reset sub-widget content before each generation
    setLoanContent("");
    setGrantsContent("");

    await generate(async () => {
      // Fire both streams in parallel
      await Promise.all([
        streamClaudeResponse(SYSTEM_PROMPT, loanPrompt, (chunk) => {
          setLoanContent((prev) => prev + chunk);
        }),
        streamClaudeResponse(SYSTEM_PROMPT, grantsPrompt, (chunk) => {
          setGrantsContent((prev) => prev + chunk);
        }),
      ]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, generate]);

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  const isLoading = state.status === "loading";

  return (
    <WidgetCard
      title="Loans & Funding Panel"
      onGenerate={handleGenerate}
      state={state}
    >
      {/* Two side-by-side sub-cards — stacked on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SubCard
          title="Loan Guide"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
          content={loanContent}
          isLoading={isLoading}
        />
        <SubCard
          title="Investor & Grants Guide"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          }
          content={grantsContent}
          isLoading={isLoading}
        />
      </div>
    </WidgetCard>
  );
}
