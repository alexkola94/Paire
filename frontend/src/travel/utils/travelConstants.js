/**
 * Travel Command Center Constants
 * Categories, icons, and default values for travel module
 */

// Packing item categories
export const PACKING_CATEGORIES = {
  clothing: {
    id: 'clothing',
    label: 'travel.packing.categories.clothing',
    icon: 'FiShirt',
    color: '#8e44ad'
  },
  toiletries: {
    id: 'toiletries',
    label: 'travel.packing.categories.toiletries',
    icon: 'FiDroplet',
    color: '#3498db'
  },
  electronics: {
    id: 'electronics',
    label: 'travel.packing.categories.electronics',
    icon: 'FiSmartphone',
    color: '#e74c3c'
  },
  documents: {
    id: 'documents',
    label: 'travel.packing.categories.documents',
    icon: 'FiFileText',
    color: '#2ecc71'
  },
  medications: {
    id: 'medications',
    label: 'travel.packing.categories.medications',
    icon: 'FiHeart',
    color: '#e91e63'
  },
  other: {
    id: 'other',
    label: 'travel.packing.categories.other',
    icon: 'FiPackage',
    color: '#95a5a6'
  }
}

// Budget expense categories
export const BUDGET_CATEGORIES = {
  accommodation: {
    id: 'accommodation',
    label: 'travel.budget.categories.accommodation',
    icon: 'FiHome',
    color: '#8e44ad'
  },
  transport: {
    id: 'transport',
    label: 'travel.budget.categories.transport',
    icon: 'FiNavigation',
    color: '#3498db'
  },
  food: {
    id: 'food',
    label: 'travel.budget.categories.food',
    icon: 'FiCoffee',
    color: '#e67e22'
  },
  activities: {
    id: 'activities',
    label: 'travel.budget.categories.activities',
    icon: 'FiCamera',
    color: '#2ecc71'
  },
  shopping: {
    id: 'shopping',
    label: 'travel.budget.categories.shopping',
    icon: 'FiShoppingBag',
    color: '#e74c3c'
  },
  other: {
    id: 'other',
    label: 'travel.budget.categories.other',
    icon: 'FiMoreHorizontal',
    color: '#95a5a6'
  }
}

// Itinerary event types
export const ITINERARY_TYPES = {
  flight: {
    id: 'flight',
    label: 'travel.itinerary.types.flight',
    icon: 'FiNavigation2',
    color: '#3498db'
  },
  hotel: {
    id: 'hotel',
    label: 'travel.itinerary.types.hotel',
    icon: 'FiHome',
    color: '#8e44ad'
  },
  activity: {
    id: 'activity',
    label: 'travel.itinerary.types.activity',
    icon: 'FiStar',
    color: '#f1c40f'
  },
  transit: {
    id: 'transit',
    label: 'travel.itinerary.types.transit',
    icon: 'FiTruck',
    color: '#2ecc71'
  },
  restaurant: {
    id: 'restaurant',
    label: 'travel.itinerary.types.restaurant',
    icon: 'FiCoffee',
    color: '#e67e22'
  },
  other: {
    id: 'other',
    label: 'travel.itinerary.types.other',
    icon: 'FiMapPin',
    color: '#95a5a6'
  }
}

// Document types
export const DOCUMENT_TYPES = {
  passport: {
    id: 'passport',
    label: 'travel.documents.types.passport',
    icon: 'FiBook',
    color: '#1a237e'
  },
  visa: {
    id: 'visa',
    label: 'travel.documents.types.visa',
    icon: 'FiCreditCard',
    color: '#4a148c'
  },
  booking: {
    id: 'booking',
    label: 'travel.documents.types.booking',
    icon: 'FiCalendar',
    color: '#00695c'
  },
  insurance: {
    id: 'insurance',
    label: 'travel.documents.types.insurance',
    icon: 'FiShield',
    color: '#bf360c'
  },
  ticket: {
    id: 'ticket',
    label: 'travel.documents.types.ticket',
    icon: 'FiTag',
    color: '#0277bd'
  },
  other: {
    id: 'other',
    label: 'travel.documents.types.other',
    icon: 'FiFile',
    color: '#546e7a'
  }
}

// Trip status options
export const TRIP_STATUS = {
  planning: {
    id: 'planning',
    label: 'trip.planning',
    color: '#f1c40f'
  },
  active: {
    id: 'active',
    label: 'trip.active',
    color: '#2ecc71'
  },
  completed: {
    id: 'completed',
    label: 'trip.completed',
    color: '#95a5a6'
  }
}

// POI (Points of Interest) categories for Overpass API
export const POI_CATEGORIES = {
  restaurant: {
    id: 'restaurant',
    label: 'travel.explore.poi.restaurant',
    icon: 'FiCoffee',
    osmTag: 'restaurant'
  },
  attraction: {
    id: 'attraction',
    label: 'travel.explore.poi.attraction',
    icon: 'FiCamera',
    osmTag: 'attraction'
  },
  shopping: {
    id: 'shopping',
    label: 'travel.explore.poi.shopping',
    icon: 'FiShoppingBag',
    osmTag: 'supermarket'
  },
  hospital: {
    id: 'hospital',
    label: 'travel.explore.poi.hospital',
    icon: 'FiActivity',
    osmTag: 'hospital'
  },
  atm: {
    id: 'atm',
    label: 'travel.explore.poi.atm',
    icon: 'FiDollarSign',
    osmTag: 'atm'
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'travel.explore.poi.pharmacy',
    icon: 'FiHeart',
    osmTag: 'pharmacy'
  }
}

