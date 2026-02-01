import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import el from './locales/el.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    el: { translation: el },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

// Load saved language on startup
AsyncStorage.getItem('language').then((lang) => {
  if (lang && lang !== 'en') {
    i18n.changeLanguage(lang);
  }
});

// Persist language changes
i18n.on('languageChanged', (lang) => {
  AsyncStorage.setItem('language', lang);
});

export default i18n;
