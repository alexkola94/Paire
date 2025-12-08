import { getBackendUrl } from '../utils/getBackendUrl'
import { getToken } from './auth'

const getHeaders = () => {
    const token = getToken()
    if (!token) {
        console.warn('No authentication token found')
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
}

export const openBankingService = {
    /**
     * Get list of available banks (ASPSPs) for a country
     * @param {string} country - Two-letter ISo country code (default: FI)
     */
    getAspsps: async (country = 'FI') => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/aspsps?country=${country}`, {
                headers: getHeaders()
            })

            if (!response.ok) throw new Error('Failed to fetch banks')

            const data = await response.json()
            return data.aspsps || []
        } catch (error) {
            console.error('Error getting banks:', error)
            throw error
        }
    },

    /**
     * Start authorization flow for a specific bank
     * @param {string} bankName 
     * @param {string} country 
     * @returns {string} Authorization URL to redirect to
     */
    startAuthorization: async (bankName, country) => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/login`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ bankName, country })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to start authorization')
            }

            const data = await response.json()
            return data.authorizationUrl
        } catch (error) {
            console.error('Error starting authorization:', error)
            throw error
        }
    },

    /**
     * Get connected accounts
     */
    getAccounts: async () => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/accounts`, {
                headers: getHeaders()
            })

            if (!response.ok) throw new Error('Failed to fetch accounts')

            const data = await response.json()
            return data.accounts || []
        } catch (error) {
            console.error('Error getting accounts:', error)
            throw error
        }
    },

    /**
     * Disconnect all bank accounts
     */
    disconnect: async () => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/disconnect`, {
                method: 'DELETE',
                headers: getHeaders()
            })

            if (!response.ok) {
                let errorMessage = 'Failed to disconnect'
                try {
                    const contentType = response.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json()
                        errorMessage = error.error || error.message || errorMessage
                    } else {
                        const text = await response.text()
                        errorMessage = text || errorMessage
                    }
                } catch (parseError) {
                    errorMessage = response.statusText || errorMessage
                }
                
                if (response.status === 401) {
                    errorMessage = 'Unauthorized. Please log in again.'
                }
                
                throw new Error(errorMessage)
            }
            
            // Try to parse JSON if there's content
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json()
                return data
            }
            
            return true
        } catch (error) {
            console.error('Error disconnecting:', error)
            throw error
        }
    },

    /**
     * Disconnect a single account
     * @param {string} accountId - The account ID (GUID) to disconnect
     */
    disconnectAccount: async (accountId) => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/accounts/${accountId}`, {
                method: 'DELETE',
                headers: getHeaders()
            })

            if (!response.ok) {
                let errorMessage = 'Failed to disconnect account'
                try {
                    const contentType = response.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const error = await response.json()
                        errorMessage = error.error || error.message || errorMessage
                    } else {
                        const text = await response.text()
                        errorMessage = text || errorMessage
                    }
                } catch (parseError) {
                    // If we can't parse the error, use status text
                    errorMessage = response.statusText || errorMessage
                }
                
                if (response.status === 401) {
                    errorMessage = 'Unauthorized. Please log in again.'
                } else if (response.status === 404) {
                    errorMessage = 'Account not found'
                }
                
                throw new Error(errorMessage)
            }
            
            // Try to parse JSON if there's content, otherwise just return true
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json()
                return data
            }
            
            return true
        } catch (error) {
            console.error('Error disconnecting account:', error)
            throw error
        }
    }
}
