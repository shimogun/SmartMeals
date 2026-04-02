import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleDark: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.darkMode) setIsDark(true);
        }
      } catch {}
    })();
  }, []);

  const toggleDark = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      const stored = await AsyncStorage.getItem('app_settings');
      const settings = stored ? JSON.parse(stored) : {};
      settings.darkMode = next;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
