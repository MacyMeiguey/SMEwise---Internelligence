/**
 * AIAssistantPanel — advisor with profile + current-focus context
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { BusinessProfile, ChatMessage } from '../../types';
import type { DashboardLiveContext } from '../Dashboard';
import { MessageCircle, Send, X, ChevronsRight, Mic } from 'lucide-react';
import { API_BASE } from '../../lib/api';
import { getAllWidgetCacheEntries } from '../../utils/widgetCache';
import ChatAvatar3D from '../three/ChatAvatar3D';

const MAX_WORDS = 200;

function trimToWordLimit(text: string, limit: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build the structured context payload sent alongside the user's question.
 * The advisor agent uses this to ground its answer in:
 *   - the full BusinessProfile (every field the user filled in)
 *   - every cached widget result (Fund Allocation, Risk, Marketing Strategy, …)
 *   - in-memory dashboard state that hasn't been cached (pricing inputs,
 *     competitor analysis still in flight, marketing plan JSON, etc.)
 *   - the section the user is currently looking at
 */
function buildAdvisorContext(
  profile: BusinessProfile,
  focusLabel: string,
  liveContext: DashboardLiveContext | null,
): Record<string, unknown> {
  return {
    currentSection: focusLabel,
    profile,
    cachedWidgetOutputs: getAllWidgetCacheEntries(),
    ...(liveContext ? { liveDashboardState: liveContext } : {}),
  };
}

/**
 * Stream the assistant agent's reply via the /api/bedrock/assistant SSE
 * endpoint. The wire format mirrors /converse/stream, so chunks arrive as
 * `data: {"delta":"..."}` lines and the stream terminates with `data: [DONE]`.
 */
