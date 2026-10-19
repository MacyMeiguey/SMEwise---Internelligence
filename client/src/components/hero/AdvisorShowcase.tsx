/**
 * AdvisorShowcase — "Meet your advisor" — dedicated landing section.
 *
 * Composition (large-screen):
 *   • LEFT  — the 3D mascot rendered at showcase size on a soft-glow stage.
 *   • RIGHT — three floating "question → reply" bubble cards, evenly staggered.
 *
 * The mascot toggles its `speaking` state on a slow interval so visitors see
 * the talk animation in passing without needing to interact.
 */

import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from '../three/useReducedMotion';

const ChatAvatar3DScene = lazy(() => import('../three/ChatAvatar3DScene'));

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

interface BoundaryProps {
  children: ReactNode;
  onError: () => void;
}

class ErrorBoundary extends Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const SAMPLE_CHATS = [
  {
    q: 'How should I price my nasi lemak?',
    a: 'Look at the 3 stalls near you in PJ — your set costs RM 4.20 to make, so RM 7–8 keeps a healthy 40% margin.',
    delay: 0,
  },
  {
    q: 'Which grant fits a 6-month-old café in JB?',
    a: 'TEKUN micro-credit + MARA Penjaja both accept early-stage F&B. I can outline what to prepare first.',
    delay: 200,
  },
  {
    q: 'What should I post on TikTok this week?',
    a: 'Tuesday lunch reveal + Thursday Q&A on “why we use kampung eggs”. Both stay on your brand voice.',
    delay: 400,
  },
] as const;

interface AdvisorShowcaseProps {
  onTryAdvisor?: () => void;
}

export default function AdvisorShowcase({ onTryAdvisor }: AdvisorShowcaseProps) {
  const reduce = useReducedMotion();
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [nodSignal, setNodSignal] = useState(0);
  const nodRef = useRef(0);

  useEffect(() => {
    setSupports3D(detectWebGL());
  }, []);

  // Cycle speaking / nodding so the avatar feels alive without user input
  useEffect(() => {
    if (reduce) return;
    const speakTimer = setInterval(() => setSpeaking((s) => !s), 3800);
    const nodTimer = setInterval(() => {
      nodRef.current += 1;
      setNodSignal(nodRef.current);
    }, 6100);
    return () => {
      clearInterval(speakTimer);
      clearInterval(nodTimer);
    };
  }, [reduce]);

  return (
    <section
      id="meet-advisor"
      aria-label="Meet your business advisor"
      className="relative border-b border-white/[0.08] overflow-hidden bg-[#07070b]/42 backdrop-blur-xl text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(167,139,250,0.32), transparent 50%), radial-gradient(circle at 85% 80%, rgba(124,58,237,0.32), transparent 55%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* LEFT — mascot stage */}
          <div className="lg:col-span-5 relative">
            <div
              className="relative aspect-square max-w-md mx-auto rounded-xl border border-white/[0.1] bg-gradient-to-br from-primary-950/30 via-neutral-900 to-[#07070b] overflow-hidden"
            >
              {/* glow under mascot */}
              <span
                className="pointer-events-none absolute inset-x-12 bottom-6 h-24 rounded-full bg-primary-500/30 blur-3xl"
                aria-hidden
              />
              {/* grid pattern */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                  maskImage:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, transparent 75%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, transparent 75%)',
                }}
              />

              {/* Status pill */}
              <span className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-100">
                <span className={`h-1.5 w-1.5 rounded-full ${speaking ? 'bg-success-500 motion-safe:animate-pulse' : 'bg-primary-300'}`} />
                {speaking ? 'Replying…' : 'Online'}
              </span>

              {/* Mascot canvas */}
              <div className="absolute inset-0">
                {supports3D !== false && !failed ? (
                  <ErrorBoundary onError={() => setFailed(true)}>
                    <Suspense fallback={null}>
                      {supports3D && (
                        <ChatAvatar3DScene speaking={speaking && !reduce} nodSignal={nodSignal} />
                      )}
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <FallbackMascot />
                )}
              </div>

              <span className="absolute bottom-4 left-4 right-4 z-20 text-center text-xs text-neutral-400">
                Your advisor remembers your profile, RM, and stage — every reply.
              </span>
            </div>
          </div>

          {/* RIGHT — header + floating chat cards */}
          <div className="lg:col-span-7 motion-safe:animate-fade-up">
            <p className="eyebrow text-primary-300 mb-3">Meet your advisor</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-white">
              Not a chatbot. An advisor that already{' '}
              <span className="text-primary-200">knows your business.</span>
            </h2>
            <p className="mt-5 text-base sm:text-lg text-neutral-300 max-w-xl leading-relaxed">
              Tell SMEwise about your shop once. From then on, every question is answered with your
              ringgit, your city, your stage in mind — not generic AI fluff.
            </p>

            <div className="mt-8 grid gap-4">
              {SAMPLE_CHATS.map(({ q, a, delay }) => (
                <div
                  key={q}
                className="rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md px-5 py-4 motion-safe:animate-fade-up"
                  style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
                >
                  <p className="text-sm font-semibold text-primary-200 flex items-start gap-2">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/20 text-primary-200 text-[10px] font-bold">
                      Q
                    </span>
                    {q}
                  </p>
                  <p className="mt-2 text-sm text-neutral-300 flex items-start gap-2 leading-relaxed">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-neutral-950 text-[10px] font-bold">
                      A
                    </span>
                    {a}
                  </p>
                </div>
              ))}
            </div>

            {onTryAdvisor && (
              <button
                type="button"
                onClick={onTryAdvisor}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-6 py-3 text-sm font-semibold text-white border border-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              >
                Try the advisor · free <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}

function FallbackMascot() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 64 64" width={180} height={180} aria-hidden>
        <path d="M8 60 C 18 46, 46 46, 56 60 Z" fill="#7c3aed" />
        <rect x="28" y="38" width="8" height="8" fill="#f0bfa6" />
        <circle cx="32" cy="28" r="14" fill="#fcd9b8" />
        <path d="M18 28 C 18 14, 46 14, 46 28 L 46 22 C 46 18, 18 18, 18 22 Z" fill="#1f1330" />
        <circle cx="26" cy="28" r="4" fill="none" stroke="#0f0f0f" strokeWidth="1.5" />
        <circle cx="38" cy="28" r="4" fill="none" stroke="#0f0f0f" strokeWidth="1.5" />
        <line x1="30" y1="28" x2="34" y2="28" stroke="#0f0f0f" strokeWidth="1.5" />
        <circle cx="26" cy="28" r="1.3" fill="#0f0f0f" />
        <circle cx="38" cy="28" r="1.3" fill="#0f0f0f" />
        <path d="M26 35 Q 32 39 38 35" stroke="#3b1f1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}
