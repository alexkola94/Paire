import { createContext, useContext } from 'react'

/**
 * CurrencyPopoverContext
 * Allows opening the global CurrencyCalculatorPopover from anywhere (Dashboard, widgets, etc.)
 * without navigating to the old /currency-calculator page.
 * Provided by Layout; consumed by Dashboard quick-access and CurrencyCalculatorWidget.
 */
const CurrencyPopoverContext = createContext(null)

export function useCurrencyPopover() {
  const context = useContext(CurrencyPopoverContext)
  return context || { openCurrencyPopover: () => {}, closeCurrencyPopover: () => {} }
}

export default CurrencyPopoverContext