async function streamAssistant(
  body: { message: string; context: Record<string, unknown>; sessionId: string },
  onChunk: (delta: string) => void,
  onError: (message: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/bedrock/assistant`, {
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
        else if (parsed.error) onError(parsed.error);
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
  /**
   * Live (non-cached) Dashboard state — pricing inputs, in-flight competitor
   * analysis, smart pricing result, marketing plan JSON, current budget
   * allocation. Forwarded to the agent so it can answer with awareness of
   * what the user is currently working on.
   */
  liveContext?: DashboardLiveContext | null;
  /**
   * Reports the current panel width (px) so the host can adjust main content
   * padding. Fires on mount and whenever the user resizes.
   */
  onWidthChange?: (widthPx: number) => void;
}

const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 700;
const DEFAULT_PANEL_WIDTH = 384; // 24rem

function loadPanelWidth(): number {
  try {
    const stored = localStorage.getItem('smewise:assistant-width');
    if (stored) {
      const n = parseInt(stored, 10);
      if (n >= MIN_PANEL_WIDTH && n <= MAX_PANEL_WIDTH) return n;
    }
  } catch { /* ignore */ }
  return DEFAULT_PANEL_WIDTH;
}

function savePanelWidth(w: number): void {
  try { localStorage.setItem('smewise:assistant-width', String(w)); }
  catch { /* ignore */ }
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
  liveContext = null,
  onWidthChange,
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage(profile)]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // One Bedrock agent session per chat lifetime so the agent can keep memory
  // of prior turns without us repeating it ourselves.
  const sessionIdRef = useRef<string>(generateId());

  // ── Resizable width (desktop only) ──
  const [panelWidth, setPanelWidth] = useState<number>(loadPanelWidth);
  const isDraggingRef = useRef(false);

  // Report width to host on mount and whenever it changes.
  useEffect(() => {
    if (!isCollapsed) onWidthChange?.(panelWidth);
  }, [panelWidth, isCollapsed, onWidthChange]);

  // Drag-to-resize handler (left edge of the panel).
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Dragging left → wider panel (panel is right-anchored).
      const delta = startX - ev.clientX;
      const next = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + delta));
      setPanelWidth(next);
    };

    const onUp = () => {
      isDraggingRef.current = false;
      savePanelWidth(panelWidth);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  // Persist width on change (debounced via the mouseup handler above, but
  // also save when the component unmounts mid-drag).
  useEffect(() => {
    return () => { savePanelWidth(panelWidth); };
  }, [panelWidth]);

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

      try {
        let accumulated = '';

        await streamAssistant(
          {
            message: trimmed,
            context: buildAdvisorContext(profile, focusLabel, liveContext),
            sessionId: sessionIdRef.current,
          },
          (delta) => {
            accumulated += delta;
            const display = trimToWordLimit(accumulated, MAX_WORDS);
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: display } : m))
            );
          },
          (errorMessage) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: `__ERROR__: ${errorMessage}` } : m,
              ),
            );
          },
          controller.signal,
        );

        const finalContent = trimToWordLimit(accumulated, MAX_WORDS);
        // Don't overwrite an error message we may have set above.
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m;
            if (m.content.startsWith('__ERROR__:')) return m;
            return { ...m, content: finalContent };
          }),
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
    [profile, isTyping, focusLabel, liveContext]
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

      {/* Desktop — collapsed launcher at bottom-right with floating animation */}
      {isCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col items-center gap-1 rounded-2xl px-2 py-2 group transition-all motion-safe:animate-hero-float"
          style={{ transitionProperty: 'color, background-color, border-color' }}
          aria-label="Open business advisor"
          aria-expanded={false}
          aria-controls="ai-assistant-panel"
        >
          {/* Pulse ring when typing */}
          {isTyping && (
            <span className="absolute inset-2 rounded-full border-2 border-primary-400 animate-ping opacity-30" />
          )}
          <ChatAvatar3D speaking={isTyping} nodSignal={userMessageCount} size={72} borderless />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-200 opacity-0 group-hover:opacity-100 transition-opacity">
            {isTyping ? 'Thinking…' : 'Ask me'}
          </span>

          {/* Speech bubble hint */}
          {!isTyping && userMessageCount === 0 && (
            <div className="absolute -left-36 bottom-12 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <p className="text-xs text-neutral-700 dark:text-neutral-200 whitespace-nowrap font-medium">💬 Ask me anything!</p>
              <div className="absolute right-[-6px] bottom-3 w-3 h-3 bg-white dark:bg-neutral-800 border-r border-t border-neutral-200 dark:border-white/10 rotate-45" />
            </div>
          )}
        </button>
      )}

      {/* Desktop — full panel */}
      {!isCollapsed && (
        <div
          id="ai-assistant-panel"
          className="hidden lg:flex fixed top-20 right-5 bottom-6 flex-col z-40 rounded-2xl border bg-white border-neutral-200 shadow-[0_24px_48px_rgba(15,23,42,0.08)] dark:bg-neutral-900 dark:border-white/[0.10] dark:shadow-[0_24px_48px_rgba(0,0,0,0.6)]"
          style={{ width: `${panelWidth}px` }}
          role="complementary"
          aria-label="Business advisor"
        >
          {/* Drag handle — left edge */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-50 group"
            aria-label="Resize advisor panel"
            role="separator"
            aria-orientation="vertical"
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-neutral-600" />
          </div>

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
          <VoiceInputButton onTranscript={(text) => sendMessage(text)} disabled={isTyping} />
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

/* ─── Voice Input Button ───────────────────────────────────────────────────── */

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  const supportsVoice = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const toggleListening = () => {
    if (!supportsVoice) return;

    if (isListening) {
      (recognitionRef.current as { stop: () => void } | null)?.stop();
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-MY';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: { results: { 0: { 0: { transcript: string } } } }) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border transition-all relative overflow-hidden ${
        isListening
          ? 'bg-red-500 hover:bg-red-400 text-white border-red-400/50 shadow-lg shadow-red-500/30'
          : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/10 dark:border-white/[0.10]'
      } disabled:opacity-30 disabled:pointer-events-none`}
      aria-label={isListening ? 'Stop listening' : 'Voice input'}
      title={supportsVoice ? (isListening ? 'Tap to stop' : 'Tap to speak') : 'Voice not supported in this browser'}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-40" />
      )}
      <Mic size={16} className={isListening ? 'animate-pulse' : ''} />
    </button>
  );
}
