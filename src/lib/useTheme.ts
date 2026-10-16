import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'shop.theme';

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemePref>(read);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      root.setAttribute(
        'data-theme',
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme,
      );
    apply();
    media.addEventListener('change', apply);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* bỏ qua nếu localStorage bị chặn */
    }
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const cycle = () =>
    setTheme((t) =>
      t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system',
    );

  return { theme, setTheme, cycle };
}
