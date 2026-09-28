import React, { createContext, useState, useEffect } from 'react';

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

import { getCookie, setCookie } from '../utils/cookies';

import { api } from '../services/api';

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const cookieTheme = getCookie('payg_theme');
    if (cookieTheme === 'dark') return true;
    if (cookieTheme === 'light') return false;
    return true; // Temporary placeholder until config loads
  });

  // On mount: resolve theme based on cookie, or fall back to admin settings
  useEffect(() => {
    const cookieTheme = getCookie('payg_theme');
    if (cookieTheme === 'dark' || cookieTheme === 'light') {
      const darkActive = cookieTheme === 'dark';
      setIsDark(darkActive);
      document.documentElement.classList.toggle('dark', darkActive);
    } else {
      // No cookie: fetch admin's default theme setting
      api.get<any>('/api/config/public')
        .then((data) => {
          if (data?.default_theme && !getCookie('payg_theme')) {
            const adminDark = data.default_theme === 'dark';
            setIsDark(adminDark);
            document.documentElement.classList.toggle('dark', adminDark);
          }
        })
        .catch(() => {
          document.documentElement.classList.add('dark');
        });
    }
  }, []);

  // Toggling only sets cookies upon explicit user interaction
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      const themeVal = next ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', next);
      setCookie('payg_theme', themeVal);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
