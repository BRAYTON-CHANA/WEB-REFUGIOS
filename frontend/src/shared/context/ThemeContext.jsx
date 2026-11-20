import { createContext, useContext, useState, useEffect } from 'react';

const THEME_KEY = 'app_theme';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

/** Tema claro/oscuro: pone data-theme en <html> (ver variables en index.css y `dark:` de Tailwind) */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY)
        || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* sin storage */ }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
