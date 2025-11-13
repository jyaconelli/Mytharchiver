import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const THEME_COOKIE_NAME = 'themePreference';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const readPreferenceFromCookie = (): ThemePreference | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const regex = new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`);
  const match = document.cookie.match(regex);
  if (!match) {
    return null;
  }

  const value = decodeURIComponent(match[1]);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return null;
};

const writePreferenceToCookie = (preference: ThemePreference) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${THEME_COOKIE_NAME}=${preference}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
};

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readPreferenceFromCookie() ?? 'system');
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);

    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  useEffect(() => {
    writePreferenceToCookie(preference);
  }, [preference]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
    }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemePreference = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      preference: 'system' as ThemePreference,
      resolvedTheme: 'light' as ResolvedTheme,
      setPreference: () => {
        // no-op outside provider; primarily for tests that render isolated components
      },
    } satisfies ThemeContextValue;
  }

  return context;
};
