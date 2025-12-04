import { supabase } from './supabase'

/**
 * API Service for database operations
 * Uses Supabase client for all CRUD operations
 */

// ========================================
// Backend API Configuration
// ========================================

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5038';

// ========================================
// Transactions (Expenses & Income)
// ========================================

export const transactionService = {
  /**
   * Get all transactions with optional filters
   * Uses backend API with Entity Framework
   * @param {Object} filters - Filter options (type, startDate, endDate)
   */
  async getAll(filters = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const params = new URLSearchParams()
    if (filters.type) params.append('type', filters.type)
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)

    const response = await fetch(`${BACKEND_API_URL}/api/transactions?${params}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch transactions')
    return await response.json()
  },

  /**
   * Get a single transaction by ID
   */
  async getById(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/transactions/${id}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch transaction')
    return await response.json()
  },

  /**
   * Create a new transaction
   */
  async create(transaction) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(transaction)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create transaction: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update an existing transaction
   */
  async update(id, updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update transaction: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a transaction
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete transaction: ${error}`)
    }
  },

  /**
   * Get summary statistics
   * Uses the transactions API to fetch and calculate summary
   */
  async getSummary(startDate, endDate) {
    console.log('🔍 getSummary called with:', { startDate, endDate })
    
    // Use the backend API to get transactions
    const transactions = await this.getAll({ startDate, endDate })

    console.log('📊 Transactions fetched:', { 
      count: transactions?.length, 
      transactions 
    })

    // Calculate totals
    const summary = transactions.reduce((acc, transaction) => {
      console.log('  Processing transaction:', transaction)
      if (transaction.type === 'expense') {
        acc.expenses += transaction.amount
      } else if (transaction.type === 'income') {
        acc.income += transaction.amount
      }
      return acc
    }, { income: 0, expenses: 0 })

    summary.balance = summary.income - summary.expenses
    
    console.log('✅ Final summary:', summary)
    return summary
  }
}

// ========================================
// Loans
// ========================================

export const loanService = {
  /**
   * Get all loans
   * Uses backend API with Entity Framework
   */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loans`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch loans')
    return await response.json()
  },

  /**
   * Get a single loan by ID
   */
  async getById(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loans/${id}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch loan')
    return await response.json()
  },

  /**
   * Create a new loan
   */
  async create(loan) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(loan)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create loan: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update a loan
   */
  async update(id, updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update loan: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a loan
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loans/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete loan: ${error}`)
    }
  }
}

// ========================================
// File Attachments (Supabase Storage)
// ========================================

export const storageService = {
  /**
   * Upload a file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} bucket - Storage bucket name (default: 'receipts')
   */
  async uploadFile(file, bucket = 'receipts') {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) throw error

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return {
      path: filePath,
      url: urlData.publicUrl
    }
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(path, bucket = 'receipts') {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(path, bucket = 'receipts') {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }
}

// ========================================
// User Profile Service
// ========================================

export const profileService = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // Ignore not found
    return data
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    return data[0]
  },

  /**
   * Upload avatar to Supabase Storage
   */
  async uploadAvatar(file, userId) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-avatar.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Upload file (upsert to replace existing)
    const { error: uploadError } = await supabase.storage
      .from('receipts') // Using receipts bucket for now
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath)

    return publicUrl
  }
}

// ========================================
// Partnership Service
// ========================================

export const partnershipService = {
  /**
   * Get current user's partnership
   */
  async getMyPartnership() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get partnership
    const { data: partnership, error } = await supabase
      .from('partnerships')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignore not found
    if (!partnership) return null

    // Fetch user profiles separately
    const { data: user1Profile } = await supabase
      .from('user_profiles')
      .select('id, display_name, email, avatar_url')
      .eq('id', partnership.user1_id)
      .single()

    const { data: user2Profile } = await supabase
      .from('user_profiles')
      .select('id, display_name, email, avatar_url')
      .eq('id', partnership.user2_id)
      .single()

    // Combine data
    return {
      ...partnership,
      user1: user1Profile,
      user2: user2Profile
    }
  },

  /**
   * Create a new partnership
   */
  async createPartnership(partnerId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('partnerships')
      .insert({
        user1_id: user.id,
        user2_id: partnerId,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()

    if (error) throw error
    return data[0]
  },

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, email')
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  },

  /**
   * End partnership
   */
  async endPartnership(partnershipId) {
    const { error } = await supabase
      .from('partnerships')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', partnershipId)

    if (error) throw error
  }
}

// ========================================
// Budget Service
// ========================================

export const budgetService = {
  /**
   * Get all budgets for current user
   * Uses backend API with Entity Framework
   */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/budgets`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch budgets')
    return await response.json()
  },

  /**
   * Get a single budget by ID
   */
  async getById(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/budgets/${id}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch budget')
    return await response.json()
  },

  /**
   * Create a new budget
   */
  async create(budgetData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Set default dates if not provided
    const now = new Date()
    const budget = {
      ...budgetData,
      startDate: budgetData.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: budgetData.endDate || null,
      spentAmount: 0,
      isActive: true
    }

    const response = await fetch(`${BACKEND_API_URL}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(budget)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create budget: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update a budget
   */
  async update(id, budgetData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const budget = {
      id,
      ...budgetData
    }

    const response = await fetch(`${BACKEND_API_URL}/api/budgets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(budget)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update budget: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a budget
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/budgets/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete budget: ${error}`)
    }
  }
}

// ========================================
// ========================================
// Analytics Service
// ========================================

