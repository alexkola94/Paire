/**
 * Flight Service - AeroDataBox API Integration
 * Provides real-time flight status for itinerary events
 * 
 * Free tier: 1000 requests/month via RapidAPI
 * Docs: https://rapidapi.com/aedbx-aedbx/api/aerodatabox
 */

const RAPIDAPI_HOST = 'aerodatabox.p.rapidapi.com'
const RAPIDAPI_KEY = import.meta.env.VITE_AERODATABOX_API_KEY || ''

// Cache to minimize API calls (flight data cached for 15 minutes)
const flightCache = new Map()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Get flight status from AeroDataBox
 * @param {string} flightNumber - IATA flight number (e.g., "BA256", "LH400")
 * @param {string} date - Flight date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Flight status or null if not found
 */
export const getFlightStatus = async (flightNumber, date) => {
    if (!flightNumber || !date) return null
    if (!RAPIDAPI_KEY) {
        console.warn('AeroDataBox API key not configured. Set VITE_AERODATABOX_API_KEY in .env')
        return null
    }

    // Normalize flight number (remove spaces, uppercase)
    const normalizedFlight = flightNumber.replace(/\s+/g, '').toUpperCase()
    const cacheKey = `${normalizedFlight}_${date}`

    // Check cache first
    const cached = flightCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data
    }

    try {
        const response = await fetch(
            `https://${RAPIDAPI_HOST}/flights/number/${normalizedFlight}/${date}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': RAPIDAPI_HOST,
                    'x-rapidapi-key': RAPIDAPI_KEY
                }
            }
        )

        if (!response.ok) {
            if (response.status === 404) {
                // Flight not found - cache null result
                flightCache.set(cacheKey, { data: null, timestamp: Date.now() })
                return null
            }
            throw new Error(`Flight API error: ${response.status}`)
        }

        const data = await response.json()

        // AeroDataBox returns an array of flights (could be multiple legs)
        const flights = Array.isArray(data) ? data : [data]
        const flightData = flights[0] // Get first flight

        if (!flightData) {
            flightCache.set(cacheKey, { data: null, timestamp: Date.now() })
            return null
        }

        // Normalize response to our format
        const normalizedData = normalizeFlightData(flightData)

        // Cache the result
        flightCache.set(cacheKey, { data: normalizedData, timestamp: Date.now() })

        return normalizedData
    } catch (error) {
        console.error('Error fetching flight status:', error)
        return null
    }
}

/**
 * Normalize AeroDataBox response to our internal format
 */
const normalizeFlightData = (flight) => {
    const departure = flight.departure || {}
    const arrival = flight.arrival || {}
    const aircraft = flight.aircraft || {}
    const airline = flight.airline || {}

    // Determine flight status
    let status = 'scheduled'
    if (departure.actualTimeLocal || arrival.actualTimeLocal) {
        status = 'departed'
        if (arrival.actualTimeLocal) {
            status = 'arrived'
        }
    }
    if (flight.status?.toLowerCase().includes('cancel')) {
        status = 'cancelled'
    }

    // Calculate delay in minutes
    let delayMinutes = 0
    if (departure.scheduledTimeLocal && departure.actualTimeLocal) {
        const scheduled = new Date(departure.scheduledTimeLocal)
        const actual = new Date(departure.actualTimeLocal)
        delayMinutes = Math.round((actual - scheduled) / 60000)
    }

    return {
        flightNumber: flight.number || '',
        status,
        isDelayed: delayMinutes > 15,
        delayMinutes,

        // Airline info
        airline: {
            name: airline.name || '',
            iata: airline.iataCode || ''
        },

        // Aircraft info
        aircraft: {
            model: aircraft.model || '',
            registration: aircraft.reg || ''
        },

        // Departure info
        departure: {
            airport: departure.airport?.iata || departure.airport?.icao || '',
            airportName: departure.airport?.name || '',
            terminal: departure.terminal || '',
            gate: departure.gate || '',
            scheduledTime: departure.scheduledTimeLocal || '',
            actualTime: departure.actualTimeLocal || '',
            scheduledTimeUtc: departure.scheduledTimeUtc || '',
            actualTimeUtc: departure.actualTimeUtc || ''
        },

        // Arrival info
        arrival: {
            airport: arrival.airport?.iata || arrival.airport?.icao || '',
            airportName: arrival.airport?.name || '',
            terminal: arrival.terminal || '',
            gate: arrival.gate || '',
            scheduledTime: arrival.scheduledTimeLocal || '',
            actualTime: arrival.actualTimeLocal || '',
            scheduledTimeUtc: arrival.scheduledTimeUtc || '',
            actualTimeUtc: arrival.actualTimeUtc || ''
        },

        // Raw status from API
        rawStatus: flight.status || ''
    }
}

/**
 * Clear flight cache (useful for forced refresh)
 */
export const clearFlightCache = () => {
    flightCache.clear()
}

/**
 * Check if API key is configured
 */
export const isFlightTrackingEnabled = () => {
    return !!RAPIDAPI_KEY
}

export default {
    getFlightStatus,
    clearFlightCache,
    isFlightTrackingEnabled
}
