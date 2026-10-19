/**
 * ChatAvatar3D — small 3D mascot for the advisor panel header.
 *
 * Code-split so the chat panel keeps working even if three.js isn't loaded yet.
 * Falls back to a static lavender avatar disc on WebGL-less / low-power devices.
 */

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

const ChatAvatar3DScene = lazy(() => import('./ChatAvatar3DScene'));

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

interface ChatAvatar3DProps {
  /** True while assistant is generating a reply — drives mouth/halo animation */
  speaking?: boolean;
  /**
   * Increment this whenever the user sends a message — the mascot will nod
   * once in acknowledgement. Anything that changes the value (counter,
   * timestamp, etc.) works.
   */
  nodSignal?: number;
  /** Pixel size of the square avatar; defaults to 56 */
  size?: number;
  className?: string;
  /** When true, removes border/background so the avatar floats transparently */
  borderless?: boolean;
}

function StaticAvatar({ size, speaking }: { size: number; speaking: boolean }) {
  // SVG mirror of the 3D mascot: round face, glasses, smile, lavender shirt collar.
  return (
    <div
      className="relative grid place-items-center rounded-xl border border-primary-300/60 bg-gradient-to-br from-primary-100 to-primary-300 shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" width={size * 0.9} height={size * 0.9}>
        {/* Shoulders */}
        <path d="M8 60 C 18 46, 46 46, 56 60 Z" fill="#7c3aed" />
        <path d="M28 52 L32 60 L36 52 Z" fill="#5b21b6" />
        {/* Neck */}
        <rect x="28" y="38" width="8" height="8" fill="#f0bfa6" />
        {/* Head */}
        <circle cx="32" cy="28" r="14" fill="#fcd9b8" />
        {/* Hair */}
        <path d="M18 28 C 18 14, 46 14, 46 28 L 46 22 C 46 18, 18 18, 18 22 Z" fill="#1f1330" />
        {/* Cheeks */}
        <circle cx="22" cy="32" r="2.4" fill="#f4a8a0" opacity="0.7" />
        <circle cx="42" cy="32" r="2.4" fill="#f4a8a0" opacity="0.7" />
        {/* Glasses */}
        <circle cx="26" cy="28" r="4" fill="none" stroke="#0f0f0f" strokeWidth="1.5" />
        <circle cx="38" cy="28" r="4" fill="none" stroke="#0f0f0f" strokeWidth="1.5" />
        <line x1="30" y1="28" x2="34" y2="28" stroke="#0f0f0f" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="26" cy="28" r="1.3" fill="#0f0f0f" />
        <circle cx="38" cy="28" r="1.3" fill="#0f0f0f" />
        {/* Smile */}
        <path d="M26 35 Q 32 39 38 35" stroke="#3b1f1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
      <span
        className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${speaking ? 'bg-success-500 motion-safe:animate-pulse' : 'bg-primary-300'}`}
      />
    </div>
  );
}

export default function ChatAvatar3D({
  speaking = false,
  nodSignal = 0,
  size = 56,
  className = '',
  borderless = false,
}: ChatAvatar3DProps) {
  const reduce = useReducedMotion();
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSupports3D(detectWebGL());
  }, []);

  if (supports3D === false || failed || reduce) {
    return (
      <div className={className}>
        <StaticAvatar size={size} speaking={speaking} />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 ${borderless ? 'overflow-visible' : 'rounded-xl border border-primary-500/40 bg-neutral-950 overflow-hidden shadow-sm'} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <ErrorBoundary onError={() => setFailed(true)}>
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-primary-600">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            </div>
          }
        >
          {supports3D && <ChatAvatar3DScene speaking={speaking} nodSignal={nodSignal} />}
        </Suspense>
      </ErrorBoundary>
      {!borderless && (
        <span
          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${speaking ? 'bg-success-500 motion-safe:animate-pulse' : 'bg-primary-300'}`}
        />
      )}
    </div>
  );
}
