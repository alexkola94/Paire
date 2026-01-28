import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    FiX, 
    FiDelete,
    FiPercent,
    FiDivide,
    FiPlus,
    FiMinus
} from 'react-icons/fi'
import { useCalculator } from '../context/CalculatorContext'
import './GlobalCalculator.css'

/**
 * Calculator Icon Component
 * Custom calculator icon for the FAB
 */
const CalculatorIcon = memo(({ size = 24 }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="8" y2="10.01" />
        <line x1="12" y1="10" x2="12" y2="10.01" />
        <line x1="16" y1="10" x2="16" y2="10.01" />
        <line x1="8" y1="14" x2="8" y2="14.01" />
        <line x1="12" y1="14" x2="12" y2="14.01" />
        <line x1="16" y1="14" x2="16" y2="14.01" />
        <line x1="8" y1="18" x2="8" y2="18.01" />
        <line x1="12" y1="18" x2="12" y2="18.01" />
        <line x1="16" y1="18" x2="16" y2="18.01" />
    </svg>
))
CalculatorIcon.displayName = 'CalculatorIcon'

/**
 * Calculator Button Component
 * Renders a single calculator button with proper styling
 */
const CalcButton = memo(({ 
    children, 
    onClick, 
    variant = 'default', 
    span = 1,
    ariaLabel 
}) => (
    <button
        type="button"
        className={`calc-btn calc-btn-${variant}`}
        onClick={onClick}
        style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
    >
        {children}
    </button>
))
CalcButton.displayName = 'CalcButton'

/**
 * GlobalCalculator Component
 * A floating action button that expands into a full calculator
 * Mobile-first design with bottom sheet on mobile and popover on desktop
 */
