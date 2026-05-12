/**
 * AIAssistantPanel — advisor with profile + current-focus context
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BusinessProfile, ChatMessage } from '../../types';
import { MessageCircle, Send, X, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import ChatAvatar3D from '../three/ChatAvatar3D';

const MAX_WORDS = 200;

function buildSystemPrompt(profile: BusinessProfile, focusLabel: string): string {
  const focus =
    focusLabel.trim() && focusLabel !== 'Overview'
      ? ` The owner is currently looking at: ${focusLabel}. Prioritise actionable advice for that area when it fits; still use the full profile as ground truth.`
      : ' The owner is on the high-level overview; keep guidance practical and stage-appropriate.';

  return (
    'You are SMEwise, a business advisor for Malaysian SMEs. You are not a lawyer or accountant; give general guidance and suggest professional help when needed.' +
    ' Business profile: ' +
    `Company: ${profile.companyName}. Industry: ${profile.industry}. City: ${profile.city}. ` +
    `Target customer: ${profile.targetCustomer}. Main goal: ${profile.mainGoal?.trim() || 'not specified'}. ` +
    `Funds available: RM ${profile.currentFunds.toLocaleString('en-MY')}. Stage: ${profile.businessStage}. Structure: ${profile.businessType}.` +
    focus +
    ` Keep replies under ${MAX_WORDS} words. Use RM, Malaysian examples where helpful, and short paragraphs.`
  );
}

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function streamBedrock(
  body: object,
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bedrock/converse/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data) as { delta?: string; error?: string };
        if (parsed.delta) onChunk(parsed.delta);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

export interface AIAssistantPanelProps {
  profile: BusinessProfile;
  currentSection?: string;
  /** Desktop-only collapse state. When omitted, the panel manages itself uncollapsed. */
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getSuggestedPrompts(focus: string): string[] {
  const f = focus.trim();
  if (f === 'Financial Planning') {
    return [
      'How should I prioritise spending with my current funds?',
      'What loan or grant angles are worth exploring first?',
      'What numbers should I track weekly at my stage?',
    ];
  }
  if (f === 'Pricing Strategy') {
    return [
      'How do I sanity-check prices for my market without undercutting myself?',
      'What should I document before changing prices?',
      'How do I explain a price increase to customers?',
    ];
  }
  if (f === 'Marketing') {
    return [
      'What is a simple 30-day marketing plan for my audience?',
      'Which channels usually work first for a business like mine?',
      'How do I write a clear offer in one paragraph?',
    ];
  }
  if (f === 'Operations') {
    return [
      'What should I register or clarify first as I formalise operations?',
      'How do I think about location trade-offs in my city?',
      'What operational risks should I review this quarter?',
    ];
  }
  if (f === 'Owner Tools') {
    return [
      'What should I package into a one-page brief for a bank or investor?',
      'How do I summarise traction for a grant application?',
      'What should I save whenever I generate outputs from tools?',
    ];
  }
  return [
    'What should I focus on in the next 30 days?',
    'What is the biggest risk to address first for my stage?',
    'How do I turn my goal into next-week actions?',
  ];
}

function buildWelcomeMessage(profile: BusinessProfile): ChatMessage {
  return {
    id: generateId(),
    role: 'assistant',
    content:
      `Hi — I’m here for ${profile.companyName} (${profile.city}). I use the same details as your summary and generators, ` +
      `so you don’t need to repeat yourself. Ask anything in plain language, or tap a suggested question. ` +
      `When you open a toolbox section, I’ll lean toward that topic — see “Answering for” above.`,
    timestamp: Date.now(),
  };
}

