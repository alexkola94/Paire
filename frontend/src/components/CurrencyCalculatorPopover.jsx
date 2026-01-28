import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { currencyService } from '../services/api'
import { FiRefreshCw, FiArrowRight, FiInfo, FiTrendingUp, FiX, FiCpu } from 'react-icons/fi'
import './CurrencyCalculatorPopover.css'

/**
 * CurrencyCalculatorPopover Component
 * A compact currency calculator that opens as a popover from the header
 * Provides quick access to currency conversion from any page
 *
 * @param {boolean} isOpen - External controlled open state (optional)
 * @param {function} onClose - Callback when popover closes (optional)
 * @param {boolean} showTrigger - Whether to show the trigger button (default: true)
 */
export default function CurrencyCalculatorPopover({
    isOpen: externalIsOpen,
    onClose: externalOnClose,
    showTrigger = true
}) {
    const { t } = useTranslation()
    const [internalIsOpen, setInternalIsOpen] = useState(false)

    // Support both controlled and uncontrolled modes
    const isControlled = externalIsOpen !== undefined
    const isOpen = isControlled ? externalIsOpen : internalIsOpen
    const [currencies, setCurrencies] = useState({})
    const [amount, setAmount] = useState(100)
    const [fromCurrency, setFromCurrency] = useState('EUR')
    const [toCurrency, setToCurrency] = useState('USD')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(false)
    const [error, setError] = useState(null)
    const [popularRates, setPopularRates] = useState(null)

    const popoverRef = useRef(null)
    const triggerRef = useRef(null)

    // Fetch currencies when popover opens
    useEffect(() => {
        if (isOpen && Object.keys(currencies).length === 0) {
            fetchCurrencies()
        }
    }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch rates when fromCurrency changes
    useEffect(() => {
        if (isOpen && fromCurrency) {
            fetchPopularRates()
        }
    }, [isOpen, fromCurrency]) // eslint-disable-line react-hooks/exhaustive-deps

    // Helper to close popover (handles both controlled and uncontrolled modes)
    const handleClose = useCallback(() => {
        if (isControlled && externalOnClose) {
            externalOnClose()
        } else {
            setInternalIsOpen(false)
        }
    }, [isControlled, externalOnClose])

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                (!triggerRef.current || !triggerRef.current.contains(event.target))
            ) {
                handleClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, handleClose])

    // Handle Escape key to close
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose()
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, handleClose])

    // Prevent body scroll when popover is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    const fetchCurrencies = async () => {
        try {
            setInitialLoading(true)
            const data = await currencyService.getCurrencies()
            setCurrencies(data)
        } catch (err) {
            console.error('Error fetching currencies:', err)
            setError(t('currencyCalculator.loadError'))
        } finally {
            setInitialLoading(false)
        }
    }

    const fetchPopularRates = async () => {
        try {
            const data = await currencyService.getRates(fromCurrency)
            setPopularRates(data)
        } catch (err) {
            console.error('Error fetching rates:', err)
        }
    }

    const handleConvert = async (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount)) return

        try {
            setLoading(true)
            setError(null)
            const data = await currencyService.convert(fromCurrency, toCurrency, amount)

            // Handle response format
            if (data && typeof data === 'object' && data.result) {
                setResult(data.result)
            } else {
                setResult(data)
            }
        } catch (err) {
            console.error('Error converting currency:', err)
            setError(t('currencyCalculator.error'))
        } finally {
            setLoading(false)
        }
    }

    const handleSwap = useCallback(() => {
        setFromCurrency(toCurrency)
        setToCurrency(fromCurrency)
        setResult(null)
    }, [fromCurrency, toCurrency])

    const togglePopover = useCallback(() => {
        if (isControlled) {
            // In controlled mode, toggle doesn't make sense, just close
            handleClose()
        } else {
            setInternalIsOpen(prev => !prev)
        }
    }, [isControlled, handleClose])

    return (
        <>
            {/* Trigger Button - only shown in uncontrolled mode */}
            {showTrigger && !isControlled && (
                <span
                    ref={triggerRef}
                    className={`header-icon-btn currency-popover-trigger ${isOpen ? 'active' : ''}`}
                    onClick={togglePopover}
                    aria-label={t('navigation.currencyCalculator')}
                    title={t('navigation.currencyCalculator')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            togglePopover()
                        }
                    }}
                >
                    <FiCpu size={22} />
                </span>
            )}

            {/* Popover Overlay and Content */}
            {isOpen && (
                <>
                    <div
                        className="currency-popover-overlay"
                        onClick={handleClose}
                        aria-hidden="true"
                    />
                    <div
                        ref={popoverRef}
                        className="currency-popover"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="currency-popover-title"
                    >
                        {/* Header */}
                        <div className="currency-popover-header">
                            <h3 id="currency-popover-title">
                                <FiCpu size={18} />
                                {t('currencyCalculator.title')}
                            </h3>
                            <button
                                className="currency-popover-close"
                                onClick={handleClose}
                                aria-label={t('common.close')}
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="currency-popover-content">
                            {initialLoading ? (
                                <div className="currency-popover-loading">
                                    <div className="currency-loading-spinner"></div>
                                    <span>{t('common.loading')}</span>
                                </div>
                            ) : (
                                <>
                                    <form onSubmit={handleConvert} className="currency-popover-form">
                                        {/* Amount Input */}
                                        <div className="currency-popover-amount">
                                            <label htmlFor="popover-amount">{t('currencyCalculator.amount')}</label>
                                            <input
                                                type="number"
                                                id="popover-amount"
                                                className="currency-popover-input"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                min="0"
                                                step="any"
                                                required
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Currency Selectors */}
                                        <div className="currency-popover-selectors">
                                            <select
                                                className="currency-popover-select"
                                                value={fromCurrency}
                                                onChange={(e) => setFromCurrency(e.target.value)}
                                                aria-label={t('currencyCalculator.from')}
                                            >
                                                {Object.entries(currencies).map(([code, name]) => (
                                                    <option key={code} value={code}>
                                                        {code}
                                                    </option>
                                                ))}
                                            </select>

                                            <button
                                                type="button"
                                                className="currency-popover-swap"
                                                onClick={handleSwap}
                                                aria-label={t('currencyCalculator.swap')}
                                            >
                                                <FiRefreshCw size={18} />
                                            </button>

                                            <select
                                                className="currency-popover-select"
                                                value={toCurrency}
                                                onChange={(e) => setToCurrency(e.target.value)}
                                                aria-label={t('currencyCalculator.to')}
                                            >
                                                {Object.entries(currencies).map(([code, name]) => (
                                                    <option key={code} value={code}>
                                                        {code}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Convert Button */}
                                        <button
                                            type="submit"
                                            className="currency-popover-convert"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <div className="currency-loading-spinner small"></div>
                                            ) : (
                                                <>
                                                    {t('currencyCalculator.convert')} <FiArrowRight size={16} />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Error */}
                                    {error && (
                                        <div className="currency-popover-error">
                                            {error}
                                        </div>
                                    )}

                                    {/* Result */}
                                    {result && (
                                        <div className="currency-popover-result">
                                            <div className="result-main">
                                                <span className="result-from-amount">
                                                    {Number(amount).toLocaleString()} {fromCurrency}
                                                </span>
                                                <span className="result-equals">=</span>
                                                <span className="result-to-amount">
                                                    {Number(result).toLocaleString(undefined, {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2
                                                    })} {toCurrency}
                                                </span>
                                            </div>
                                            <div className="result-rate">
                                                <FiInfo size={14} />
                                                <span>1 {fromCurrency} = {(result / amount).toFixed(4)} {toCurrency}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Popular Rates */}
                                    {popularRates && (
                                        <div className="currency-popover-rates">
                                            <div className="rates-header">
                                                <FiTrendingUp size={16} />
                                                <span>{t('currencyCalculator.popularRates', { currency: fromCurrency })}</span>
                                            </div>
                                            <div className="rates-grid">
                                                {Object.entries(popularRates)
                                                    .filter(([code]) =>
                                                        ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'].includes(code) &&
                                                        code !== fromCurrency
                                                    )
                                                    .slice(0, 6)
                                                    .map(([code, rate]) => (
                                                        <div key={code} className="rate-item">
                                                            <span className="rate-code">{code}</span>
                                                            <span className="rate-value">{Number(rate).toFixed(4)}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
