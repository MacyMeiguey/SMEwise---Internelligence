/**
 * Card Component
 * Flexible card container with variants
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
    const baseStyles = 'rounded-2xl transition-all duration-200';

    const variantStyles = {
      default: 'bg-white border-2 border-neutral-200',
      elevated: 'bg-white border-2 border-neutral-950',
      bordered: 'bg-white border-2 border-neutral-950',
      glass: 'bg-white/90 backdrop-blur-sm border-2 border-neutral-200',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hover
      ? 'hover:shadow-md cursor-pointer'
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

// ── Card sub-components ──

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
          <h3 className="text-lg font-bold text-neutral-950 truncate">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
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
    <div className={`text-neutral-700 ${className}`} {...props}>
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
