/**
 * LoadingState Component
 * Skeleton loaders and loading indicators
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
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        {message && (
          <p className="mt-4 text-sm text-neutral-600">{message}</p>
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
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.3s]" />
          <div className="h-3 w-3 rounded-full bg-primary-600 animate-bounce [animation-delay:-0.15s]" />
          <div className="h-3 w-3 rounded-full bg-primary-600 animate-bounce" />
        </div>
        {message && (
          <p className="ml-4 text-sm text-neutral-600">{message}</p>
        )}
      </div>
    );
  }

  // Skeleton variant (default)
  return (
    <div
      className={`animate-pulse space-y-4 ${className}`}
      role="status"
      aria-label={message || 'Loading'}
    >
      <div className="h-4 bg-neutral-200 rounded-lg w-3/4" />
      <div className="h-4 bg-neutral-200 rounded-lg w-full" />
      <div className="h-4 bg-neutral-200 rounded-lg w-5/6" />
      <div className="h-4 bg-neutral-200 rounded-lg w-2/3" />
      <span className="sr-only">{message || 'Loading...'}</span>
    </div>
  );
}
