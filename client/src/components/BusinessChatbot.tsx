/**
 * BusinessChatbot — Owner Tools Section
 * A streaming AI chatbot personalised to the user's business profile.
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7
 *
 * Props:
 *   profile — the submitted BusinessProfile
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { BusinessProfile, ChatMessage } from "../types";
import { API_BASE } from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_WORDS = 200;

function buildSystemPrompt(profile: BusinessProfile): string {
  return (
    "You are SMEwise, a personalised AI business advisor for Malaysian SMEs. " +
    "You already know this business: " +
    `Company: ${profile.companyName}, ` +
    `Industry: ${profile.industry}, ` +
    `City: ${profile.city}, ` +
    `Target Customer: ${profile.targetCustomer}, ` +
    `Main Goal: ${profile.mainGoal || "Not specified"}, ` +
    `Current Funds: RM ${profile.currentFunds.toLocaleString()}, ` +
    `Business Stage: ${profile.businessStage}, ` +
    `Business Type: ${profile.businessType}. ` +
    "Keep responses under 200 words. Use Malaysian context, RM currency, and local platforms."
  );
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(" ") + "…";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── SSE streaming helper ─────────────────────────────────────────────────────

async function streamBedrock(
  body: object,
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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
        const parsed = JSON.parse(data) as { delta?: string; error?: string };
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-primary-50 border-2 border-primary-200 self-start"
      role="status"
      aria-label="SMEwise is typing"
    >
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.content.startsWith("__ERROR__:");
  const displayContent = isError
    ? message.content.slice("__ERROR__:".length).trim()
    : message.content;

  const time = new Date(message.timestamp).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`px-4 py-3 rounded-xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap border-2
          ${
            isUser
              ? "bg-neutral-950 text-white border-neutral-950"
              : isError
              ? "bg-error-50 border-error-300 text-error-800"
              : "bg-primary-50 border-primary-200 text-neutral-900"
          }`}
      >
        {displayContent}
        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 block text-xs text-red-700 underline hover:text-red-900
                       focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
            aria-label="Retry last message"
          >
            Retry
          </button>
        )}
      </div>
      <time
        className="text-xs text-neutral-400 px-1"
        dateTime={new Date(message.timestamp).toISOString()}
      >
        {time}
      </time>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BusinessChatbotProps {
  profile: BusinessProfile;
}

export default function BusinessChatbot({ profile }: BusinessChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isTyping) return;

      setLastUserMessage(trimmed);
      setInputText("");

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      // Placeholder for assistant response
      const assistantId = generateId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsTyping(true);

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        let accumulated = "";

        await streamBedrock(
          {
            systemPrompt: buildSystemPrompt(profile),
            userMessage: trimmed,
            temperature: 0.5,
          },
          (delta) => {
            accumulated += delta;
            const display = trimToWordLimit(accumulated, MAX_WORDS);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: display } : m
              )
            );
          },
          controller.signal
        );

        // Final trim after streaming completes
        const finalContent = trimToWordLimit(accumulated, MAX_WORDS);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: finalContent } : m
          )
        );
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorContent =
          "__ERROR__: Sorry, I couldn't get a response right now. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: errorContent } : m
          )
        );
      } finally {
        setIsTyping(false);
      }
    },
    [profile, isTyping]
  );

  const handleRetry = useCallback(() => {
    if (!lastUserMessage) return;
    // Remove the last error message and resend
    setMessages((prev) => {
      const lastIdx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (lastIdx === -1) return prev;
      const realIdx = prev.length - 1 - lastIdx;
      return prev.slice(0, realIdx);
    });
    sendMessage(lastUserMessage);
  }, [lastUserMessage, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputText);
      }
    },
    [inputText, sendMessage]
  );

  return (
    <article
      className="flex flex-col rounded-xl border-2 border-neutral-950 bg-white"
      style={{ boxShadow: '3px 3px 0 0 #0f0f0f' }}
      aria-label="SMEwise Business Chatbot"
    >
      {/* ── Header ── */}
      <header className="flex items-center gap-3 border-b-2 border-neutral-950 px-5 py-4 bg-primary-50">
        <div className="w-9 h-9 rounded-xl bg-neutral-950 border-2 border-neutral-950 flex items-center justify-center shrink-0 text-white text-sm font-bold" aria-hidden>
          S
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-950 tracking-tight">Inline advisor</h3>
          <p className="text-xs text-neutral-600">Owner Tools · uses same profile</p>
        </div>
      </header>

      {/* ── Message history ── */}
      <div
        className="flex flex-col gap-3 overflow-y-auto px-4 sm:px-5 py-4 min-h-[260px] max-h-[420px] bg-neutral-50"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-sm text-neutral-600 text-center mt-8 leading-relaxed px-2">
            Ask about strategy, cash flow, or operations. The main advisor panel on the right also uses your
            profile — this chat is here if you want a second thread inside Owner Tools.
          </p>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRetry={
              msg.role === "assistant" && msg.content.startsWith("__ERROR__:")
                ? handleRetry
                : undefined
            }
          />
        ))}

        {isTyping && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="border-t-2 border-neutral-950 px-4 sm:px-5 py-4 bg-white">
        <div className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business…"
            disabled={isTyping}
            className="input-field flex-1 min-w-0 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Type your message"
          />
          <button
            type="button"
            onClick={() => sendMessage(inputText)}
            disabled={isTyping || !inputText.trim()}
            className="btn-primary shrink-0 px-4 py-2.5 rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </article>
  );
}
