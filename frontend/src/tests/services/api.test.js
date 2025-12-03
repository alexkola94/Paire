import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionService, loanService } from '../../services/api'
import { supabase } from '../../services/supabase'

// Mock Supabase
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
  }
}))

describe('Transaction Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch all transactions', async () => {
      const mockData = [
        { id: '1', type: 'expense', amount: 50 },
        { id: '2', type: 'income', amount: 100 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      }

      supabase.from.mockReturnValue(mockQuery)

      const result = await transactionService.getAll()
      
      expect(result).toEqual(mockData)
      expect(supabase.from).toHaveBeenCalledWith('transactions')
    })

    it('should filter by type', async () => {
      const mockData = [{ id: '1', type: 'expense', amount: 50 }]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      supabase.from.mockReturnValue(mockQuery)

      await transactionService.getAll({ type: 'expense' })
      
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'expense')
    })
  })

  describe('create', () => {
    it('should create a transaction', async () => {
      const newTransaction = { type: 'expense', amount: 50, category: 'food' }
      const mockResponse = { id: '1', ...newTransaction }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null }),
      }

      supabase.from.mockReturnValue(mockQuery)

      const result = await transactionService.create(newTransaction)
      
      expect(result).toEqual(mockResponse)
      expect(mockQuery.insert).toHaveBeenCalledWith([newTransaction])
    })
  })

  describe('getSummary', () => {
    it('should calculate summary correctly', async () => {
      const mockData = [
        { type: 'income', amount: 1000 },
        { type: 'income', amount: 500 },
        { type: 'expense', amount: 300 },
        { type: 'expense', amount: 200 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      supabase.from.mockReturnValue(mockQuery)

      const result = await transactionService.getSummary('2024-01-01', '2024-01-31')
      
      expect(result).toEqual({
        income: 1500,
        expenses: 500,
        balance: 1000
      })
    })
  })
})

describe('Loan Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch all loans', async () => {
      const mockData = [
        { id: '1', type: 'given', amount: 100 },
        { id: '2', type: 'received', amount: 200 },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      supabase.from.mockReturnValue(mockQuery)

      const result = await loanService.getAll()
      
      expect(result).toEqual(mockData)
      expect(supabase.from).toHaveBeenCalledWith('loans')
    })
  })
})

