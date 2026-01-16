/**
 * Smart Packing Suggestions
 * Generates packing item suggestions based on trip details
 */

// Base essential items for any trip
const ESSENTIALS = [
  { name: 'Passport', category: 'documents', isEssential: true },
  { name: 'ID Card', category: 'documents', isEssential: true },
  { name: 'Phone Charger', category: 'electronics', isEssential: true },
  { name: 'Wallet', category: 'documents', isEssential: true },
  { name: 'Toothbrush', category: 'toiletries', isEssential: true },
  { name: 'Toothpaste', category: 'toiletries', isEssential: true },
  { name: 'Underwear', category: 'clothing', isEssential: true },
  { name: 'Socks', category: 'clothing', isEssential: true }
]

// Clothing suggestions based on trip duration
const CLOTHING_BY_DURATION = {
  short: [ // 1-3 days
    { name: 'T-shirts', category: 'clothing', quantity: 2 },
    { name: 'Pants/Shorts', category: 'clothing', quantity: 1 },
    { name: 'Sleepwear', category: 'clothing', quantity: 1 }
  ],
  medium: [ // 4-7 days
    { name: 'T-shirts', category: 'clothing', quantity: 4 },
    { name: 'Pants/Shorts', category: 'clothing', quantity: 2 },
    { name: 'Sleepwear', category: 'clothing', quantity: 2 },
    { name: 'Light jacket', category: 'clothing', quantity: 1 }
  ],
  long: [ // 8+ days
    { name: 'T-shirts', category: 'clothing', quantity: 7 },
    { name: 'Pants/Shorts', category: 'clothing', quantity: 3 },
    { name: 'Sleepwear', category: 'clothing', quantity: 2 },
    { name: 'Light jacket', category: 'clothing', quantity: 1 },
    { name: 'Formal outfit', category: 'clothing', quantity: 1 }
  ]
}

// Weather-based suggestions
const WEATHER_ITEMS = {
  hot: [
    { name: 'Sunscreen', category: 'toiletries', isEssential: true },
    { name: 'Sunglasses', category: 'other', isEssential: true },
    { name: 'Hat/Cap', category: 'clothing' },
    { name: 'Light breathable clothes', category: 'clothing' },
    { name: 'Flip flops', category: 'clothing' }
  ],
  cold: [
    { name: 'Winter jacket', category: 'clothing', isEssential: true },
    { name: 'Thermal underwear', category: 'clothing' },
    { name: 'Gloves', category: 'clothing' },
    { name: 'Scarf', category: 'clothing' },
    { name: 'Warm hat/beanie', category: 'clothing' },
    { name: 'Warm socks', category: 'clothing' }
  ],
  rainy: [
    { name: 'Umbrella', category: 'other', isEssential: true },
    { name: 'Rain jacket', category: 'clothing', isEssential: true },
    { name: 'Waterproof shoes', category: 'clothing' }
  ],
  beach: [
    { name: 'Swimsuit', category: 'clothing', isEssential: true },
    { name: 'Beach towel', category: 'other' },
    { name: 'Flip flops', category: 'clothing' },
    { name: 'Sunscreen (SPF 50+)', category: 'toiletries', isEssential: true },
    { name: 'After-sun lotion', category: 'toiletries' },
    { name: 'Beach bag', category: 'other' }
  ]
}

// Electronics suggestions
const ELECTRONICS = [
  { name: 'Phone Charger', category: 'electronics', isEssential: true },
  { name: 'Power bank', category: 'electronics' },
  { name: 'Camera', category: 'electronics' },
  { name: 'Headphones', category: 'electronics' },
  { name: 'Universal adapter', category: 'electronics' },
  { name: 'Laptop/Tablet', category: 'electronics' }
]

// Toiletries base list
const TOILETRIES = [
  { name: 'Toothbrush', category: 'toiletries', isEssential: true },
  { name: 'Toothpaste', category: 'toiletries', isEssential: true },
  { name: 'Shampoo (travel size)', category: 'toiletries' },
  { name: 'Conditioner (travel size)', category: 'toiletries' },
  { name: 'Body wash', category: 'toiletries' },
  { name: 'Deodorant', category: 'toiletries', isEssential: true },
  { name: 'Razor', category: 'toiletries' },
  { name: 'Moisturizer', category: 'toiletries' },
  { name: 'Hair brush/comb', category: 'toiletries' }
]

// Medications & health
const MEDICATIONS = [
  { name: 'Personal medications', category: 'medications', isEssential: true },
  { name: 'Pain relievers', category: 'medications' },
  { name: 'Antihistamines', category: 'medications' },
  { name: 'Motion sickness pills', category: 'medications' },
  { name: 'Band-aids', category: 'medications' },
  { name: 'Hand sanitizer', category: 'medications' }
]

