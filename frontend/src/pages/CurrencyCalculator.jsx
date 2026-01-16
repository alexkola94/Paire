import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { currencyService } from '../services/api'
import { FiRefreshCw, FiArrowRight, FiInfo, FiTrendingUp } from 'react-icons/fi'
import LogoLoader from '../components/LogoLoader'
import './CurrencyCalculator.css'

export default function CurrencyCalculator() {
    const { t } = useTranslation()
    const [currencies, setCurrencies] = useState({})
    const [amount, setAmount] = useState(1)
    const [fromCurrency, setFromCurrency] = useState('EUR')
    const [toCurrency, setToCurrency] = useState('USD')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState(null)
    const [popularRates, setPopularRates] = useState(null)

    // Fetch available currencies on mount
    useEffect(() => {
        fetchCurrencies()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch rates for "fromCurrency" when changed or initially
    useEffect(() => {
        if (fromCurrency) {
            fetchPopularRates()
        }
    }, [fromCurrency]) // eslint-disable-line react-hooks/exhaustive-deps

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
            setResult(data)

            // If we got a result object with a result property (from backend controller)
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

    const handleSwap = () => {
        setFromCurrency(toCurrency)
        setToCurrency(fromCurrency)
        // Clear result when swapping to avoid confusion
        setResult(null)
    }

    if (initialLoading) {
        return <LogoLoader fullScreen />
    }

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    }

    return (
        <motion.div 
            className="currency-calculator-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                className="currency-header"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
            >
                <h1>{t('currencyCalculator.title')}</h1>
                <p>{t('currencyCalculator.subtitle')}</p>
            </motion.div>

            <motion.div 
                className="currency-converter-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <form onSubmit={handleConvert} className="converter-form">

                    <div className="input-group">
                        <label htmlFor="amount">{t('currencyCalculator.amount')}</label>
                        <div className="amount-input-wrapper">

                            <input
                                type="number"
                                id="amount"
                                className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                step="any"
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="currency-selectors">
                        <div className="input-group">
                            <label htmlFor="from">{t('currencyCalculator.from')}</label>
                            <div className="currency-select-wrapper">
                                <select
                                    id="from"
                                    className="currency-select"
                                    value={fromCurrency}
                                    onChange={(e) => setFromCurrency(e.target.value)}
                                >
                                    {Object.entries(currencies).map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {code} - {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="swap-button"
                            onClick={handleSwap}
                            aria-label={t('currencyCalculator.swap')}
                        >
                            <FiRefreshCw size={20} />
                        </button>

                        <div className="input-group">
                            <label htmlFor="to">{t('currencyCalculator.to')}</label>
                            <div className="currency-select-wrapper">
                                <select
                                    id="to"
                                    className="currency-select"
                                    value={toCurrency}
                                    onChange={(e) => setToCurrency(e.target.value)}
                                >
                                    {Object.entries(currencies).map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {code} - {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="convert-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="loading-spinner"></div>
                        ) : (
                            <>
                                {t('currencyCalculator.convert')} <FiArrowRight />
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="alert-error" style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                {result && (
                    <motion.div 
                        className="result-container"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="result-from">
                            {Number(amount).toLocaleString()} {currencies[fromCurrency]} =
                        </div>
                        <div className="result-to">
                            {Number(result).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
                        </div>
                        <div className="result-rate">
                            <FiInfo size={16} />
                            {t('currencyCalculator.rateInfo', { from: fromCurrency, rate: (result / amount).toFixed(4), to: toCurrency })}
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {popularRates && (
                <motion.div 
                    className="popular-currencies"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <motion.div 
                        className="popular-header"
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <FiTrendingUp size={24} color="#8B5CF6" />
                        <span>{t('currencyCalculator.popularRates', { currency: fromCurrency })}</span>
                    </motion.div>
                    <motion.div 
                        className="rates-grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {Object.entries(popularRates)
                            .filter(([code]) => ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY'].includes(code) && code !== fromCurrency)
                            .slice(0, 8)
                            .map(([code, rate]) => (
                                <motion.div 
                                    key={code} 
                                    className="rate-card"
                                    variants={itemVariants}
                                >
                                    <div className="rate-header">
                                        <span className="currency-code">{code}</span>
                                        <span className="rate-value">{Number(rate).toFixed(4)}</span>
                                    </div>
                                    <div className="rate-name">{currencies[code]}</div>
                                </motion.div>
                            ))}
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    )
}
