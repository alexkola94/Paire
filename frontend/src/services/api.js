import { getToken, getStoredUser } from './auth'

/**
 * API Service for database operations
 * Uses custom backend API with JWT authentication
 */

// ========================================
// Backend API Configuration
// ========================================

import { getBackendUrl as getBackendApiUrl } from '../utils/getBackendUrl';

/**
 * Get current authenticated user
 * @returns {Object|null} User object or null if not authenticated
 */
const getCurrentUser = () => {
  const token = getToken()
  const user = getStoredUser()
  
  if (!token || !user) {
    throw new Error('User not authenticated')
  }
  
  return user
}

/**
 * Make authenticated API request to backend
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
const apiRequest = async (url, options = {}) => {
  const token = getToken()
  // Get URL dynamically on each request to ensure it uses current window location
  let backendApiUrl = getBackendApiUrl()
  
  // CRITICAL SAFETY CHECK: If we're on an IP but got localhost, FORCE use the IP
  if (typeof window !== 'undefined' && window.location) {
    const currentHostname = window.location.hostname
    const currentProtocol = window.location.protocol
    
    // If we're accessing via IP but got localhost, something is very wrong
    if (currentHostname && 
        currentHostname !== 'localhost' && 
        currentHostname !== '127.0.0.1' &&
        backendApiUrl.includes('localhost')) {
      // FORCE use the IP - override whatever getBackendApiUrl() returned
      backendApiUrl = `${currentProtocol}//${currentHostname}:5038`
    }
  }
  
  const fullUrl = `${backendApiUrl}${url}`
  
  const headers = {
    ...options.headers
  }

  // Add Content-Type for POST/PUT requests with body
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers
    })

    // For DELETE requests, don't try to parse JSON if there's no content
    if (options.method === 'DELETE' && response.status === 204) {
      return
    }

    if (!response.ok) {
      const errorData = await response.text().catch(() => '')
      const errorMessage = errorData || `HTTP error! status: ${response.status}`
      throw new Error(errorMessage)
    }

    // Only parse JSON if there's content
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return await response.text()
  } catch (error) {
    // Network errors (CORS, connection refused, etc.)
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to API at ${fullUrl}. Please check if the server is running and CORS is configured correctly.`)
    }
    throw error
  }
}

// ========================================
// Transactions (Expenses & Income)
// ========================================

export const transactionService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams()
    if (filters.type) params.append('type', filters.type)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    return await apiRequest(`/api/transactions?${params}`)
  },

  async getById(id) {
    return await apiRequest(`/api/transactions/${id}`)
  },

  async create(transaction) {
    return await apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    })
  },

  async update(id, updates) {
    return await apiRequest(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async delete(id) {
    await apiRequest(`/api/transactions/${id}`, {
      method: 'DELETE'
    })
  },

  async getSummary(startDate, endDate) {
    const transactions = await this.getAll({ startDate, endDate })

    const summary = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'expense') {
        acc.expenses += transaction.amount
      } else if (transaction.type === 'income') {
        acc.income += transaction.amount
      }
      return acc
    }, { income: 0, expenses: 0 })

    summary.balance = summary.income - summary.expenses
    
    return summary
  }
}

// ========================================
// Loans
// ========================================

export const loanService = {
  async getAll() {
    return await apiRequest('/api/loans')
  },

  async getById(id) {
    return await apiRequest(`/api/loans/${id}`)
  },

  async create(loan) {
    return await apiRequest('/api/loans', {
      method: 'POST',
      body: JSON.stringify(loan)
    })
  },

  async update(id, updates) {
    return await apiRequest(`/api/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async delete(id) {
    await apiRequest(`/api/loans/${id}`, {
      method: 'DELETE'
    })
  }
}

// ========================================
// File Attachments (Not implemented yet)
// ========================================

export const storageService = {
  async uploadFile(file, bucket = 'receipts') {
    // TODO: Implement file upload to your backend
    throw new Error('File upload not implemented yet')
  },

  async deleteFile(path, bucket = 'receipts') {
    // TODO: Implement file deletion
    throw new Error('File deletion not implemented yet')
  },

  getPublicUrl(path, bucket = 'receipts') {
    // TODO: Return file URL from your backend
    return ''
  }
}

// ========================================
// User Profile Service
// ========================================

export const profileService = {
  async getProfile(userId) {
    return await apiRequest(`/api/profile/${userId}`)
  },

  async getMyProfile() {
    return await apiRequest('/api/profile')
  },

  async updateProfile(userId, profileData) {
    // Use the endpoint with ID (legacy support)
    return await apiRequest(`/api/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  },

  async updateMyProfile(profileData) {
    // Use the endpoint without ID (uses authenticated user from JWT)
    return await apiRequest('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    })
  },

  async uploadAvatar(file, userId) {
    // TODO: Implement avatar upload
    throw new Error('Avatar upload not implemented yet')
  }
}

// ========================================
// Partnership Service
// ========================================

export const partnershipService = {
  async getMyPartnership() {
    return await apiRequest('/api/partnership')
  },

  async createPartnership(partnerId) {
    return await apiRequest('/api/partnership', {
      method: 'POST',
      body: JSON.stringify({ partnerId })
    })
  },

  async findUserByEmail(email) {
    return await apiRequest(`/api/users/find-by-email?email=${encodeURIComponent(email)}`)
  },

  async endPartnership(partnershipId) {
    await apiRequest(`/api/partnership/${partnershipId}`, {
      method: 'DELETE'
    })
  },

  async sendInvitation(email) {
    return await apiRequest('/api/partnership/invite', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
  },

  async getInvitationDetails(token) {
    return await apiRequest(`/api/partnership/invitation/${token}`)
  },

  async acceptInvitation(token) {
    return await apiRequest('/api/partnership/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token })
    })
  },

  async getPendingInvitations() {
    return await apiRequest('/api/partnership/pending-invitations')
  }
}

// ========================================
// Budget Service
// ========================================

export const budgetService = {
  async getAll() {
    return await apiRequest('/api/budgets')
  },

  async getById(id) {
    return await apiRequest(`/api/budgets/${id}`)
  },

  async create(budgetData) {
    const now = new Date()
    const budget = {
      ...budgetData,
      startDate: budgetData.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: budgetData.endDate || null,
      spentAmount: 0,
      isActive: true
    }

    return await apiRequest('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budget)
    })
  },

  async update(id, budgetData) {
    return await apiRequest(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...budgetData })
    })
  },

  async delete(id) {
    await apiRequest(`/api/budgets/${id}`, {
      method: 'DELETE'
    })
  }
}

// ========================================
// Analytics Service
// ========================================

export const analyticsService = {
  async getFinancialAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    return await apiRequest(`/api/analytics/financial?${params}`)
  },

  async getLoanAnalytics(startDate = null, endDate = null) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    return await apiRequest(`/api/analytics/loans?${params}`)
  },

  async getHouseholdAnalytics() {
    return await apiRequest('/api/analytics/household')
  },

  async getComparativeAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    return await apiRequest(`/api/analytics/comparative?${params}`)
  },

  async getDashboardAnalytics() {
    return await apiRequest('/api/analytics/dashboard')
  },

  async getAllAnalytics(startDate, endDate) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    return await apiRequest(`/api/analytics/all?${params}`)
  }
}

// ========================================
// Chatbot Service
// ========================================

export const chatbotService = {
  async sendQuery(query, history = []) {
    return await apiRequest('/api/chatbot/query', {
      method: 'POST',
      body: JSON.stringify({ query, history })
    })
  },

  async getSuggestions() {
    return await apiRequest('/api/chatbot/suggestions')
  }
}

// ========================================
// Savings Goals Service
// ========================================

export const savingsGoalService = {
  async getAll() {
    return await apiRequest('/api/savingsgoals')
  },

  async getById(id) {
    return await apiRequest(`/api/savingsgoals/${id}`)
  },

  async create(goalData) {
    return await apiRequest('/api/savingsgoals', {
      method: 'POST',
      body: JSON.stringify(goalData)
    })
  },

  async update(id, goalData) {
    return await apiRequest(`/api/savingsgoals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...goalData })
    })
  },

  async delete(id) {
    await apiRequest(`/api/savingsgoals/${id}`, {
      method: 'DELETE'
    })
  },

  async addDeposit(id, amount) {
    return await apiRequest(`/api/savingsgoals/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  },

  async withdraw(id, amount) {
    return await apiRequest(`/api/savingsgoals/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    })
  },

  async getSummary() {
    return await apiRequest('/api/savingsgoals/summary')
  }
}

// ========================================
// Loan Payments Service
// ========================================

export const loanPaymentService = {
  async getByLoan(loanId) {
    return await apiRequest(`/api/loanpayments/by-loan/${loanId}`)
  },

  async getAll() {
    return await apiRequest('/api/loanpayments')
  },

  async create(paymentData) {
    return await apiRequest('/api/loanpayments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    })
  },

  async update(id, paymentData) {
    return await apiRequest(`/api/loanpayments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...paymentData })
    })
  },

  async delete(id) {
    await apiRequest(`/api/loanpayments/${id}`, {
      method: 'DELETE'
    })
  },

  async getSummary(loanId) {
    return await apiRequest(`/api/loanpayments/summary/${loanId}`)
  }
}

// ========================================
// Recurring Bills Service
// ========================================

export const recurringBillService = {
  async getAll() {
    return await apiRequest('/api/recurringbills')
  },

  async getById(id) {
    return await apiRequest(`/api/recurringbills/${id}`)
  },

  async create(billData) {
    return await apiRequest('/api/recurringbills', {
      method: 'POST',
      body: JSON.stringify(billData)
    })
  },

  async update(id, billData) {
    return await apiRequest(`/api/recurringbills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...billData })
    })
  },

  async delete(id) {
    await apiRequest(`/api/recurringbills/${id}`, {
      method: 'DELETE'
    })
  },

  async markPaid(id) {
    return await apiRequest(`/api/recurringbills/${id}/mark-paid`, {
      method: 'POST'
    })
  },

  async getUpcoming(days = 30) {
    return await apiRequest(`/api/recurringbills/upcoming?days=${days}`)
  },

  async getSummary() {
    return await apiRequest('/api/recurringbills/summary')
  }
}

// ========================================
// Shopping Lists Service
// ========================================

export const shoppingListService = {
  async getAll() {
    return await apiRequest('/api/shoppinglists')
  },

  async getById(id) {
    return await apiRequest(`/api/shoppinglists/${id}`)
  },

  async create(listData) {
    return await apiRequest('/api/shoppinglists', {
      method: 'POST',
      body: JSON.stringify(listData)
    })
  },

  async update(id, listData) {
    return await apiRequest(`/api/shoppinglists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...listData })
    })
  },

  async delete(id) {
    await apiRequest(`/api/shoppinglists/${id}`, {
      method: 'DELETE'
    })
  },

  async complete(id) {
    return await apiRequest(`/api/shoppinglists/${id}/complete`, {
      method: 'POST'
    })
  },

  // Items
  async getItems(listId) {
    return await apiRequest(`/api/shoppinglists/${listId}/items`)
  },

  async addItem(listId, itemData) {
    return await apiRequest(`/api/shoppinglists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData)
    })
  },

  async updateItem(listId, itemId, itemData) {
    return await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ id: itemId, ...itemData })
    })
  },

  async deleteItem(listId, itemId) {
    await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}`, {
      method: 'DELETE'
    })
  },

  async toggleItem(listId, itemId) {
    return await apiRequest(`/api/shoppinglists/${listId}/items/${itemId}/toggle`, {
      method: 'POST'
    })
  },

  async getSummary() {
    return await apiRequest('/api/shoppinglists/summary')
  }
}

// ========================================
// Reminder Service
// ========================================

export const reminderService = {
  async getSettings() {
    getCurrentUser() // Ensure user is authenticated
    return await apiRequest('/api/reminders/settings')
  },

  async updateSettings(settings) {
    return await apiRequest('/api/reminders/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  },

  async sendTestEmail(email) {
    return await apiRequest(`/api/reminders/test-email?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })
  },

  async checkReminders() {
    return await apiRequest('/api/reminders/check', {
      method: 'POST'
    })
  }
}
