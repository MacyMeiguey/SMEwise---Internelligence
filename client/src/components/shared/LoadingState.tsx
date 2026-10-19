/**
 * LoadingState — skeleton-first loaders matching layout shapes.
 */

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse';
  message?: string;
  className?: string;
}

export default function LoadingState({
  variant = 'skeleton',
  message,
  className = '',
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 ${className}`}
        role="status"
        aria-label={message || 'Loading'}
      >
        <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600 dark:border-primary-900 dark:border-t-primary-400" />
        {message && (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        )}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={`flex items-center justify-center py-12 ${className}`}
        role="status"
        aria-label={message || 'Loading'}
      >
        <div className="flex gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.3s]" />
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2 w-2 rounded-full bg-primary-600 animate-bounce" />
        </div>
        {message && (
          <p className="ml-4 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse space-y-3 ${className}`}
      role="status"
      aria-label={message || 'Loading'}
    >
      <div className="h-3 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-1/3" />
      <div className="h-24 bg-neutral-100 dark:bg-white/[0.05] rounded-xl w-full border border-neutral-200/60 dark:border-white/[0.06]" />
      <div className="space-y-2">
        <div className="h-3 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-full" />
        <div className="h-3 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-5/6" />
        <div className="h-3 bg-neutral-200 dark:bg-white/[0.08] rounded-md w-2/3" />
      </div>
      <span className="sr-only">{message || 'Loading'}</span>
    </div>
  );
}
