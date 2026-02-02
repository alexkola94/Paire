/**
 * Static travel chatbot suggestions (fallback when backend suggestions API is unavailable).
 * Used by TravelChatbot when travelChatbotService.getSuggestions fails.
 * Keys match language codes: en, el, es, fr.
 */
export const TRAVEL_CHATBOT_SUGGESTIONS = {
  en: [
    'Best time to visit?',
    'Packing tips for my trip',
    'Local customs and etiquette',
    'Budget tips for my destination'
  ],
  el: [
    'Καλύτερη εποχή για επίσκεψη;',
    'Συμβουλές συσκευασίας',
    'Τοπικά έθιμα και τρόποι',
    'Συμβουλές προϋπολογισμού'
  ],
  es: [
    '¿Mejor época para visitar?',
    'Consejos de equipaje',
    'Costumbres y etiqueta local',
    'Consejos de presupuesto'
  ],
  fr: [
    'Meilleure période pour visiter ?',
    'Conseils de bagages',
    'Usages et étiquette locale',
    'Conseils de budget'
  ]
}

/**
 * Get static travel suggestions for a language.
 * @param {string} language - Language code (en, el, es, fr)
 * @returns {string[]}
 */
export function getStaticTravelSuggestions(language) {
  const lang = (language || 'en').toLowerCase()
  return TRAVEL_CHATBOT_SUGGESTIONS[lang] || TRAVEL_CHATBOT_SUGGESTIONS.en
}

/**
 * Context-aware suggestions when user has an active trip (destination).
 * Use with getStaticTravelSuggestions or API suggestions: merge these at the start.
 * @param {string} destination - Trip destination (e.g. "Paris")
 * @param {string} language - Language code (en, el, es, fr)
 * @returns {string[]}
 */
export function getContextAwareTravelSuggestions(destination, language) {
  if (!destination || typeof destination !== 'string') return []
  const dest = destination.trim()
  if (!dest) return []
  const lang = (language || 'en').toLowerCase()
  const templates = {
    en: [
      `Weather for ${dest}`,
      `Packing list for ${dest}`,
      `Budget tips for ${dest}`,
      `Best time to visit ${dest}`
    ],
    el: [
      `Καιρός για ${dest}`,
      `Λίστα συσκευασίας για ${dest}`,
      `Συμβουλές προϋπολογισμού για ${dest}`,
      `Καλύτερη εποχή για ${dest}`
    ],
    es: [
      `Tiempo en ${dest}`,
      `Lista de equipaje para ${dest}`,
      `Consejos de presupuesto para ${dest}`,
      `Mejor época para visitar ${dest}`
    ],
    fr: [
      `Météo à ${dest}`,
      `Liste de voyage pour ${dest}`,
      `Conseils budget pour ${dest}`,
      `Meilleure période pour ${dest}`
    ]
  }
  return templates[lang] || templates.en
}
