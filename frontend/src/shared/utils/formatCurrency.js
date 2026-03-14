/**
 * Format currency values for display
 * Converts numbers to properly formatted currency strings
 * 
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'EUR')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted currency string
 * 
 * @example
 * formatCurrency(1234.56) // "€1,234.56"
 * formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 */
export function formatCurrency(amount, currency = 'EUR', locale = 'en-US') {
  // Handle invalid inputs
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '€0.00';
  }

  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Format using Intl.NumberFormat
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } catch (error) {
    // Fallback to simple format if Intl fails
    console.error('Currency formatting error:', error);
    return `€${numAmount.toFixed(2)}`;
  }
}

/**
 * Parse currency string to number
 * Removes currency symbols and formatting
 * 
 * @param {string} currencyString - Formatted currency string
 * @returns {number} Numeric value
 * 
 * @example
 * parseCurrency("€1,234.56") // 1234.56
 */
export function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  
  // Remove all non-digit characters except decimal point and minus
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format number with thousands separator
 * 
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 * 
 * @example
 * formatNumber(1234567.89) // "1,234,567.89"
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

