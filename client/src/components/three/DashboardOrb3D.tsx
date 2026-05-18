/**
 * DashboardOrb3D — lazy-loaded 3D section orb for workspace section headers.
 * Falls back gracefully on low-power / no-WebGL devices.
 * Each section gets a unique 3D object that slowly rotates and pulses.
 */

import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from './useReducedMotion';

const DashboardOrb3DScene = lazy(() => import('./DashboardOrb3DScene'));

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch {
    return false;
  }
}

function detectLowPower(): boolean {
  if (typeof window === 'undefined') return false;
  const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 2 || memory <= 2;
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

/* Static SVG fallback — unique per section */
const FALLBACK_ICONS: Record<string, string> = {
  'Operations': '🏢',
  'Financial Planning': '📊',
  'Pricing Strategy': '🏷️',
  'Marketing': '📣',
  'Owner Tools': '📋',
};

function StaticFallback({ section }: { section: string }) {
  return (
    <div className="w-full h-full grid place-items-center rounded-2xl bg-gradient-to-br from-primary-950/60 to-primary-900/30 border border-primary-500/20">
      <span className="text-4xl" role="img" aria-hidden>{FALLBACK_ICONS[section] ?? '✦'}</span>
    </div>
  );
}

export interface DashboardOrb3DProps {
  section: string;
  /** px size of the square canvas; defaults to 140 */
  size?: number;
  className?: string;
}

export default function DashboardOrb3D({ section, size = 140, className = '' }: DashboardOrb3DProps) {
  const reduce = useReducedMotion();
  const [supports3D, setSupports3D] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSupports3D(detectWebGL() && !detectLowPower());
  }, []);

  if (supports3D === false || failed || reduce) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <StaticFallback section={section}/>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#0a0818] border border-primary-500/20 shadow-lg shadow-primary-950/50 shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <ErrorBoundary onError={() => setFailed(true)}>
        <Suspense
          fallback={
            <div className="absolute inset-0 grid place-items-center bg-primary-950/60">
              <span className="h-3 w-3 rounded-full bg-primary-400 animate-ping"/>
            </div>
          }
        >
          {supports3D && <DashboardOrb3DScene section={section}/>}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
