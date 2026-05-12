/**
 * FundAllocationWidget — Financial Planning Section
 * Generates a fund allocation table across 6 categories using Claude streaming.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
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

// ─── SSE streaming helper ─────────────────────────────────────────────────────

async function streamBedrock(
  body: object,
  onChunk: (delta: string) => void
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
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
    `Create a fund allocation table for a Malaysian SME with RM ${profile.currentFunds.toLocaleString()} in available capital. ` +
    `Include these 6 categories: Operations, Marketing, Inventory, Staffing, Technology, Contingency. ` +
    `For each: percentage allocation, RM amount, key expense examples, and rationale. Maximum 200 words.`
  );
}

// ─── Table renderer ───────────────────────────────────────────────────────────

function TableOutput({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tableLines = lines.filter((l) => l.startsWith("|"));

  if (tableLines.length < 2) {
    return (
      <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    );
  }
  const rows = tableLines.map((line) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
  );

  const headerRow = rows[0];
  const separatorIndex = rows.findIndex((row) =>
    row.every((cell) => /^[-:]+$/.test(cell))
  );
  const dataRows =
    separatorIndex !== -1 ? rows.slice(separatorIndex + 1) : rows.slice(1);

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-neutral-200">
      <table className="w-full text-sm text-left text-neutral-800 border-collapse">
        <thead>
          <tr className="bg-primary-100 border-b-2 border-neutral-950">
            {headerRow.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2 font-bold text-neutral-950 whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={rowIdx % 2 === 0 ? "bg-white" : "bg-primary-50/50"}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-3 py-2 border-b border-neutral-200 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FundAllocationWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function FundAllocationWidget({
  profile,
  onGenerateRef,
}: FundAllocationWidgetProps) {
  const { state, generate } = useWidgetState();
  const [content, setContent] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setContent("");
    await generate(async () => {
      await streamBedrock(
        {
          systemPrompt: SYSTEM_PROMPT,
          userMessage: buildUserMessage(profile),
          maxTokens: 1024,
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
      title="Fund Allocation Table"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Splits your stated capital across essentials, growth, and buffer — tuned to Malaysian cost norms."
      idleButtonLabel="Build table"
      regenerateLabel="Rebuild table"
    >
      {content && <TableOutput content={content} />}
    </WidgetCard>
  );
}
