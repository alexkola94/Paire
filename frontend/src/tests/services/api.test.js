import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transactionService, loanService } from '../../services/api'

// Mock the dependencies
vi.mock('../../utils/getBackendUrl', () => ({
  getBackendUrl: vi.fn().mockReturnValue('http://localhost:5000')
}))

vi.mock('../../utils/tokenUtils', () => ({
  isTokenExpired: vi.fn().mockReturnValue(false)
}))

vi.mock('../../services/auth', () => ({
  getToken: vi.fn().mockReturnValue('fake-token'),
  getStoredUser: vi.fn().mockReturnValue({ id: 'user-1' })
}))

vi.mock('../../services/sessionManager', () => ({
  sessionManager: {
    clearSession: vi.fn()
  }
}))

// Mock global fetch
globalThis.fetch = vi.fn()

describe('API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch.mockResolvedValue({
      ok: true,
      headers: {
        get: () => 'application/json'
      },
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('')
    })
  })

  describe('transactionService', () => {
    describe('getAll', () => {
      it('should fetch transactions with correct URL and headers', async () => {
        const mockData = [{ id: 1, amount: 100 }]
        globalThis.fetch.mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(mockData)
        })

        const result = await transactionService.getAll({ type: 'expense' })

        expect(result).toEqual(mockData)
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/transactions?type=expense'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer fake-token'
            })
          })
        )
      })
    })

    describe('create', () => {
      it('should post new transaction', async () => {
        const newTransaction = { amount: 50, type: 'expense' }
        globalThis.fetch.mockResolvedValueOnce({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ id: 2, ...newTransaction })
        })

        await transactionService.create(newTransaction)

        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/transactions'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newTransaction)
          })
        )
      })
    })
  })

  describe('loanService', () => {
    it('should fetch loans', async () => {
      await loanService.getAll()
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/loans'),
        expect.any(Object)
      )
    })
  })
})
