'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

const isValidTheme = (value: string | null): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return 'system';
    }

    const savedTheme = localStorage.getItem('theme');
    return isValidTheme(savedTheme) ? savedTheme : 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  const calculateResolvedTheme = (currentTheme: Theme): 'light' | 'dark' => {
    return currentTheme === 'system' ? getSystemTheme() : currentTheme;
  };

  const applyTheme = (nextResolvedTheme: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(nextResolvedTheme);
    root.style.colorScheme = nextResolvedTheme;
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const nextResolvedTheme = calculateResolvedTheme(theme);
    setResolvedTheme(nextResolvedTheme);
    applyTheme(nextResolvedTheme);

    if (typeof window !== 'undefined' && isHydrated) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const nextResolvedTheme = getSystemTheme();
        setResolvedTheme(nextResolvedTheme);
        applyTheme(nextResolvedTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
