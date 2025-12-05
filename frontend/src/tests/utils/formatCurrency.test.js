import { describe, it, expect } from 'vitest'

// Utility function to test
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(100)).toBe('€100.00')
    expect(formatCurrency(1234.56)).toBe('€1,234.56')
  })

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('€0.00')
  })

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-50)).toBe('-€50.00')
  })

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('€1,000,000.00')
  })

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(99.999)).toBe('€100.00')
    expect(formatCurrency(99.994)).toBe('€99.99')
  })
})

