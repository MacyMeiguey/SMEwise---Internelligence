/**
 * ErrorState Component
 * User-friendly error display with retry option
 */

import { AlertCircle } from 'lucide-react';
import Button from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 text-error-500">
        <AlertCircle size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
