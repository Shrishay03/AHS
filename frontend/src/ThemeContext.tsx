import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ======================================================
// THEME COLORS
// ======================================================

export const LightTheme = {
  primary: '#2E7D32',
  secondary: '#1976D2',
  bg: '#F5F5F5',
  card: '#FFFFFF',
  text: '#212121',
  muted: '#757575',
  ok: '#4CAF50',
  warn: '#FF9800',
  err: '#F44336',
  transfer: '#9C27B0',
  border: '#E0E0E0',
  inputBg: '#F5F5F5',
  headerBg: '#2E7D32',
  tabBg: '#FFFFFF',
  subtext: '#616161',
  isDark: false,
};

export const DarkTheme = {
  primary: '#4CAF50',
  secondary: '#42A5F5',
  bg: '#121212',
  card: '#1E1E1E',
  text: '#F5F5F5',
  muted: '#9E9E9E',
  ok: '#66BB6A',
  warn: '#FFA726',
  err: '#EF5350',
  transfer: '#CE93D8',
  border: '#333333',
  inputBg: '#2C2C2C',
  headerBg: '#1B5E20',
  tabBg: '#1E1E1E',
  subtext: '#BDBDBD',
  isDark: true,
};

export type Theme = typeof LightTheme;

// ======================================================
// CONTEXT
// ======================================================

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      if (val === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem('theme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DarkTheme : LightTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
