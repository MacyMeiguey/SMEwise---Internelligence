/**
 * StartupRegistrationWidget — Operations Section
 * Generates a startup registration checklist specific to the user's business type and industry.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 *
 * Props:
 *   profile — the submitted BusinessProfile
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

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
    `Generate a startup registration checklist for a ${profile.businessType} in the ${profile.industry} industry in Malaysia. ` +
    `Format the response as a checklist. Cover the following:\n` +
    `- Business structure selection and rationale for a ${profile.businessType}\n` +
    `- Minimum capital requirements in RM\n` +
    `- Required licences specific to ${profile.industry}\n` +
    `- Government fees in RM for SSM, LHDN, EPF, and SOCSO registration\n` +
    `- Estimated processing time for each step\n\n` +
    `Keep the response to a maximum of 200 words. Be specific to the ${profile.businessType} structure and ${profile.industry} industry.`
  );
}

// ─── SSE streaming helper ─────────────────────────────────────────────────────

/**
 * Calls POST /api/bedrock/converse/stream with web_search enabled and streams the SSE
 * response, invoking `onChunk` for each text delta received.
 * Returns the fully accumulated text.
 */
async function streamRegistrationGuidance(
  profile: BusinessProfile,
  onChunk: (chunk: string) => void
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: buildUserMessage(profile),
      maxTokens: 1024,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Our AI service is busy right now. Please wait a moment and try again."
      );
    }
    throw new Error(
      "Something went wrong while generating registration guidance. Please try again."
    );
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value, { stream: true });

    // Each SSE message is on its own line, prefixed with "data: "
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice("data:".length).trim();
      if (payload === "[DONE]") return accumulated;

      try {
        const parsed = JSON.parse(payload) as { delta?: string };
        if (parsed.delta) {
          accumulated += parsed.delta;
          onChunk(parsed.delta);
        }
      } catch {
        // Ignore malformed SSE lines
      }
    }
  }

  return accumulated;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StartupRegistrationWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function StartupRegistrationWidget({
  profile,
  onGenerateRef,
}: StartupRegistrationWidgetProps) {
  // Local state for streamed content (updated progressively during streaming)
  const [streamedContent, setStreamedContent] = useState<string>("");

  const { state, generate } = useWidgetState();

  const handleGenerate = useCallback(async () => {
    // Reset streamed content before each generation
    setStreamedContent("");

    await generate(async () => {
      await streamRegistrationGuidance(profile, (chunk) => {
        // Update content progressively as chunks arrive
        setStreamedContent((prev) => prev + chunk);
      });
      // After streaming completes, useWidgetState will transition to "success"
    });
  }, [profile, generate]);

  // Register the generate handler with the parent (for Generate All)
  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Startup Registration Guidelines"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Pulls SSM-flavoured first steps for your structure and stage — edit the list before you file anything."
      idleButtonLabel="Draft checklist"
      regenerateLabel="Refresh checklist"
    >
      {/* Rendered when status === "success" */}
      <div className="whitespace-pre-wrap leading-relaxed">
        {streamedContent}
      </div>
    </WidgetCard>
  );
}
