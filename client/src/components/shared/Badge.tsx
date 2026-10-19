/**
 * Badge — compact status labels (slightly squared, not pill-everything).
 */

import { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1.5 font-medium rounded-md transition-colors duration-150';

  const variantStyles = {
    default: 'bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-500/20 dark:text-primary-200',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    error: 'bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const dotColors = {
    default: 'bg-neutral-500',
    primary: 'bg-primary-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-sky-500',
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
