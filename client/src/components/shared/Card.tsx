/**
 * Card — hairline border surfaces (Linear-style), not heavy bordered stacks.
 */

import { HTMLAttributes, forwardRef } from 'react';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hover = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-xl transition-all duration-200';

    const variantStyles = {
      default:
        'bg-white border border-neutral-200/90 dark:bg-white/[0.03] dark:border-white/[0.08]',
      elevated:
        'bg-white border border-neutral-200 shadow-subtle dark:bg-white/[0.04] dark:border-white/[0.1] dark:shadow-none',
      bordered:
        'bg-white border border-neutral-300 dark:bg-transparent dark:border-white/[0.12]',
      glass:
        'bg-white/80 backdrop-blur-md border border-neutral-200/80 dark:bg-white/[0.06] dark:border-white/[0.1]',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-7',
    };

    const hoverStyles = hover
      ? 'hover:border-primary-300/70 hover:shadow-sm cursor-pointer dark:hover:border-primary-400/40'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-base font-semibold tracking-tight text-neutral-950 dark:text-white truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function CardBody({ className = '', children, ...props }: CardBodyProps) {
  return (
    <div className={`text-neutral-700 dark:text-neutral-300 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ className = '', children, ...props }: CardFooterProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
