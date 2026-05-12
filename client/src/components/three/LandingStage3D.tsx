/**
 * LandingStage3D — fixed full-viewport WebGL backdrop for the landing route.
 *
 * Lives behind every section of the landing page. Sections layer on top with
 * translucent dark backgrounds so the SME objects shimmer through as you scroll.
 *
 * Features:
 *   • Lazy-loads the real three.js scene (keeps initial JS lean).
 *   • Falls back to a static lavender gradient on weak / no-GL devices.
 *   • Respects `prefers-reduced-motion` (objects stop drifting, sparkles off).
 */

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useScrollProgress } from './useScrollProgress';

const LandingStage3DScene = lazy(() => import('./LandingStage3DScene'));

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

function detectLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  const cores =
    (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 2 || memory <= 2;
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

function StaticGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 motion-safe:animate-gradient-shift"
        style={{
          background:
            'radial-gradient(ellipse at 20% 25%, rgba(167,139,250,0.40), transparent 55%), radial-gradient(ellipse at 80% 15%, rgba(251,113,133,0.25), transparent 55%), radial-gradient(ellipse at 50% 85%, rgba(45,212,191,0.20), transparent 55%), #0a0a0a',
          backgroundSize: '300% 300%',
        }}
      />
    </div>
  );
}

export default function LandingStage3D() {
  const reduce = useReducedMotion();
  const scrollRef = useScrollProgress();
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSupports3D(detectWebGL() && !detectLowPower());
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      // The canvas is fixed and ignores pointer events so it never interferes
      // with the page content layered on top.
    >
      {/* Static gradient always renders for instant paint + GL fallback */}
      <StaticGradient />

      {supports3D && !failed && (
        <ErrorBoundary onError={() => setFailed(true)}>
          <Suspense fallback={null}>
            <LandingStage3DScene scrollRef={scrollRef} motion={!reduce} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Bottom-edge fade so content remains legible no matter where you scroll */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          /* Lighter scrim so section bands + scroll-driven 3D read through */
          background:
            'linear-gradient(to bottom, rgba(10,10,10,0.0) 0%, rgba(10,10,10,0.18) 45%, rgba(10,10,10,0.42) 100%)',
        }}
      />
    </div>
  );
}
