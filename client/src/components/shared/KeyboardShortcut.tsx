/**
 * KeyboardShortcut — registers a global keyboard shortcut and shows a hint badge.
 * Used for ⌘K / Ctrl+K to open the AI assistant.
 */

import { useEffect } from 'react';

interface KeyboardShortcutProps {
  /** Key to listen for (e.g. 'k') */
  shortcutKey: string;
  /** Require Ctrl/Cmd modifier */
  withMeta?: boolean;
  /** Callback when shortcut is triggered */
  onTrigger: () => void;
}

export function useKeyboardShortcut({ shortcutKey, withMeta = true, onTrigger }: KeyboardShortcutProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (withMeta && !meta) return;
      if (e.key.toLowerCase() !== shortcutKey.toLowerCase()) return;

      // Don't trigger if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      e.preventDefault();
      onTrigger();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcutKey, withMeta, onTrigger]);
}

/** Small badge showing the keyboard shortcut */
export function ShortcutBadge({ className = '' }: { className?: string }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  return (
    <kbd className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-[10px] font-mono font-semibold text-neutral-500 dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-neutral-400 ${className}`}>
      {isMac ? '⌘' : 'Ctrl+'}K
    </kbd>
  );
}
