import { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system'); // 'light' | 'dark' | 'system'
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((saved) => {
      if (saved) setMode(saved);
      setLoaded(true);
    });
  }, []);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = async (newMode) => {
    const m = newMode || (isDark ? 'light' : 'dark');
    setMode(m);
    await AsyncStorage.setItem('theme_mode', m);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
