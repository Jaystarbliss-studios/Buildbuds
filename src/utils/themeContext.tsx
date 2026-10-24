import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isAuto: boolean;
  timeOfDayGreeting: string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  isAuto: true,
  timeOfDayGreeting: 'Afternoon',
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Check user preference stored in localStorage
    const saved = localStorage.getItem('buildbuds_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // 2. Default based on time of day (Afternoon/Day = light, Night = dark)
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  });

  const [isAuto, setIsAuto] = useState<boolean>(() => {
    return !localStorage.getItem('buildbuds_theme');
  });

  const currentHour = new Date().getHours();
  const timeOfDayGreeting =
    currentHour >= 5 && currentHour < 12
      ? 'Morning'
      : currentHour >= 12 && currentHour < 18
      ? 'Afternoon'
      : 'Night';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#06060c';
      document.body.style.color = '#FFFFFF';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
      document.body.style.color = '#111827';
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    setIsAuto(false);
    localStorage.setItem('buildbuds_theme', nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setIsAuto(false);
    localStorage.setItem('buildbuds_theme', newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        toggleTheme,
        setTheme,
        isAuto,
        timeOfDayGreeting,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
