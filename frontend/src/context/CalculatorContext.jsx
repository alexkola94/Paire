import { createContext, useContext, useState, useCallback, useEffect } from 'react'

/**
 * CalculatorContext
 * Provides global calculator state and functions accessible from any component.
 * Supports adding values from expense items and persists expression across navigation.
 */
const CalculatorContext = createContext()

// Session storage key for persisting calculator state
const STORAGE_KEY = 'calculator_expression'

/**
 * Safe expression evaluator - avoids eval() security issues
 * Supports basic arithmetic: +, -, *, /
 * @param {string} expression - Mathematical expression to evaluate
 * @returns {number|null} - Result or null if invalid
 */
const safeEvaluate = (expression) => {
    try {
        // Remove any characters that aren't numbers, operators, or decimal points
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, '')
        
        if (!sanitized || sanitized.length === 0) return null
        
        // Check for valid expression pattern
        const validPattern = /^[\d.]+([+\-*/][\d.]+)*$/
        if (!validPattern.test(sanitized)) return null
        
        // Use Function constructor as safer alternative to eval
        // eslint-disable-next-line no-new-func
        const result = new Function(`return ${sanitized}`)()
        
        // Check for valid number result
        if (typeof result !== 'number' || !isFinite(result)) return null
        
        return result
    } catch {
        return null
    }
}

/**
 * CalculatorProvider Component
 * Wraps the app to provide calculator functionality globally
 */