export const analyticsService = {
  /**
   * Get financial analytics for a date range
   */
  async getFinancialAnalytics(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/financial?${params}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch financial analytics')
    return await response.json()
  },

  /**
   * Get loan analytics
   */
  async getLoanAnalytics(startDate = null, endDate = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/loans?${params}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch loan analytics')
    return await response.json()
  },

  /**
   * Get household analytics
   */
  async getHouseholdAnalytics() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/household`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch household analytics')
    return await response.json()
  },

  /**
   * Get comparative analytics
   */
  async getComparativeAnalytics(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/comparative?${params}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch comparative analytics')
    return await response.json()
  },

  /**
   * Get dashboard analytics summary
   */
  async getDashboardAnalytics() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/dashboard`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch dashboard analytics')
    return await response.json()
  },

  /**
   * Get all analytics in one request
   */
  async getAllAnalytics(startDate, endDate) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await fetch(`${BACKEND_API_URL}/api/analytics/all?${params}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch analytics')
    return await response.json()
  }
}

// ========================================
// Chatbot Service
// ========================================

export const chatbotService = {
  /**
   * Send a query to the chatbot
   */
  async sendQuery(query, history = []) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/chatbot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify({ query, history })
    })

    if (!response.ok) throw new Error('Failed to process chatbot query')
    return await response.json()
  },

  /**
   * Get suggested questions
   */
  async getSuggestions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/chatbot/suggestions`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to get suggestions')
    return await response.json()
  }
}

// ========================================
// Savings Goals Service
// ========================================

export const savingsGoalService = {
  /**
   * Get all savings goals for current user
   * Uses backend API with Entity Framework
   */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch savings goals')
    return await response.json()
  },

  /**
   * Get a single savings goal by ID
   */
  async getById(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/${id}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch savings goal')
    return await response.json()
  },

  /**
   * Create a new savings goal
   */
  async create(goalData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(goalData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create savings goal: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update a savings goal
   */
  async update(id, goalData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const goal = {
      id,
      ...goalData
    }

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(goal)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update savings goal: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a savings goal
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete savings goal: ${error}`)
    }
  },

  /**
   * Add money to a savings goal (deposit)
   */
  async addDeposit(id, amount) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/${id}/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify({ amount })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to add deposit: ${error}`)
    }
    return await response.json()
  },

  /**
   * Withdraw money from a savings goal
   */
  async withdraw(id, amount) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/${id}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify({ amount })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to withdraw: ${error}`)
    }
    return await response.json()
  },

  /**
   * Get savings goals summary
   */
  async getSummary() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/savingsgoals/summary`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch savings goals summary')
    return await response.json()
  }
}

// ========================================
// Loan Payments Service
// ========================================

export const loanPaymentService = {
  /**
   * Get all payments for a specific loan
   */
  async getByLoan(loanId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments/by-loan/${loanId}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch loan payments')
    return await response.json()
  },

  /**
   * Get all loan payments for current user
   */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch loan payments')
    return await response.json()
  },

  /**
   * Create a new loan payment
   */
  async create(paymentData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(paymentData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create loan payment: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update a loan payment
   */
  async update(id, paymentData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const payment = {
      id,
      ...paymentData
    }

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(payment)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update loan payment: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a loan payment
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete loan payment: ${error}`)
    }
  },

  /**
   * Get payment summary for a loan
   */
  async getSummary(loanId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/loanpayments/summary/${loanId}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch payment summary')
    return await response.json()
  }
}

// ========================================
// Recurring Bills Service
// ========================================

export const recurringBillService = {
  /**
   * Get all recurring bills for current user
   */
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch recurring bills')
    return await response.json()
  },

  /**
   * Get a single recurring bill by ID
   */
  async getById(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/${id}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch recurring bill')
    return await response.json()
  },

  /**
   * Create a new recurring bill
   */
  async create(billData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(billData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create recurring bill: ${error}`)
    }
    return await response.json()
  },

  /**
   * Update a recurring bill
   */
  async update(id, billData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const bill = {
      id,
      ...billData
    }

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id
      },
      body: JSON.stringify(bill)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update recurring bill: ${error}`)
    }
    return await response.json()
  },

  /**
   * Delete a recurring bill
   */
  async delete(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/${id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete recurring bill: ${error}`)
    }
  },

  /**
   * Mark bill as paid (advances to next period)
   */
  async markPaid(id) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/${id}/mark-paid`, {
      method: 'POST',
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to mark bill as paid: ${error}`)
    }
    return await response.json()
  },

  /**
   * Get upcoming bills
   */
  async getUpcoming(days = 30) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/upcoming?days=${days}`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch upcoming bills')
    return await response.json()
  },

  /**
   * Get recurring bills summary
   */
  async getSummary() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/recurringbills/summary`, {
      headers: {
        'X-User-Id': user.id
      }
    })

    if (!response.ok) throw new Error('Failed to fetch recurring bills summary')
    return await response.json()
  }
}

// ========================================
// Reminder Service
// ========================================

export const reminderService = {
  /**
   * Get user reminder settings
   */
  async getSettings() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/reminders/settings?userId=${user.id}`)
    if (!response.ok) throw new Error('Failed to fetch reminder settings')
    return await response.json()
  },

  /**
   * Update user reminder settings
   */
  async updateSettings(settings) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/reminders/settings?userId=${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    })

    if (!response.ok) throw new Error('Failed to update reminder settings')
    return await response.json()
  },

  /**
   * Send a test email
   */
  async sendTestEmail(email) {
    const response = await fetch(`${BACKEND_API_URL}/api/reminders/test-email?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })

    if (!response.ok) throw new Error('Failed to send test email')
    return await response.json()
  },

  /**
   * Manually trigger reminder check
   */
  async checkReminders() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const response = await fetch(`${BACKEND_API_URL}/api/reminders/check?userId=${user.id}`, {
      method: 'POST'
    })

    if (!response.ok) throw new Error('Failed to check reminders')
    return await response.json()
  }
}

