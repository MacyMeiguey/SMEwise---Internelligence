/**
 * LogoWordmark — text "SMEwise." with optional filled BrandMark tile.
 */

import type { CSSProperties } from 'react';
import BrandMark from './BrandMark';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Variant = 'light' | 'dark' | 'gradient';

interface LogoWordmarkProps {
  size?: Size;
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
  label?: string;
  /** Show the filled-S mark next to the wordmark (header chrome). */
  showMark?: boolean;
}

const SIZE_MAP: Record<Size, string> = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl sm:text-3xl',
  xl: 'text-3xl sm:text-4xl',
};

const MARK_SIZE: Record<Size, 'xs' | 'sm' | 'md' | 'lg'> = {
  xs: 'xs',
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

const COLOR_MAP: Record<Variant, string> = {
  light: 'text-white',
  dark: 'text-neutral-950',
  gradient: 'bg-gradient-to-r from-white via-primary-200 to-accent-coral bg-clip-text text-transparent',
};

export default function LogoWordmark({
  size = 'md',
  variant = 'light',
  className = '',
  style,
  label = 'SMEwise',
  showMark = false,
}: LogoWordmarkProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-center gap-2 font-extrabold tracking-[-0.03em] leading-none whitespace-nowrap ${SIZE_MAP[size]} ${COLOR_MAP[variant]} ${className}`}
      style={style}
    >
      {showMark && <BrandMark size={MARK_SIZE[size]} />}
      <span aria-hidden className="inline-flex items-baseline">
        SMEwise
        <span
          className={
            variant === 'gradient'
              ? 'text-accent-coral'
              : variant === 'dark'
                ? 'text-primary-600'
                : 'text-primary-400'
          }
        >
          .
        </span>
      </span>
    </span>
  );
}