// Weather code to weather type mapping (Open-Meteo WMO codes)
// Returns simple type: sunny, cloudy, rainy, snowy
export const WEATHER_CODES = {
  0: 'sunny',   // Clear sky
  1: 'sunny',   // Mainly clear
  2: 'cloudy',  // Partly cloudy
  3: 'cloudy',  // Overcast
  45: 'cloudy', // Fog
  48: 'cloudy', // Depositing rime fog
  51: 'rainy',  // Light drizzle
  53: 'rainy',  // Moderate drizzle
  55: 'rainy',  // Dense drizzle
  61: 'rainy',  // Slight rain
  63: 'rainy',  // Moderate rain
  65: 'rainy',  // Heavy rain
  71: 'snowy',  // Slight snow
  73: 'snowy',  // Moderate snow
  75: 'snowy',  // Heavy snow
  80: 'rainy',  // Slight rain showers
  81: 'rainy',  // Moderate rain showers
  82: 'rainy',  // Violent rain showers
  95: 'rainy',  // Thunderstorm
  96: 'rainy',  // Thunderstorm with hail
  99: 'rainy'   // Thunderstorm with heavy hail
}

// Default currencies for travel
export const TRAVEL_CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' }
]

// Navigation items for travel bottom nav
export const TRAVEL_NAV_ITEMS = [
  { id: 'home', icon: 'FiHome', label: 'nav.home' },
  { id: 'budget', icon: 'FiDollarSign', label: 'nav.budget' },
  { id: 'itinerary', icon: 'FiCalendar', label: 'nav.itinerary' },
  { id: 'packing', icon: 'FiCheckSquare', label: 'nav.packing' },
  { id: 'documents', icon: 'FiFolder', label: 'nav.documents' },
  { id: 'explore', icon: 'FiCompass', label: 'nav.explore' }
]

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  weather: 30 * 60 * 1000, // 30 minutes
  flights: 15 * 60 * 1000, // 15 minutes
  poi: 24 * 60 * 60 * 1000, // 24 hours
  currency: 60 * 60 * 1000 // 1 hour
}

// Discovery Mode POI categories for map markers
export const DISCOVERY_POI_CATEGORIES = [
  {
    id: 'restaurant',
    icon: 'FiCoffee',
    label: 'travel.discovery.categories.foodDrink',
    fallbackLabel: 'Food & Drink',
    color: '#e67e22',
    gradient: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
    osmTags: ['restaurant', 'cafe', 'bar', 'fast_food']
  },
  {
    id: 'attraction',
    icon: 'FiCamera',
    label: 'travel.discovery.categories.attractions',
    fallbackLabel: 'Attractions',
    color: '#f1c40f',
    gradient: 'linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)',
    osmTags: ['attraction', 'museum', 'artwork', 'viewpoint']
  },
  {
    id: 'shopping',
    icon: 'FiShoppingBag',
    label: 'travel.discovery.categories.shopping',
    fallbackLabel: 'Shopping',
    color: '#e74c3c',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    osmTags: ['supermarket', 'mall', 'marketplace', 'convenience']
  },
  {
    id: 'transit',
    icon: 'FiBus',
    label: 'travel.discovery.categories.transit',
    fallbackLabel: 'Transit',
    color: '#3498db',
    gradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    osmTags: ['bus_station', 'subway_entrance', 'tram_stop', 'taxi']
  },
  {
    id: 'atm',
    icon: 'FiDollarSign',
    label: 'travel.discovery.categories.atm',
    fallbackLabel: 'ATM',
    color: '#2ecc71',
    gradient: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    osmTags: ['atm', 'bank']
  },
  {
    id: 'pharmacy',
    icon: 'FiHeart',
    label: 'travel.discovery.categories.pharmacy',
    fallbackLabel: 'Pharmacy',
    color: '#e91e63',
    gradient: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
    osmTags: ['pharmacy', 'hospital', 'clinic']
  },
  {
    id: 'accommodation',
    icon: 'FiBed',
    label: 'travel.discovery.categories.accommodation',
    fallbackLabel: 'Stays',
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    osmTags: ['hotel', 'hostel', 'motel', 'guest_house', 'apartment']
  }
]

// Mapbox map style options
// streets-v12 = default Mapbox Streets (native full color, theme-independent)
// Use MAP_STYLES.streets when the map should look the same in dark/light app theme
export const MAP_STYLES = {
  muted: 'mapbox://styles/mapbox/dark-v11',
  detailed: 'mapbox://styles/mapbox/light-v11',
  /** Native Mapbox Streets – full-color style; use for maps that ignore app theme */
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  midnight: 'mapbox://styles/mapbox/navigation-guidance-night-v4',
  twilight: 'mapbox://styles/mapbox/dark-v11'
}

// Default map configuration for Discovery Mode
export const DISCOVERY_MAP_CONFIG = {
  defaultZoom: 13,
  minZoom: 3,
  maxZoom: 20,
  poiRadius: 2000, // meters for POI search radius
  markerClusterRadius: 50 // pixels for marker clustering
}
