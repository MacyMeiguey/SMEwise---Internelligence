/**
 * LoadingContext — tracks how many Widgets are currently loading.
 * Provides a counter so GlobalProgressBar can show/hide accordingly.
 */

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface LoadingContextValue {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  count: 0,
  increment: () => {},
  decrement: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider value={{ count, increment, decrement }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingCount(): number {
  return useContext(LoadingContext).count;
}

export function useLoadingActions() {
  const { increment, decrement } = useContext(LoadingContext);
  return { increment, decrement };
}