export default function AIAssistantPanel({
  profile,
  currentSection = 'Overview',
  isCollapsed = false,
  onToggleCollapse,
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage(profile)]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const focusLabel = currentSection?.trim() || 'Overview';
  const suggestedPrompts = getSuggestedPrompts(focusLabel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isTyping) return;

      setInputText('');

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };

      const assistantId = generateId();
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setIsTyping(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const contextualHint =
        focusLabel && focusLabel !== 'Overview'
          ? ` [Screen context: the user is focused on "${focusLabel}".]`
          : '';

      try {
        let accumulated = '';

        await streamBedrock(
          {
            systemPrompt: buildSystemPrompt(profile, focusLabel),
            userMessage: trimmed + contextualHint,
            temperature: 0.5,
          },
          (delta) => {
            accumulated += delta;
            const display = trimToWordLimit(accumulated, MAX_WORDS);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: display } : m))
            );
          },
          controller.signal
        );

        const finalContent = trimToWordLimit(accumulated, MAX_WORDS);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: finalContent } : m))
        );
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;

        const errorContent =
          "__ERROR__: Sorry, I couldn't get a response right now. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: errorContent } : m))
        );
      } finally {
        setIsTyping(false);
      }
    },
    [profile, isTyping, focusLabel]
  );

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  const userMessageCount = messages.filter((m) => m.role === 'user').length;

  return (
    <>
      {/* Mobile FAB with mini 3D mascot */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-[5.25rem] right-4 sm:right-5 z-40 flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-2xl pl-1.5 pr-3 py-1.5 border-2 border-neutral-950"
        style={{ boxShadow: '3px 3px 0 0 #c4b5fd' }}
        aria-label="Open business advisor — same details as your summary"
      >
        <ChatAvatar3D speaking={isTyping} nodSignal={userMessageCount} size={40} />
        <span className="flex flex-col items-start leading-tight pr-1">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-primary-200">Advisor</span>
          <span className="text-xs font-bold">Ask anything</span>
        </span>
        <MessageCircle size={18} strokeWidth={2.2} className="opacity-70" aria-hidden />
      </button>

      {/* Mobile sheet */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-200 rounded-t-2xl max-h-[85vh] flex flex-col dark:bg-neutral-900 dark:border-white/[0.10]"
            onClick={(e) => e.stopPropagation()}
          >
            <AssistantContent
              profile={profile}
              focusLabel={focusLabel}
              messages={messages}
              inputText={inputText}
              setInputText={setInputText}
              isTyping={isTyping}
              sendMessage={sendMessage}
              suggestedPrompts={suggestedPrompts}
              handleSuggestedPrompt={handleSuggestedPrompt}
              messagesEndRef={messagesEndRef}
              showSuggested={userMessageCount === 0}
              nodSignal={userMessageCount}
              onClose={() => setIsOpen(false)}
              isMobile
            />
          </div>
        </div>
      )}

      {/* Desktop — collapsed launcher (rail edge) */}
      {isCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed top-24 right-4 z-40 flex-col items-center gap-2 bg-white hover:bg-neutral-50 text-neutral-900 rounded-2xl border border-neutral-200 px-2.5 py-3 group transition-colors dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-white dark:border-white/[0.12]"
          style={{ boxShadow: '0 0 0 1px rgba(167,139,250,0.15), 0 8px 24px rgba(0,0,0,0.12)', transitionProperty: 'color, background-color, border-color' }}
          aria-label="Open business advisor"
          aria-expanded={false}
          aria-controls="ai-assistant-panel"
        >
          <ChatAvatar3D speaking={isTyping} nodSignal={userMessageCount} size={48} />
          <span className="flex flex-col items-center leading-tight gap-0.5 mt-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-200">
              Advisor
            </span>
            <span className="text-[11px] font-semibold text-neutral-800 dark:text-white">
              {isTyping ? 'Thinking…' : 'Ask'}
            </span>
          </span>
          <ChevronsLeft className="h-4 w-4 opacity-70 group-hover:opacity-100 mt-1" aria-hidden />
        </button>
      )}

      {/* Desktop — full panel */}
      {!isCollapsed && (
        <div
          id="ai-assistant-panel"
          className="hidden lg:flex fixed top-20 right-5 bottom-6 w-[min(100%,22rem)] xl:w-96 flex-col z-40 rounded-2xl border bg-white border-neutral-200 shadow-[0_24px_48px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:border-white/[0.10] dark:shadow-[0_24px_48px_rgba(0,0,0,0.6)]"
          role="complementary"
          aria-label="Business advisor"
        >
          <AssistantContent
            profile={profile}
            focusLabel={focusLabel}
            messages={messages}
            inputText={inputText}
            setInputText={setInputText}
            isTyping={isTyping}
            sendMessage={sendMessage}
            suggestedPrompts={suggestedPrompts}
            handleSuggestedPrompt={handleSuggestedPrompt}
            messagesEndRef={messagesEndRef}
            showSuggested={userMessageCount === 0}
            nodSignal={userMessageCount}
            onCollapse={onToggleCollapse}
          />
        </div>
      )}
    </>
  );
}

