import { useState, useEffect } from 'react'
import { transactionService } from '../services/api'

/**
 * Custom hook to fetch and manage recent transactions
 * Used for auto-complete, suggestions, and quick-fill features
 */
function useRecentTransactions(type = 'expense', limit = 20) {
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Fetch recent transactions
   */
  const fetchRecentTransactions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get transactions from the last 90 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)
      
      const transactions = await transactionService.getAll({
        type,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      })
      
      // Sort by date (most recent first) and limit
      const sorted = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit)
      
      setRecentTransactions(sorted)
    } catch (err) {
      console.error('Error fetching recent transactions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Get unique descriptions from recent transactions
   */
  const getUniqueDescriptions = () => {
    const descriptions = recentTransactions
      .map(t => t.description)
      .filter(d => d && d.trim().length > 0)
    
    // Remove duplicates and return
    return [...new Set(descriptions)]
  }

  /**
   * Get category frequency from recent transactions
   */
  const getCategoryFrequency = () => {
    const categoryCount = {}
    
    recentTransactions.forEach(t => {
      if (t.category) {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1
      }
    })
    
    // Sort by frequency (most used first)
    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)
  }

  /**
   * Find similar transactions (for duplicate detection)
   */
  const findSimilarTransactions = (amount, description, date, category) => {
    if (!amount || !description) return []
    
    const similar = recentTransactions.filter(t => {
      // Check if amount is very close (±1% or ±€0.10)
      const amountDiff = Math.abs(t.amount - amount)
      const amountMatch = amountDiff < Math.max(amount * 0.01, 0.10)
      
      // Check if description is similar (case-insensitive partial match)
      const descMatch = description.toLowerCase().includes(t.description?.toLowerCase() || '') ||
                       t.description?.toLowerCase().includes(description.toLowerCase() || '')
      
      // Check if same category
      const categoryMatch = !category || t.category === category
      
      // Check if date is within 7 days
      const dateDiff = Math.abs(new Date(t.date) - new Date(date))
      const daysDiff = dateDiff / (1000 * 60 * 60 * 24)
      const dateMatch = daysDiff <= 7
      
      return amountMatch && descMatch && categoryMatch && dateMatch
    })
    
    return similar
  }

  useEffect(() => {
    fetchRecentTransactions()
  }, [type])

  return {
    recentTransactions,
    loading,
    error,
    refetch: fetchRecentTransactions,
    getUniqueDescriptions,
    getCategoryFrequency,
    findSimilarTransactions
  }
}

export default useRecentTransactions

