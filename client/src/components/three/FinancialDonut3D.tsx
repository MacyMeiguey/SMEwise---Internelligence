/**
 * FinancialDonut3D — lazy-loaded 3D donut chart with WebGL fallback.
 * Shows stunning 3D visualization on capable devices, falls back to 2D on others.
 */

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';
import type { Segment } from './FinancialDonut3DScene';

const FinancialDonut3DScene = lazy(() => import('./FinancialDonut3DScene'));

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

interface BoundaryProps { children: ReactNode; onError: () => void; }
class ErrorBoundary extends Component<BoundaryProps, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() { this.props.onError(); }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface FinancialDonut3DProps {
  segments: Segment[];
  height?: number;
  className?: string;
}

export default function FinancialDonut3D({ segments, height = 400, className = '' }: FinancialDonut3DProps) {
  const reduce = useReducedMotion();
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSupports3D(detectWebGL());
  }, []);

  // Show loading state while checking WebGL support
  if (supports3D === null) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-950/60 to-primary-900/30 ${className}`} style={{ height }}>
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary-400 border-t-transparent animate-spin"/>
            <span className="text-sm text-primary-300">Loading 3D visualization...</span>
          </div>
        </div>
      </div>
    );
  }

  // Fall back to message if 3D not supported
  if (supports3D === false || failed || reduce) {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-950/60 to-primary-900/30 border border-primary-500/20 ${className}`} style={{ height }}>
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm text-primary-300">3D visualization not available on this device</p>
            <p className="text-xs text-primary-400 mt-2">View on desktop for interactive 3D chart</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0a0818] to-[#1a0f35] border border-primary-500/20 shadow-2xl shadow-primary-950/50 ${className}`}
      style={{ height }}
    >
      <ErrorBoundary onError={() => setFailed(true)}>
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-primary-950/60">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary-400 border-t-transparent animate-spin"/>
                <span className="text-sm text-primary-300">Rendering 3D chart...</span>
              </div>
            </div>
          }
        >
          {supports3D && <FinancialDonut3DScene segments={segments}/>}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export type { Segment };
