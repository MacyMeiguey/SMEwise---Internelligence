/**
 * AnimatedCounter — counts up from 0 to target value with easing.
 * Use for KPIs, percentages, and amounts to make data feel dynamic.
 */

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  /** Target value to count up to */
  value: number;
  /** Duration of the animation in ms (default 1200) */
  duration?: number;
  /** Prefix string (e.g. "RM ") */
  prefix?: string;
  /** Suffix string (e.g. "%") */
  suffix?: string;
  /** Number of decimal places (default 0) */
  decimals?: number;
  /** Use locale formatting (default true) */
  locale?: boolean;
  /** CSS class for the number */
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  locale = true,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setDisplay(eased * value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const formatted = locale
    ? display.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display.toFixed(decimals);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
