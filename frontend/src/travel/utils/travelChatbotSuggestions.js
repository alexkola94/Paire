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
