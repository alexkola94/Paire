import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation files
import en from './locales/en.json'
import el from './locales/el.json'

/**
 * i18n Configuration
 * Supports English and Greek for internationalization
 * - en: English (default)
 * - el: Greek (Ελληνικά)
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      el: { translation: el }
    },
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  })

export default i18n