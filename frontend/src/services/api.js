import { supabase } from './supabase'

/**
 * API Service for database operations
 * Uses Supabase client for all CRUD operations
 */

// ========================================
// Transactions (Expenses & Income)
// ========================================

export const transactionService = {
  /**
   * Get all transactions with optional filters
   * @param {Object} filters - Filter options (type, startDate, endDate)
   */
  async getAll(filters = {}) {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.startDate) {
      query = query.gte('date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  /**
   * Get a single transaction by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new transaction
   */
  async create(transaction) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()

    if (error) throw error
    return data[0]
  },

  /**
   * Update an existing transaction
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  /**
   * Delete a transaction
   */
  async delete(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Get summary statistics
   */
  async getSummary(startDate, endDate) {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) throw error

    // Calculate totals
    const summary = data.reduce((acc, transaction) => {
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
  /**
   * Get all loans
   */
  async getAll() {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  /**
   * Get a single loan by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a new loan
   */
  async create(loan) {
    const { data, error } = await supabase
      .from('loans')
      .insert([loan])
      .select()

    if (error) throw error
    return data[0]
  },

  /**
   * Update a loan
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  /**
   * Delete a loan
   */
  async delete(id) {
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id)

    if (error) throw error
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