// Activity-specific items
const ACTIVITY_ITEMS = {
  hiking: [
    { name: 'Hiking boots', category: 'clothing', isEssential: true },
    { name: 'Hiking backpack', category: 'other' },
    { name: 'Water bottle', category: 'other', isEssential: true },
    { name: 'Trail snacks', category: 'other' },
    { name: 'First aid kit', category: 'medications' }
  ],
  business: [
    { name: 'Business attire', category: 'clothing', isEssential: true },
    { name: 'Dress shoes', category: 'clothing' },
    { name: 'Laptop', category: 'electronics', isEssential: true },
    { name: 'Business cards', category: 'documents' },
    { name: 'Notepad & pen', category: 'other' }
  ],
  skiing: [
    { name: 'Ski jacket', category: 'clothing', isEssential: true },
    { name: 'Ski pants', category: 'clothing', isEssential: true },
    { name: 'Ski goggles', category: 'other', isEssential: true },
    { name: 'Thermal base layers', category: 'clothing', isEssential: true },
    { name: 'Ski gloves', category: 'clothing', isEssential: true },
    { name: 'Helmet', category: 'other' },
    { name: 'Neck warmer', category: 'clothing' }
  ]
}

/**
 * Calculate trip duration category
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {'short' | 'medium' | 'long'} Duration category
 */
const getTripDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return 'medium'

  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24))

  if (days <= 3) return 'short'
  if (days <= 7) return 'medium'
  return 'long'
}

/**
 * Generate packing suggestions based on trip details
 * @param {Object} trip - Trip object with destination, dates, etc.
 * @param {Object} options - Additional options like weather, activities
 * @returns {Array} Array of suggested packing items
 */
export const generatePackingSuggestions = (trip, options = {}) => {
  const suggestions = []
  const addedItems = new Set()

  // Helper to add item without duplicates
  const addItem = (item) => {
    const key = `${item.name}-${item.category}`
    if (!addedItems.has(key)) {
      addedItems.add(key)
      suggestions.push({
        ...item,
        quantity: item.quantity || 1,
        isEssential: item.isEssential || false,
        isChecked: false
      })
    }
  }

  // Always add essentials
  ESSENTIALS.forEach(addItem)

  // Add clothing based on trip duration
  const duration = getTripDuration(trip.startDate, trip.endDate)
  CLOTHING_BY_DURATION[duration].forEach(addItem)

  // Add weather-specific items
  if (options.weather) {
    const weatherItems = WEATHER_ITEMS[options.weather] || []
    weatherItems.forEach(addItem)
  }

  // Add beach items if destination contains beach keywords
  const beachKeywords = ['beach', 'coast', 'island', 'caribbean', 'maldives', 'hawaii', 'mediterranean']
  const destinationLower = (trip.destination || '').toLowerCase()
  if (beachKeywords.some(keyword => destinationLower.includes(keyword))) {
    WEATHER_ITEMS.beach.forEach(addItem)
  }

  // Add activity-specific items
  if (options.activities && Array.isArray(options.activities)) {
    options.activities.forEach(activity => {
      const activityItems = ACTIVITY_ITEMS[activity] || []
      activityItems.forEach(addItem)
    })
  }

  // Add electronics
  ELECTRONICS.forEach(addItem)

  // Add toiletries
  TOILETRIES.forEach(addItem)

  // Add medications
  MEDICATIONS.forEach(addItem)

  return suggestions
}

/**
 * Get essential items only
 * @returns {Array} Array of essential packing items
 */
export const getEssentialItems = () => {
  return [
    ...ESSENTIALS,
    { name: 'Phone Charger', category: 'electronics', isEssential: true },
    { name: 'Deodorant', category: 'toiletries', isEssential: true },
    { name: 'Personal medications', category: 'medications', isEssential: true }
  ].map(item => ({
    ...item,
    quantity: 1,
    isChecked: false
  }))
}

/**
 * Get items by category
 * @param {string} category - Category name
 * @returns {Array} Array of items in that category
 */
export const getItemsByCategory = (category) => {
  const allItems = [
    ...ESSENTIALS,
    ...CLOTHING_BY_DURATION.medium,
    ...ELECTRONICS,
    ...TOILETRIES,
    ...MEDICATIONS,
    ...Object.values(WEATHER_ITEMS).flat(),
    ...Object.values(ACTIVITY_ITEMS).flat()
  ]

  const uniqueItems = []
  const seen = new Set()

  allItems.forEach(item => {
    if (item.category === category && !seen.has(item.name)) {
      seen.add(item.name)
      uniqueItems.push({
        ...item,
        quantity: item.quantity || 1,
        isChecked: false
      })
    }
  })

  return uniqueItems
}

export default {
  generatePackingSuggestions,
  getEssentialItems,
  getItemsByCategory
}
