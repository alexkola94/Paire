import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation files
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'

/**
 * i18n Configuration
 * Supports multiple languages for internationalization
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr }
    },
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  })

export default i18n

