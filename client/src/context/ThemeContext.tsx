/**
 * Workspace colour theme: dark (default), light, or follow system.
 * Syncs Tailwind `dark` class on <html> — landing route forces dark for cinematic hero.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'smewise:theme-preference';

function readStored(): ThemePreference | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return null;
}

function getSystemIsDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function computeEffective(pref: ThemePreference): 'dark' | 'light' {
  if (pref === 'system') return getSystemIsDark() ? 'dark' : 'light';
  return pref;
}

interface ThemeContextValue {
  preference: ThemePreference;
  effective: 'dark' | 'light';
  setPreference: (next: ThemePreference) => void;
  cyclePreference: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDarkClassOnHtml(shouldDark: boolean) {
  document.documentElement.classList.toggle('dark', shouldDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPrefState] = useState<ThemePreference>(() => readStored() ?? 'dark');
  const [systemDark, setSystemDark] = useState(getSystemIsDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const effective = useMemo(
    () => computeEffective(preference === 'system' ? 'system' : preference),
    [preference, systemDark],
  );

  const setPreference = useCallback((next: ThemePreference) => {
    setPrefState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const cyclePreference = useCallback(() => {
    setPreference(preference === 'dark' ? 'light' : preference === 'light' ? 'system' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, effective, setPreference, cyclePreference }),
    [preference, effective, setPreference, cyclePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Syncs `dark` on <html>: landing + onboarding always dark; workspace follows preference/system. */
export function useWorkspaceHtmlTheme(pathname: string) {
  const { effective } = useTheme();

  useEffect(() => {
    if (pathname === '/' || pathname === '/onboarding') {
      applyDarkClassOnHtml(true);
      return;
    }
    applyDarkClassOnHtml(effective === 'dark');
  }, [pathname, effective]);
}
