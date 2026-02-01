import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PrivacyModeContext = createContext();

export function PrivacyModeProvider({ children }) {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('privacy_mode').then((val) => {
      if (val === 'true') setIsPrivacyMode(true);
    });
  }, []);

  const togglePrivacyMode = async () => {
    const newVal = !isPrivacyMode;
    setIsPrivacyMode(newVal);
    await AsyncStorage.setItem('privacy_mode', String(newVal));
  };

  return (
    <PrivacyModeContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

export const usePrivacyMode = () => useContext(PrivacyModeContext);