interface AssistantContentProps {
  profile: BusinessProfile;
  focusLabel: string;
  messages: ChatMessage[];
  inputText: string;
  setInputText: (text: string) => void;
  isTyping: boolean;
  sendMessage: (text: string) => void;
  suggestedPrompts: string[];
  handleSuggestedPrompt: (prompt: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  showSuggested: boolean;
  onClose?: () => void;
  /** Desktop collapse handler — shows the minimize button on the right when provided. */
  onCollapse?: () => void;
  /** Increments when the user sends a message; drives the avatar nod. */
  nodSignal?: number;
  isMobile?: boolean;
}

function AssistantContent({
  profile,
  focusLabel,
  messages,
  inputText,
  setInputText,
  isTyping,
  sendMessage,
  suggestedPrompts,
  handleSuggestedPrompt,
  messagesEndRef,
  showSuggested,
  onClose,
  onCollapse,
  nodSignal,
  isMobile,
}: AssistantContentProps) {
  const focusDisplay =
    !focusLabel || focusLabel === 'Overview' ? 'Your summary' : focusLabel;

  return (
    <>
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-neutral-200 bg-neutral-50/80 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="flex items-center gap-3 min-w-0">
          <ChatAvatar3D speaking={isTyping} nodSignal={nodSignal} size={52} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-2 dark:text-white">
              Business advisor
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  isTyping
                    ? 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:border-primary-700/50'
                    : 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-white/[0.06] dark:text-primary-300 dark:border-primary-500/25'
                }`}
                aria-live="polite"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isTyping ? 'bg-primary-400 animate-pulse' : 'bg-primary-400'}`} />
                {isTyping ? 'Thinking…' : 'Online'}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 truncate mt-0.5">For {profile.companyName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isMobile && onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="text-neutral-500 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors dark:hover:text-neutral-200 dark:hover:bg-white/[0.07]"
              aria-label="Collapse advisor"
              aria-expanded={true}
              aria-controls="ai-assistant-panel"
              title="Collapse"
            >
              <ChevronsRight size={18} />
            </button>
          )}
          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-800 p-1 rounded-lg hover:bg-neutral-100 transition-colors dark:hover:text-neutral-200 dark:hover:bg-white/[0.07]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Context band */}
      <div className="px-4 sm:px-5 py-2 border-b border-neutral-200 bg-neutral-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-xs text-neutral-700 dark:text-neutral-300">
          <span className="font-semibold text-neutral-900 dark:text-neutral-200">Answering for:</span> {focusDisplay}
        </p>
        <p className="mt-0.5 text-[11px] text-neutral-500 leading-snug">
          Context updates as you open toolkit sections.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        {showSuggested && !isTyping && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Try asking</p>
            <div className="flex flex-col gap-2 mt-2">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="text-left px-3 py-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-sm text-neutral-800 hover:bg-neutral-200/80 hover:text-neutral-950 hover:border-neutral-300 transition-all dark:bg-white/[0.05] dark:border-white/[0.08] dark:text-neutral-300 dark:hover:bg-white/[0.09] dark:hover:text-white dark:hover:border-white/[0.14]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 sm:px-5 py-4 border-t border-neutral-200 bg-neutral-50/50 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(inputText);
              }
            }}
            placeholder="Ask about your business…"
            disabled={isTyping}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400/50 transition-all dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-white"
          />
          <button
            type="button"
            onClick={() => sendMessage(inputText)}
            disabled={isTyping || !inputText.trim()}
            className="shrink-0 w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center border border-primary-500/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.content.startsWith('__ERROR__:');
  const displayContent = isError ? message.content.slice('__ERROR__:'.length).trim() : message.content;

  const time = new Date(message.timestamp).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed max-w-[92%] whitespace-pre-wrap ${
          isUser
            ? 'bg-primary-600/70 text-white border border-primary-500/40'
            : isError
            ? 'bg-red-900/30 border border-red-700/40 text-red-300'
            : 'bg-neutral-100 border border-neutral-200 text-neutral-800 dark:bg-white/[0.07] dark:border-white/[0.08] dark:text-neutral-200'
        }`}
      >
        {displayContent}
      </div>
      <time className="text-[10px] text-neutral-600 px-1">{time}</time>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-3 rounded-xl bg-neutral-100 border border-neutral-200 self-start dark:bg-white/[0.07] dark:border-white/[0.08]">
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse [animation-delay:150ms]" />
      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}
