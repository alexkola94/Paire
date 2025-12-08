import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import default translation (English) - loaded immediately
import en from './locales/en.json'

/**
 * i18n Configuration with lazy loading
 * Supports multiple languages with lazy loading for better performance
 * - en: English (default, loaded immediately)
 * - el: Greek (Ελληνικά) - lazy loaded
 * - es: Spanish (Español) - lazy loaded
 * - fr: French (Français) - lazy loaded
 */
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en } // Only load default language initially
    },
    lng: localStorage.getItem('language') || 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  })

/**
 * Lazy load translation files when language changes
 * This reduces initial bundle size by only loading the selected language
 */
export const loadLanguage = async (lang) => {
  // Don't reload if already loaded
  if (i18n.hasResourceBundle(lang, 'translation')) {
    return
  }

  try {
    let translation
    switch (lang) {
      case 'el':
        translation = (await import('./locales/el.json')).default
        break
      case 'es':
        translation = (await import('./locales/es.json')).default
        break
      case 'fr':
        translation = (await import('./locales/fr.json')).default
        break
      default:
        return // English already loaded
    }
    
    i18n.addResourceBundle(lang, 'translation', translation)
  } catch (error) {
    console.error(`Failed to load language ${lang}:`, error)
  }
}

// Load initial language if not English
const initialLang = localStorage.getItem('language') || 'en'
if (initialLang !== 'en') {
  loadLanguage(initialLang)
}

// Listen for language changes and lazy load
i18n.on('languageChanged', (lang) => {
  loadLanguage(lang)
  localStorage.setItem('language', lang)
})

export default i18n
