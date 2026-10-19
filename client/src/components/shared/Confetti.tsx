/**
 * Confetti — lightweight CSS-only confetti burst.
 * Renders 40 particles that scatter and fade. Auto-removes after animation.
 */

import { useEffect, useState } from 'react';

const COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#fbbf24', '#34d399', '#fb7185', '#14b8a6'];
const PARTICLE_COUNT = 40;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  velocity: number;
  spin: number;
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 10,
    y: 50,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 6,
    angle: (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5,
    velocity: 60 + Math.random() * 80,
    spin: (Math.random() - 0.5) * 720,
  }));
}

interface ConfettiProps {
  /** When true, fires the confetti burst */
  active: boolean;
  /** Called when animation completes */
  onDone?: () => void;
}

export default function Confetti({ active, onDone }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    setParticles(createParticles());
    const timer = setTimeout(() => {
      setParticles([]);
      onDone?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [active, onDone]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            animation: `confetti-fall 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            animationDelay: `${Math.random() * 0.15}s`,
            ['--confetti-x' as string]: `${Math.cos(p.angle) * p.velocity}px`,
            ['--confetti-y' as string]: `${-Math.abs(Math.sin(p.angle) * p.velocity * 0.8) + 200}px`,
            ['--confetti-spin' as string]: `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}
