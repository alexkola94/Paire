/**
 * Greece Economic Data Service
 * Fetches economic data from our backend API which calls external Greek government APIs
 * 
 * Flow: Frontend -> Our Backend API -> External APIs (data.gov.gr) -> Our Backend -> Frontend
 */

import { getToken } from './auth'
import { getBackendUrl } from '../utils/getBackendUrl'

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000

/**
 * In-memory cache for API responses
 */
const cache = {
  cpi: null,
  foodPrices: null,
  indicators: null,
  news: null,
  all: null,
  timestamp: null
}

/**
 * Check if cached data is still valid
 */
const isCacheValid = (cacheKey) => {
  if (!cache[cacheKey] || !cache.timestamp) return false
  const age = Date.now() - cache.timestamp
  return age < CACHE_DURATION
}

/**
 * Make authenticated API request to our backend
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = getToken()
    const backendUrl = getBackendUrl()
    const url = `${backendUrl}${endpoint}`

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.') // i18n-ignore
      }
      const errorText = await response.text().catch(() => '')
      throw new Error(`API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching economic data:', error)
    throw error
  }
}

/**
 * Greece Economic Data Service
 * Provides methods to fetch various economic indicators from Greek government APIs
 */
export const greeceEconomicDataService = {
  /**
   * Get Consumer Price Index (CPI) data
   * @returns {Promise<Object>} CPI data with current rate and trend
   */
  async getCPI() {
    // Check cache first
    if (isCacheValid('cpi')) {
      return cache.cpi
    }

    try {
      // Call our backend API which will fetch from external APIs
      const data = await apiRequest('/api/economicdata/cpi')
      
      // Cache the data
      cache.cpi = data
      cache.timestamp = Date.now()

      return data
    } catch (error) {
      console.error('Error fetching CPI data:', error)
      // Return fallback data instead of throwing
      return {
        currentRate: null,
        error: error.message || 'Unable to fetch CPI data at this time',
        lastUpdated: new Date().toISOString()
      }
    }
  },

  /**
   * Get food price data from supermarkets
   * @returns {Promise<Array>} Array of food price data
   */
  async getFoodPrices() {
    // Check cache first
    if (isCacheValid('foodPrices')) {
      return cache.foodPrices
    }

    try {
      // Call our backend API which will fetch from external APIs
      const data = await apiRequest('/api/economicdata/food-prices')
      
      // Cache the data
      cache.foodPrices = data
      cache.timestamp = Date.now()

      return data
    } catch (error) {
      console.error('Error fetching food prices:', error)
      return {
        categories: [],
        error: error.message || 'Unable to fetch food price data at this time',
        lastUpdated: new Date().toISOString()
      }
    }
  },

  /**
   * Get economic indicators summary
   * @returns {Promise<Object>} Summary of key economic indicators
   */
  async getEconomicIndicators() {
    // Check cache first
    if (isCacheValid('indicators')) {
      return cache.indicators
    }

    try {
      // Call our backend API which will fetch from external APIs
      const data = await apiRequest('/api/economicdata/indicators')
      
      // Cache the data
      cache.indicators = data
      cache.timestamp = Date.now()

      return data
    } catch (error) {
      console.error('Error fetching economic indicators:', error)
      return {
        error: error.message || 'Unable to fetch economic indicators at this time',
        lastUpdated: new Date().toISOString()
      }
    }
  },

  /**
   * Get latest economic news articles from Greece
   * @returns {Promise<Object>} Latest news articles about Greek economy
   */
  async getNews() {
    // Check cache first
    if (isCacheValid('news')) {
      return cache.news
    }

    try {
      // Call our backend API which will fetch from external APIs
      const data = await apiRequest('/api/economicdata/news')
      
      // Cache the data
      cache.news = data
      cache.timestamp = Date.now()

      return data
    } catch (error) {
      console.error('Error fetching news:', error)
      return {
        articles: [],
        error: error.message || 'Unable to fetch news at this time',
        lastUpdated: new Date().toISOString()
      }
    }
  },

  /**
   * Get all economic data at once
   * @returns {Promise<Object>} Combined data from all sources
   */
  async getAllData() {
    // Check cache first
    if (isCacheValid('all')) {
      return cache.all
    }

    try {
      // Call our backend API which will fetch all data from external APIs
      const data = await apiRequest('/api/economicdata/all')
      
      // Cache the data
      cache.all = data
      cache.timestamp = Date.now()

      return data
    } catch (error) {
      console.error('Error fetching all economic data:', error)
      // Fallback: try individual endpoints
      const [cpi, foodPrices, indicators, news] = await Promise.allSettled([
        this.getCPI(),
        this.getFoodPrices(),
        this.getEconomicIndicators(),
        this.getNews()
      ])

      return {
        cpi: cpi.status === 'fulfilled' ? cpi.value : { error: 'Failed to load CPI data' },
        foodPrices: foodPrices.status === 'fulfilled' ? foodPrices.value : { error: 'Failed to load food prices' },
        indicators: indicators.status === 'fulfilled' ? indicators.value : { error: 'Failed to load indicators' },
        news: news.status === 'fulfilled' ? news.value : { error: 'Failed to load news' },
        lastUpdated: new Date().toISOString()
      }
    }
  },

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache() {
    cache.cpi = null
    cache.foodPrices = null
    cache.indicators = null
    cache.news = null
    cache.all = null
    cache.timestamp = null
  }
}

