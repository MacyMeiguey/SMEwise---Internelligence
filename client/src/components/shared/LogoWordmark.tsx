/**
 * LogoWordmark — pure-text rendering of the "SMEwise." wordmark.
 *
 * We render the logo as styled text instead of `/smewise-logo.png` so it sits
 * cleanly on any background (no PNG white halo) and stays crisp at any size.
 *
 * The final `.` is the lavender brand dot from the original logo.
 *
 * Usage:
 *   <LogoWordmark />                                  // light text, md size
 *   <LogoWordmark size="xl" variant="light" />        // splash
 *   <LogoWordmark size="lg" variant="dark" />         // workspace header
 */

import type { CSSProperties } from 'react';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Variant = 'light' | 'dark' | 'gradient';

interface LogoWordmarkProps {
  size?: Size;
  variant?: Variant;
  className?: string;
  /** Optional inline style overrides */
  style?: CSSProperties;
  /** Accessible label rendered as visually-hidden text (defaults to "SMEwise"). */
  label?: string;
}

const SIZE_MAP: Record<Size, string> = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl sm:text-4xl',
  xl: 'text-4xl sm:text-5xl',
};

const COLOR_MAP: Record<Variant, string> = {
  light:    'text-white',
  dark:     'text-neutral-950',
  gradient: 'bg-gradient-to-r from-white via-primary-200 to-accent-coral bg-clip-text text-transparent',
};

export default function LogoWordmark({
  size = 'md',
  variant = 'light',
  className = '',
  style,
  label = 'SMEwise',
}: LogoWordmarkProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex items-baseline font-extrabold tracking-[-0.03em] leading-none whitespace-nowrap ${SIZE_MAP[size]} ${COLOR_MAP[variant]} ${className}`}
      style={style}
    >
      <span aria-hidden>SMEwise</span>
      <span
        aria-hidden
        className={
          variant === 'gradient'
            ? 'text-accent-coral'
            : variant === 'dark'
              ? 'text-primary-500'
              : 'text-primary-400'
        }
      >
        .
      </span>
    </span>
  );
}
