import { useCallback, useEffect } from 'react';
import { parseTheme } from '../lib/parse';
import type { Theme } from '../types';
import { useLocalStorage } from './useLocalStorage';

const THEME_COLORS: Record<Theme, string> = { dark: '#0b1310', light: '#eef0e8' };

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Тема оформления. Пока пользователь не выбрал вручную, действует системная настройка;
 * ручной выбор запоминается.
 */
export function useTheme() {
  const [chosen, setChosen] = useLocalStorage<Theme | null>('theme', parseTheme);
  const theme = chosen ?? systemTheme();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setChosen(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setChosen]);

  return { theme, toggleTheme };
}