export const CalculatorProvider = ({ children }) => {
    // Calculator visibility state
    const [isOpen, setIsOpen] = useState(false)
    // Reveal state - shows the FAB button
    const [isRevealed, setIsRevealed] = useState(false)
    
    // Current expression (e.g., "100+50-25")
    const [expression, setExpression] = useState(() => {
        // Initialize from session storage if available
        const saved = sessionStorage.getItem(STORAGE_KEY)
        return saved || ''
    })
    
    // Current display value (what user sees while typing)
    const [displayValue, setDisplayValue] = useState('0')
    
    // Calculated result
    const [result, setResult] = useState(null)
    
    // Flag to indicate value was just added (for animation)
    const [justAdded, setJustAdded] = useState(false)
    
    // Persist expression to session storage
    useEffect(() => {
        if (expression) {
            sessionStorage.setItem(STORAGE_KEY, expression)
        } else {
            sessionStorage.removeItem(STORAGE_KEY)
        }
    }, [expression])
    
    // Calculate result whenever expression changes
    useEffect(() => {
        if (expression) {
            const calculated = safeEvaluate(expression)
            setResult(calculated)
            setDisplayValue(expression)
        } else {
            setResult(null)
            setDisplayValue('0')
        }
    }, [expression])
    
    /**
     * Toggle calculator visibility
     */
    const toggleCalculator = useCallback(() => {
        setIsOpen(prev => !prev)
    }, [])
    
    /**
     * Open calculator
     */
    const openCalculator = useCallback(() => {
        setIsOpen(true)
    }, [])
    
    /**
     * Close calculator
     */
    const closeCalculator = useCallback(() => {
        setIsOpen(false)
        // Always reset reveal when closing so chatbot can show again
        setIsRevealed(false)
    }, [])
    
    /**
     * Reveal calculator FAB (first tap)
     */
    const revealCalculator = useCallback(() => {
        setIsRevealed(true)
    }, [])
    
    /**
     * Hide calculator FAB (reset reveal state)
     */
    const hideCalculator = useCallback(() => {
        setIsRevealed(false)
        setIsOpen(false)
    }, [])
    
    /**
     * Add a value to the calculator with the chosen operator (from expense/income/bills etc.)
     * Appends "operator value" to the current expression (e.g. +50, -30, *2, /4)
     * @param {number} value - The value to add
     * @param {string} [operator='+'] - One of '+', '-', '*', '/'
     */
    const addToCalculator = useCallback((value, operator = '+') => {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return

        const op = ['+', '-', '*', '/'].includes(operator) ? operator : '+'

        // Format value (remove unnecessary decimals)
        const formattedValue = numValue % 1 === 0
            ? numValue.toString()
            : numValue.toFixed(2)

        setExpression(prev => {
            if (!prev || prev === '0') {
                return op === '-' ? `-${formattedValue}` : formattedValue
            }
            return `${prev}${op}${formattedValue}`
        })

        // Trigger animation flag
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 600)

        // Reveal calculator FAB so it shows active state (badge/pulse); do not auto-open panel
        setIsRevealed(true)
    }, [])
    
    /**
     * Append a character (digit or operator) to the expression
     * @param {string} char - Character to append
     */
    const appendToExpression = useCallback((char) => {
        setExpression(prev => {
            // Handle operators at the start
            if (!prev && ['+', '-', '*', '/'].includes(char)) {
                return char === '-' ? '-' : ''
            }
            
            // Prevent consecutive operators
            const lastChar = prev.slice(-1)
            if (['+', '-', '*', '/'].includes(lastChar) && ['+', '-', '*', '/'].includes(char)) {
                return prev.slice(0, -1) + char
            }
            
            // Prevent multiple decimal points in same number
            if (char === '.') {
                const parts = prev.split(/[+\-*/]/)
                const lastPart = parts[parts.length - 1]
                if (lastPart.includes('.')) return prev
            }
            
            return prev + char
        })
    }, [])
    
    /**
     * Clear the last character (backspace)
     */
    const backspace = useCallback(() => {
        setExpression(prev => prev.slice(0, -1))
    }, [])
    
    /**
     * Clear everything (AC - All Clear)
     */
    const clearAll = useCallback(() => {
        setExpression('')
        setDisplayValue('0')
        setResult(null)
    }, [])
    
    /**
     * Clear current entry (C - Clear)
     * Removes the last number in the expression
     */
    const clearEntry = useCallback(() => {
        setExpression(prev => {
            // Find the last operator and remove everything after it
            const match = prev.match(/^(.+[+\-*/])[^+\-*/]+$/)
            if (match) {
                return match[1]
            }
            return ''
        })
    }, [])
    
    /**
     * Calculate and display the result
     * Replaces expression with the result
     */
    const calculate = useCallback(() => {
        if (result !== null) {
            // Format result nicely
            const formattedResult = result % 1 === 0 
                ? result.toString() 
                : result.toFixed(2)
            setExpression(formattedResult)
        }
    }, [result])
    
    /**
     * Toggle sign of current number (positive/negative)
     */
    const toggleSign = useCallback(() => {
        setExpression(prev => {
            if (!prev) return '-'
            
            // Find the last number and toggle its sign
            const match = prev.match(/^(.*)([+\-*/]?)(\d+\.?\d*)$/)
            if (match) {
                const [, prefix, operator, number] = match
                if (operator === '-' && prefix) {
                    return `${prefix}+${number}`
                } else if (operator === '+') {
                    return `${prefix}-${number}`
                } else if (!operator && !prefix) {
                    return prev.startsWith('-') ? prev.slice(1) : `-${prev}`
                }
            }
            return prev
        })
    }, [])
    
    const value = {
        // State
        isOpen,
        isRevealed,
        expression,
        displayValue,
        result,
        justAdded,
        hasExpression: expression.length > 0,
        
        // Actions
        toggleCalculator,
        openCalculator,
        closeCalculator,
        revealCalculator,
        hideCalculator,
        addToCalculator,
        appendToExpression,
        backspace,
        clearAll,
        clearEntry,
        calculate,
        toggleSign,
        setExpression
    }
    
    return (
        <CalculatorContext.Provider value={value}>
            {children}
        </CalculatorContext.Provider>
    )
}

/**
 * useCalculator Hook
 * Access calculator context from any component
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useCalculator = () => {
    const context = useContext(CalculatorContext)
    if (context === undefined) {
        throw new Error('useCalculator must be used within a CalculatorProvider')
    }
    return context
}

export default CalculatorContext
