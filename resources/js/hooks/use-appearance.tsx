import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark';

const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document === 'undefined') {
    return;
  }

  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance) => {
  const isDark = appearance === 'dark';

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

export function initializeTheme() {
  const savedAppearance =
    (localStorage.getItem('appearance') as Appearance) || 'light';

  applyTheme(savedAppearance);
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>('light');

  const updateAppearance = useCallback((mode: Appearance) => {
    setAppearance(mode);

    // LocalStorage
    localStorage.setItem('appearance', mode);

    // Cookie for SSR
    setCookie('appearance', mode);

    applyTheme(mode);
  }, []);

  useEffect(() => {
    const savedAppearance = localStorage.getItem('appearance') as
      | Appearance
      | null;
    updateAppearance(savedAppearance || 'light');
  }, [updateAppearance]);

  return { appearance, updateAppearance } as const;
}