function GlobalCalculator() {
    const { t } = useTranslation()
    const panelRef = useRef(null)
    const fabRef = useRef(null)
    
    const {
        isOpen,
        isRevealed,
        expression,
        displayValue,
        result,
        computedResult,
        justAdded,
        hasExpression,
        toggleCalculator,
        closeCalculator,
        revealCalculator,
        hideCalculator,
        appendToExpression,
        backspace,
        clearAll,
        clearEntry,
        calculate,
        toggleSign
    } = useCalculator()
    
    // Detect mobile
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])
    
    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                panelRef.current && 
                !panelRef.current.contains(event.target) &&
                fabRef.current &&
                !fabRef.current.contains(event.target)
            ) {
                closeCalculator()
            }
        }
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, closeCalculator])
    
    // Handle escape key to close
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isOpen) {
                closeCalculator()
            }
        }
        
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, closeCalculator])
    
    // Hide chatbot when calculator is revealed or open
    useEffect(() => {
        if (isRevealed || isOpen) {
            document.body.classList.add('calculator-open')
        } else {
            document.body.classList.remove('calculator-open')
        }
        
        return () => {
            document.body.classList.remove('calculator-open')
        }
    }, [isRevealed, isOpen])
    
    // Keyboard input support
    useEffect(() => {
        const handleKeyboard = (event) => {
            if (!isOpen) return
            
            const key = event.key
            
            // Prevent default for calculator keys to avoid page scrolling
            if (/^[0-9.+\-*/=]$/.test(key) || key === 'Enter' || key === 'Backspace' || key === 'Delete') {
                event.preventDefault()
            }
            
            // Handle numeric keys
            if (/^[0-9.]$/.test(key)) {
                appendToExpression(key)
            }
            // Handle operators
            else if (['+', '-', '*', '/'].includes(key)) {
                appendToExpression(key)
            }
            // Handle equals
            else if (key === '=' || key === 'Enter') {
                calculate()
            }
            // Handle backspace
            else if (key === 'Backspace') {
                backspace()
            }
            // Handle clear
            else if (key === 'Delete') {
                clearAll()
            }
        }
        
        if (isOpen) {
            document.addEventListener('keydown', handleKeyboard)
        }
        
        return () => {
            document.removeEventListener('keydown', handleKeyboard)
        }
    }, [isOpen, appendToExpression, calculate, backspace, clearAll])
    
    // Format display value for better readability
    const formatDisplay = useCallback((value) => {
        if (!value || value === '0') return '0'
        
        // Add thousand separators to numbers in expression
        return value.replace(/\d+\.?\d*/g, (match) => {
            const parts = match.split('.')
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            return parts.join('.')
        })
    }, [])
    
    // Format result (simple format for reliability on iOS PWA; avoid toLocaleString if needed)
    const formatResultForDisplay = useCallback((value) => {
        if (value === null || value === undefined) return null
        const num = Number(value)
        if (!Number.isFinite(num)) return null
        const formatted = num % 1 === 0 ? String(num) : num.toFixed(2)
        return `= ${formatted}`
    }, [])
    
    // Animation variants
    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    }
    
    const panelVariants = {
        hidden: { 
            opacity: 0, 
            y: 20,
            scale: 0.95
        },
        visible: { 
            opacity: 1, 
            y: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 30
            }
        },
        exit: {
            opacity: 0,
            y: 20,
            scale: 0.95,
            transition: { duration: 0.2 }
        }
    }
    
    const fabVariants = {
        idle: { scale: 1 },
        pulse: { 
            scale: [1, 1.15, 1],
            transition: { duration: 0.4 }
        }
    }
    
    return (
        <>
            {/* Reveal Button - Shows when not revealed (first tap) */}
            {!isRevealed && (
                <motion.button
                    type="button"
                    className="calculator-reveal-btn"
                    onClick={revealCalculator}
                    aria-label={t('calculator.reveal', 'Show calculator')}
                    title={t('calculator.reveal', 'Show calculator')}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <CalculatorIcon size={18} />
                </motion.button>
            )}
            
            {/* FAB Button - Shows when revealed but not open (second tap opens) */}
            {isRevealed && !isOpen && (
                <motion.button
                    ref={fabRef}
                    type="button"
                    className={`calculator-fab ${hasExpression ? 'has-value' : ''}`}
                    onClick={toggleCalculator}
                    aria-label={t('calculator.title', 'Calculator')}
                    title={t('calculator.title', 'Calculator')}
                    variants={fabVariants}
                    animate={justAdded ? 'pulse' : 'idle'}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <CalculatorIcon size={24} />
                    {/* Badge indicator when expression exists */}
                    {hasExpression && (
                        <span className="calculator-fab-badge" />
                    )}
                </motion.button>
            )}
            
            {/* FAB Button - Shows when open (for desktop) */}
            {isOpen && !isMobile && (
                <motion.button
                    ref={fabRef}
                    type="button"
                    className={`calculator-fab active ${hasExpression ? 'has-value' : ''}`}
                    onClick={toggleCalculator}
                    aria-label={t('calculator.title', 'Calculator')}
                    title={t('calculator.title', 'Calculator')}
                    variants={fabVariants}
                    animate={justAdded ? 'pulse' : 'idle'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <CalculatorIcon size={24} />
                </motion.button>
            )}
            
            {/* Calculator Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay for mobile */}
                        <motion.div
                            className="calculator-overlay"
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            onClick={closeCalculator}
                            aria-hidden="true"
                        />
                        
                        {/* Calculator Panel */}
                        <motion.div
                            ref={panelRef}
                            className="calculator-panel"
                            variants={panelVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="calculator-title"
                        >
                            {/* Header */}
                            <div className="calculator-header">
                                <h3 id="calculator-title">
                                    <CalculatorIcon size={18} />
                                    {t('calculator.title', 'Calculator')}
                                </h3>
                                <button
                                    type="button"
                                    className="calculator-close"
                                    onClick={closeCalculator}
                                    aria-label={t('common.close', 'Close')}
                                >
                                    <FiX size={20} />
                                </button>
                            </div>
                            
                            {/* Display: single block so result cannot be clipped (iOS PWA fix) */}
                            <div className="calculator-display" role="region" aria-label="Calculator display">
                                <div className="calculator-display-inner">
                                    <span className="calculator-expression">
                                        {formatDisplay(displayValue)}
                                    </span>
                                    {computedResult != null && (
                                        <span className="calculator-result-line">
                                            {formatResultForDisplay(computedResult)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Keypad */}
                            <div className="calculator-keypad">
                                {/* Row 1: AC, C, ±, ÷ */}
                                <CalcButton 
                                    variant="function" 
                                    onClick={clearAll}
                                    ariaLabel={t('calculator.allClear', 'All Clear')}
                                >
                                    AC
                                </CalcButton>
                                <CalcButton 
                                    variant="function" 
                                    onClick={clearEntry}
                                    ariaLabel={t('calculator.clear', 'Clear')}
                                >
                                    C
                                </CalcButton>
                                <CalcButton 
                                    variant="function" 
                                    onClick={toggleSign}
                                    ariaLabel="Plus/Minus"
                                >
                                    ±
                                </CalcButton>
                                <CalcButton 
                                    variant="operator" 
                                    onClick={() => appendToExpression('/')}
                                    ariaLabel="Divide"
                                >
                                    <FiDivide size={18} />
                                </CalcButton>
                                
                                {/* Row 2: 7, 8, 9, × */}
                                <CalcButton onClick={() => appendToExpression('7')}>7</CalcButton>
                                <CalcButton onClick={() => appendToExpression('8')}>8</CalcButton>
                                <CalcButton onClick={() => appendToExpression('9')}>9</CalcButton>
                                <CalcButton 
                                    variant="operator" 
                                    onClick={() => appendToExpression('*')}
                                    ariaLabel="Multiply"
                                >
                                    ×
                                </CalcButton>
                                
                                {/* Row 3: 4, 5, 6, - */}
                                <CalcButton onClick={() => appendToExpression('4')}>4</CalcButton>
                                <CalcButton onClick={() => appendToExpression('5')}>5</CalcButton>
                                <CalcButton onClick={() => appendToExpression('6')}>6</CalcButton>
                                <CalcButton 
                                    variant="operator" 
                                    onClick={() => appendToExpression('-')}
                                    ariaLabel="Subtract"
                                >
                                    <FiMinus size={18} />
                                </CalcButton>
                                
                                {/* Row 4: 1, 2, 3, + */}
                                <CalcButton onClick={() => appendToExpression('1')}>1</CalcButton>
                                <CalcButton onClick={() => appendToExpression('2')}>2</CalcButton>
                                <CalcButton onClick={() => appendToExpression('3')}>3</CalcButton>
                                <CalcButton 
                                    variant="operator" 
                                    onClick={() => appendToExpression('+')}
                                    ariaLabel="Add"
                                >
                                    <FiPlus size={18} />
                                </CalcButton>
                                
                                {/* Row 5: 0, ., ⌫, = */}
                                <CalcButton onClick={() => appendToExpression('0')}>0</CalcButton>
                                <CalcButton onClick={() => appendToExpression('.')}>.</CalcButton>
                                <CalcButton 
                                    variant="function" 
                                    onClick={backspace}
                                    ariaLabel="Backspace"
                                >
                                    <FiDelete size={18} />
                                </CalcButton>
                                <CalcButton 
                                    variant="equals" 
                                    onClick={calculate}
                                    ariaLabel="Equals"
                                >
                                    =
                                </CalcButton>
                            </div>
                            
                            {/* Hint */}
                            <div className="calculator-hint">
                                {t('calculator.hint', 'Tap expense amounts to add them here')}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

export default memo(GlobalCalculator)
