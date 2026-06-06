'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type Mode = 'dark' | 'light';
interface ThemeModeCtx { mode: Mode; toggle: () => void; }
const ThemeModeContext = createContext<ThemeModeCtx>({ mode: 'dark', toggle: () => {} });

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');
  useEffect(() => {
    const saved = localStorage.getItem('wc26-theme') as Mode | null;
    if (saved === 'light' || saved === 'dark') setMode(saved);
  }, []);
  function toggle() {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('wc26-theme', next);
      return next;
    });
  }
  return <ThemeModeContext.Provider value={{ mode, toggle }}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() { return useContext(ThemeModeContext); }
