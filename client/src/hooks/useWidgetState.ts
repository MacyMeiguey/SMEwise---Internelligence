/**
 * useWidgetState — custom hook for managing WidgetState and wrapping generate calls.
 * Requirements: 20.6, 20.7, 23.1, 23.2, 23.4, 23.5
 *
 * Provides:
 *  - `state: WidgetState` — current widget state
 *  - `generate(fn: () => Promise<void>): Promise<void>` — wraps an async API call,
 *    managing transitions: idle/success → loading → success | error
 *  - `reset(): void` — resets back to idle
 *  - `restoreSuccess(): void` — immediately transitions to success without an API call
 *    (used by the widget cache layer to hydrate from localStorage on mount)
 */

import { useState, useCallback } from "react";
import type { WidgetState } from "../types";

/** Classify an error into a user-friendly message. */
function classifyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    // Rate limit
    if (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("rate is too high") ||
      msg.includes("too many requests") ||
      msg.includes("busy right now")
    ) {
      return "Our AI service is busy right now. Please wait a moment and try again.";
    }

    // Timeout
    if (
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("aborted") ||
      msg.includes("network")
    ) {
      return "The request timed out. Please check your connection and retry.";
    }
  }

  // Check for Response-like objects with a status property
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status: number }).status;
    if (status === 429) {
      return "Our AI service is busy right now. Please wait a moment and try again.";
    }
  }

  return "Something went wrong. Please try again.";
}

const INITIAL_STATE: WidgetState = {
  status: "idle",
  content: null,
  imageBase64: null,
  errorMessage: null,
};

export interface UseWidgetStateReturn {
  state: WidgetState;
  generate: (fn: () => Promise<void>) => Promise<void>;
  reset: () => void;
  /** Immediately mark the widget as successfully loaded (cache restore). */
  restoreSuccess: () => void;
}

export function useWidgetState(): UseWidgetStateReturn {
  const [state, setState] = useState<WidgetState>(INITIAL_STATE);

  const generate = useCallback(async (fn: () => Promise<void>) => {
    setState((prev) => ({
      ...prev,
      status: "loading",
      errorMessage: null,
    }));

    try {
      await fn();
      // The fn() is expected to call setState itself to set content/imageBase64
      // and transition to "success". If it doesn't throw, we ensure success.
      setState((prev) => {
        if (prev.status === "loading") {
          // fn() didn't update status — mark success with whatever content is there
          return { ...prev, status: "success" };
        }
        return prev;
      });
    } catch (err) {
      const errorMessage = classifyError(err);
      setState({
        status: "error",
        content: null,
        imageBase64: null,
        errorMessage,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const restoreSuccess = useCallback(() => {
    setState({ status: "success", content: null, imageBase64: null, errorMessage: null });
  }, []);

  return { state, generate, reset, restoreSuccess };
}
