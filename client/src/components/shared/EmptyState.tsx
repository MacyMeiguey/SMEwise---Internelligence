/**
 * EmptyState Component
 * Friendly empty state with icon, message, and optional action
 */

import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-14 px-4 ${className}`}
      role="status"
    >
      {icon && (
        <div className="mb-3 text-neutral-300" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-neutral-900 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-600 max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
