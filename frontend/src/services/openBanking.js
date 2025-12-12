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
     * Create a Link Token for initializing Plaid Link
     * @returns {string} The link_token
     */
    createLinkToken: async () => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/link-token`, {
                method: 'POST',
                headers: getHeaders()
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create link token')
            }

            const data = await response.json()
            return data.link_token
        } catch (error) {
            console.error('Error creating link token:', error)
            throw error
        }
    },

    /**
     * Exchange public token for access token
     * @param {string} publicToken 
     * @param {object} metadata - Metadata from Plaid Link (institution name, etc.)
     */
    exchangePublicToken: async (publicToken, metadata) => {
        try {
            const response = await fetch(`${getBackendUrl()}/api/open-banking/exchange-token`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    publicToken,
                    institutionId: metadata?.institution?.institution_id,
                    institutionName: metadata?.institution?.name
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to connect bank')
            }

            return await response.json()
        } catch (error) {
            console.error('Error exchanging token:', error)
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
                const error = await response.json()
                throw new Error(error.error || 'Failed to disconnect')
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
                const error = await response.json()
                throw new Error(error.error || 'Failed to disconnect account')
            }

            return true
        } catch (error) {
            console.error('Error disconnecting account:', error)
            throw error
        }
    }
}
