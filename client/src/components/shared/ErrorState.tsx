/**
 * ErrorState — direct copy, inline retry (no alerts).
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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
        <AlertCircle size={24} strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}
