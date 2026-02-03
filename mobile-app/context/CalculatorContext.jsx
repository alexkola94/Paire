/**
 * Calculator Context (React Native)
 * Global state management for the floating calculator.
 * Provides expression, result, and calculator visibility state.
 */

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CalculatorContext = createContext();

// Storage key for persisting calculator expression
const CALCULATOR_STORAGE_KEY = 'calculator_expression';

/**
 * Safely evaluate a mathematical expression without using eval()
 * Supports: +, -, *, /, parentheses, decimals
 * @param {string} expr - The expression to evaluate
 * @returns {number|null} - The result or null if invalid
 */
function safeEvaluate(expr) {
  try {
    if (!expr || typeof expr !== 'string') return null;
    
    // Clean the expression: remove spaces, replace × and ÷ with * and /
    let cleanExpr = expr
      .replace(/\s/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-');
    
    // Validate: only allow numbers, operators, decimals, and parentheses
    if (!/^[\d+\-*/().]+$/.test(cleanExpr)) return null;
    
    // Prevent division by zero patterns
    if (/\/0(?!\d)/.test(cleanExpr)) return null;
    
    // Simple tokenizer and parser for basic math expressions
    const tokens = [];
    let numBuffer = '';
    
    for (let i = 0; i < cleanExpr.length; i++) {
      const char = cleanExpr[i];
      
      if (/[\d.]/.test(char)) {
        numBuffer += char;
      } else {
        if (numBuffer) {
          tokens.push(parseFloat(numBuffer));
          numBuffer = '';
        }
        tokens.push(char);
      }
    }
    if (numBuffer) {
      tokens.push(parseFloat(numBuffer));
    }
    
    // Handle negative numbers at start or after operators
    const processedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const prev = processedTokens[processedTokens.length - 1];
      
      if (token === '-' && (processedTokens.length === 0 || ['+', '-', '*', '/', '('].includes(prev))) {
        // This is a negative sign, combine with next number
        if (i + 1 < tokens.length && typeof tokens[i + 1] === 'number') {
          processedTokens.push(-tokens[i + 1]);
          i++; // Skip next token
        } else {
          processedTokens.push(token);
        }
      } else {
        processedTokens.push(token);
      }
    }
    
    // Simple recursive descent parser
    let pos = 0;
    
    function parseExpression() {
      let result = parseTerm();
      
      while (pos < processedTokens.length) {
        const op = processedTokens[pos];
        if (op === '+' || op === '-') {
          pos++;
          const term = parseTerm();
          result = op === '+' ? result + term : result - term;
        } else {
          break;
        }
      }
      
      return result;
    }
    
    function parseTerm() {
      let result = parseFactor();
      
      while (pos < processedTokens.length) {
        const op = processedTokens[pos];
        if (op === '*' || op === '/') {
          pos++;
          const factor = parseFactor();
          result = op === '*' ? result * factor : result / factor;
        } else {
          break;
        }
      }
      
      return result;
    }
    
    function parseFactor() {
      const token = processedTokens[pos];
      
      if (token === '(') {
        pos++;
        const result = parseExpression();
        if (processedTokens[pos] === ')') pos++;
        return result;
      }
      
      if (typeof token === 'number') {
        pos++;
        return token;
      }
      
      return 0;
    }
    
    const result = parseExpression();
    
    // Check for valid result
    if (!isFinite(result) || isNaN(result)) return null;
    
    return result;
  } catch {
    return null;
  }
}

/**
 * Format a number for display
 * @param {number} num - The number to format
 * @returns {string} - Formatted string
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  
  // Check if it's an integer
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  
  // Round to 2 decimal places for display
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function CalculatorProvider({ children }) {
  // Calculator visibility states
  const [isOpen, setIsOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(true); // FAB visibility
  
  // Expression and result
  const [expression, setExpression] = useState('');
  
  // Load persisted expression on mount
  useEffect(() => {
    AsyncStorage.getItem(CALCULATOR_STORAGE_KEY).then((saved) => {
      if (saved) setExpression(saved);
    });
  }, []);
  
  // Persist expression changes
  useEffect(() => {
    if (expression) {
      AsyncStorage.setItem(CALCULATOR_STORAGE_KEY, expression);
    } else {
      AsyncStorage.removeItem(CALCULATOR_STORAGE_KEY);
    }
  }, [expression]);
  
  // Computed result
  const result = useMemo(() => {
    if (!expression) return null;
    return safeEvaluate(expression);
  }, [expression]);
  
  // Formatted display value
  const displayValue = useMemo(() => {
    return expression || '0';
  }, [expression]);
  
  // Computed result formatted
  const computedResult = useMemo(() => {
    if (result === null) return '';
    return formatNumber(result);
  }, [result]);
  
  // Toggle calculator open/closed
  const toggleCalculator = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);
  
  // Open calculator
  const openCalculator = useCallback(() => {
    setIsOpen(true);
  }, []);
  
  // Close calculator
  const closeCalculator = useCallback(() => {
    setIsOpen(false);
  }, []);
  
  // Hide/reveal the FAB button
  const revealCalculator = useCallback(() => {
    setIsRevealed(true);
  }, []);
  
  const hideCalculator = useCallback(() => {
    setIsRevealed(false);
    setIsOpen(false);
  }, []);
  
  // Append to expression
  const appendToExpression = useCallback((value) => {
    setExpression((prev) => {
      // Handle operators - don't allow consecutive operators
      const operators = ['+', '-', '×', '÷', '*', '/'];
      const lastChar = prev.slice(-1);
      
      if (operators.includes(value) && operators.includes(lastChar)) {
        // Replace last operator with new one
        return prev.slice(0, -1) + value;
      }
      
      // Handle decimal point - only one per number
      if (value === '.') {
        // Find the last number segment
        const parts = prev.split(/[+\-×÷*/]/);
        const lastPart = parts[parts.length - 1] || '';
        if (lastPart.includes('.')) return prev;
      }
      
      return prev + value;
    });
  }, []);
  
  // Clear entry (last character)
  const clearEntry = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
  }, []);
  
  // Clear all
  const clearAll = useCallback(() => {
    setExpression('');
  }, []);
  
  // Calculate and set result as new expression
  const calculate = useCallback(() => {
    if (result !== null) {
      setExpression(formatNumber(result).replace(/,/g, ''));
    }
  }, [result]);
  
  // Toggle sign (+/-)
  const toggleSign = useCallback(() => {
    setExpression((prev) => {
      if (!prev) return prev;
      if (prev.startsWith('-')) {
        return prev.slice(1);
      }
      return '-' + prev;
    });
  }, []);
  
  // Add a value from an expense item
  const addToCalculator = useCallback((value, operator = '+') => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setExpression((prev) => {
      if (!prev || prev === '0') {
        return String(numValue);
      }
      // Map operator to correct symbol
      const opMap = { '+': '+', '-': '-', '*': '×', '/': '÷', '×': '×', '÷': '÷' };
      const op = opMap[operator] || '+';
      return prev + op + numValue;
    });
    
    // Open calculator to show the added value
    setIsOpen(true);
  }, []);
  
  const value = {
    // State
    isOpen,
    isRevealed,
    expression,
    displayValue,
    result,
    computedResult,
    
    // Actions
    toggleCalculator,
    openCalculator,
    closeCalculator,
    revealCalculator,
    hideCalculator,
    appendToExpression,
    clearEntry,
    clearAll,
    calculate,
    toggleSign,
    addToCalculator,
    setExpression,
  };
  
  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculator() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error('useCalculator must be used within a CalculatorProvider') // i18n-ignore: dev;
  }
  return context;
}

export default CalculatorContext;
