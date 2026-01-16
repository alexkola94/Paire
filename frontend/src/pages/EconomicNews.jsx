import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiBarChart2,
  FiRefreshCw,
  FiAlertCircle,
  FiInfo,
  FiExternalLink,
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiActivity,
  FiFileText,
  FiClock
} from 'react-icons/fi'
import { greeceEconomicDataService } from '../services/greeceEconomicData'

import LogoLoader from '../components/LogoLoader'
import './EconomicNews.css'

/**
 * Economic News Page Component
 * Displays Greece-specific economic data from Eurostat API
 * Includes CPI, food prices, and economic indicators
 */
function EconomicNews() {
  const { t } = useTranslation()
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Individual data states - each section loads independently
  const [cpiData, setCpiData] = useState(null)
  const [foodPricesData, setFoodPricesData] = useState(null)
  const [indicatorsData, setIndicatorsData] = useState(null)
  const [newsData, setNewsData] = useState(null)

  // Loading states per section
  const [loadingStates, setLoadingStates] = useState({
    cpi: true,
    foodPrices: true,
    indicators: true,
    news: true
  })

  // Error states per section
  const [errors, setErrors] = useState({
    cpi: null,
    foodPrices: null,
    indicators: null,
    news: null
  })

  /**
   * Update loading state for a specific section
   */
  const updateLoadingState = (section, isLoading) => {
    setLoadingStates(prev => {
      const updated = { ...prev, [section]: isLoading }

      // Check if initial loading is complete (all sections have finished loading)
      if (!isLoading && initialLoading) {
        const allLoaded = Object.values(updated).every(loading => !loading)
        if (allLoaded) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => setInitialLoading(false), 0)
        }
      }

      return updated
    })
  }

  /**
   * Load individual data section
   */
  const loadSection = async (sectionName, fetchFunction, setDataFunction) => {
    try {
      updateLoadingState(sectionName, true)
      setErrors(prev => ({ ...prev, [sectionName]: null }))

      const data = await fetchFunction()
      setDataFunction(data)
    } catch (err) {
      console.error(`Error loading ${sectionName}:`, err)
      setErrors(prev => ({
        ...prev,
        [sectionName]: err.message || t('economicNews.error.loading')
      }))
    } finally {
      updateLoadingState(sectionName, false)
    }
  }

  /**
   * Load all economic data progressively
   * Each section loads independently and renders as it becomes available
   */
  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
        // Clear cache to force fresh data
        greeceEconomicDataService.clearCache()
      } else {
        setInitialLoading(true)
        // Reset all loading states
        setLoadingStates({
          cpi: true,
          foodPrices: true,
          indicators: true,
          news: true
        })
      }

      // Clear previous errors
      setErrors({
        cpi: null,
        foodPrices: null,
        indicators: null,
        news: null
      })

      // Use Promise.allSettled to ensure all sections attempt to load even if some fail
      Promise.allSettled([
        loadSection('cpi', greeceEconomicDataService.getCPI, setCpiData),
        loadSection('foodPrices', greeceEconomicDataService.getFoodPrices, setFoodPricesData),
        loadSection('indicators', greeceEconomicDataService.getEconomicIndicators, setIndicatorsData),
        loadSection('news', greeceEconomicDataService.getNews, setNewsData)
      ]).finally(() => {
        // Ensure initial loading is cleared after all attempts
        setTimeout(() => {
          setInitialLoading(false)
          setRefreshing(false)
        }, 100)
      })
    } catch (err) {
      console.error('Error loading economic data:', err)
      setInitialLoading(false)
      setRefreshing(false)
    }
  }

  /**
   * Load data on component mount
   */
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    loadData(true)
  }

  /**
   * Format percentage change
   */
  const formatChange = (change, changePercent) => {
    if (change === null || change === undefined) return null
    const isPositive = change >= 0
    const Icon = isPositive ? FiTrendingUp : FiTrendingDown
    const sign = isPositive ? '+' : ''

    return (
      <span className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
        <Icon size={16} />
        <span>{sign}{changePercent ? `${changePercent.toFixed(1)}%` : change}</span>
      </span>
    )
  }

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return t('economicNews.unknown')
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    } catch {
      return dateString
    }
  }

  // Initial loading state (only show if no data has loaded yet)
  const hasAnyData = cpiData || foodPricesData || indicatorsData || newsData
  const allSectionsLoading = Object.values(loadingStates).every(loading => loading)

  if (initialLoading && !hasAnyData && allSectionsLoading) {
    return (
      <div className="economic-news-page">
        <div className="economic-news-header">
          <h1>{t('economicNews.title')}</h1>
        </div>
        <div className="economic-news-loading">
          <LogoLoader />
          <p>{t('economicNews.loading')}</p>
        </div>
      </div>
    )
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
      className="economic-news-page"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div 
        className="economic-news-header"
        variants={itemVariants}
      >
        <div className="header-content">
          <h1>{t('economicNews.title')}</h1>
          <p className="header-subtitle">{t('economicNews.subtitle')}</p>
        </div>
        <button
          className="refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={t('economicNews.refresh')}
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          {t('economicNews.refresh')}
        </button>
      </motion.div>

      {/* Last Updated Info - show if any data is available */}
      {(cpiData?.lastUpdated || foodPricesData?.lastUpdated || indicatorsData?.lastUpdated || newsData?.lastUpdated) && (
        <motion.div 
          className="last-updated-info"
          variants={itemVariants}
        >
          <FiInfo size={16} />
          <span>{t('economicNews.lastUpdated')}: {formatDate(
            cpiData?.lastUpdated ||
            foodPricesData?.lastUpdated ||
            indicatorsData?.lastUpdated ||
            newsData?.lastUpdated
          )}</span>
        </motion.div>
      )}

      {/* CPI Section - renders as soon as data is available */}
      {loadingStates.cpi ? (
        <section className="economic-section cpi-section loading-skeleton">
          <div className="section-header">
            <FiBarChart2 size={24} className="section-icon" />
            <h2>{t('economicNews.cpi.title')}</h2>
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '60%', height: '40px' }}></div>
            <div className="skeleton-line" style={{ width: '40%', height: '20px', marginTop: '10px' }}></div>
          </div>
        </section>
      ) : cpiData && !cpiData.error ? (
        <motion.section 
          className="economic-section cpi-section"
          variants={itemVariants}
        >
          <div className="section-header">
            <FiBarChart2 size={24} className="section-icon" />
            <h2>{t('economicNews.cpi.title')}</h2>
          </div>
          <div className="cpi-content">
            <div className="cpi-main">
              <div className="cpi-value">
                <span className="value">{cpiData.currentRate?.toFixed(2) || 'N/A'}%</span>
                {formatChange(cpiData.change, cpiData.changePercent)}
              </div>
              <div className="cpi-details">
                {cpiData.previousRate && (
                  <div className="detail-item">
                    <span className="label">{t('economicNews.cpi.previous')}:</span>
                    <span className="value">{cpiData.previousRate.toFixed(2)}%</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">{t('economicNews.cpi.source')}:</span>
                  <span className="value">{cpiData.source || 'Eurostat'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      ) : errors.cpi ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.cpi.title')}: {errors.cpi}</span>
        </div>
      ) : null}

      {/* Food Prices Section - renders as soon as data is available */}
      {loadingStates.foodPrices ? (
        <section className="economic-section food-prices-section loading-skeleton">
          <div className="section-header">
            <FiShoppingBag size={24} className="section-icon" />
            <h2>{t('economicNews.foodPrices.title')}</h2>
          </div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '100%', height: '80px', marginBottom: '10px' }}></div>
            <div className="skeleton-line" style={{ width: '100%', height: '80px' }}></div>
          </div>
        </section>
      ) : foodPricesData && !foodPricesData.error && foodPricesData.categories?.length > 0 ? (

        <motion.section 
          className="economic-section food-prices-section"
          variants={itemVariants}
        >
          <div className="section-header">
            <FiShoppingBag size={24} className="section-icon" />
            <h2>{t('economicNews.foodPrices.title')}</h2>
          </div>
          <div className="food-prices-content">
            {foodPricesData.categories.map((category, index) => (
              <motion.div 
                key={index} 
                className="price-category-card"
                variants={itemVariants}
              >
                <div className="category-header">
                  <h3>{category.name}</h3>
                  <div className="category-stats">
                    <span className="average-price">
                      {t('economicNews.foodPrices.average')}: €{category.averagePrice.toFixed(2)}
                    </span>
                    {formatChange(category.change, category.changePercent)}
                  </div>
                </div>
                {category.items && category.items.length > 0 && (
                  <div className="category-items">
                    {category.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="price-item">
                        <span className="item-name">{item.name}</span>
                        <span className="item-price">
                          €{item.price.toFixed(2)} / {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {foodPricesData.source && (
              <div className="data-source">
                <FiInfo size={14} />
                <span>{t('economicNews.source')}: {foodPricesData.source}</span>
              </div>
            )}
          </div>
        </motion.section>
      ) : errors.foodPrices ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.foodPrices.title')}: {errors.foodPrices}</span>
        </div>
      ) : null}

      {/* Economic Indicators Section - renders as soon as data is available */}
      {loadingStates.indicators ? (
        <section className="economic-section indicators-section loading-skeleton">
          <div className="section-header">
            <FiActivity size={24} className="section-icon" />
            <h2>{t('economicNews.indicators.title')}</h2>
          </div>
          <div className="skeleton-content">
            <div className="indicators-grid">
              <div className="skeleton-line" style={{ width: '100%', height: '120px' }}></div>
              <div className="skeleton-line" style={{ width: '100%', height: '120px' }}></div>
              <div className="skeleton-line" style={{ width: '100%', height: '120px' }}></div>
            </div>
          </div>
        </section>
      ) : indicatorsData && !indicatorsData.error ? (
        <motion.section 
          className="economic-section indicators-section"
          variants={itemVariants}
        >
          <div className="section-header">
            <FiActivity size={24} className="section-icon" />
            <h2>{t('economicNews.indicators.title')}</h2>
          </div>
          <div className="indicators-grid">
            {indicatorsData.gdp && !indicatorsData.gdp.error && (
              <motion.div 
                className="indicator-card"
                variants={itemVariants}
              >
                <div className="indicator-icon">
                  <FiDollarSign size={20} />
                </div>
                <div className="indicator-content">
                  <h3>{t('economicNews.indicators.gdp')}</h3>
                  <div className="indicator-value">
                    {indicatorsData.gdp.value ? `${indicatorsData.gdp.value.toFixed(1)} ${indicatorsData.gdp.unit}` : 'N/A'}
                  </div>
                  {formatChange(indicatorsData.gdp.change, indicatorsData.gdp.changePercent)}
                  {indicatorsData.gdp.period && (
                    <div className="indicator-period">{indicatorsData.gdp.period}</div>
                  )}
                </div>
              </motion.div>
            )}

            {indicatorsData.unemployment && !indicatorsData.unemployment.error && (
              <motion.div 
                className="indicator-card"
                variants={itemVariants}
              >
                <div className="indicator-icon">
                  <FiUsers size={20} />
                </div>
                <div className="indicator-content">
                  <h3>{t('economicNews.indicators.unemployment')}</h3>
                  <div className="indicator-value">
                    {indicatorsData.unemployment.value ? `${indicatorsData.unemployment.value.toFixed(1)} ${indicatorsData.unemployment.unit}` : 'N/A'}
                  </div>
                  {formatChange(
                    indicatorsData.unemployment.change,
                    indicatorsData.unemployment.changePercent
                  )}
                  {indicatorsData.unemployment.period && (
                    <div className="indicator-period">{indicatorsData.unemployment.period}</div>
                  )}
                </div>
              </motion.div>
            )}

            {indicatorsData.inflation && !indicatorsData.inflation.error && (
              <motion.div 
                className="indicator-card"
                variants={itemVariants}
              >
                <div className="indicator-icon">
                  <FiTrendingUp size={20} />
                </div>
                <div className="indicator-content">
                  <h3>{t('economicNews.indicators.inflation')}</h3>
                  <div className="indicator-value">
                    {indicatorsData.inflation.value ? `${indicatorsData.inflation.value.toFixed(1)} ${indicatorsData.inflation.unit}` : 'N/A'}
                  </div>
                  {formatChange(
                    indicatorsData.inflation.change,
                    indicatorsData.inflation.changePercent
                  )}
                  {indicatorsData.inflation.period && (
                    <div className="indicator-period">{indicatorsData.inflation.period}</div>
                  )}
                </div>
              </motion.div>
            )}

            {indicatorsData.householdIncome && !indicatorsData.householdIncome.error && (
              <motion.div 
                className="indicator-card"
                variants={itemVariants}
              >
                <div className="indicator-icon">
                  <FiDollarSign size={20} />
                </div>
                <div className="indicator-content">
                  <h3>{t('economicNews.indicators.householdIncome')}</h3>
                  <div className="indicator-value">
                    {indicatorsData.householdIncome.value ? `${indicatorsData.householdIncome.value.toLocaleString()} ${indicatorsData.householdIncome.unit}` : 'N/A'}
                  </div>
                  {formatChange(
                    indicatorsData.householdIncome.change,
                    indicatorsData.householdIncome.changePercent
                  )}
                  {indicatorsData.householdIncome.period && (
                    <div className="indicator-period">{indicatorsData.householdIncome.period}</div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          {indicatorsData.source && (
            <div className="data-source">
              <FiInfo size={14} />
              <span>{t('economicNews.source')}: {indicatorsData.source}</span>
            </div>
          )}
        </motion.section>
      ) : errors.indicators ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.indicators.title')}: {errors.indicators}</span>
        </div>
      ) : null}

      {/* News Section - renders as soon as data is available */}
      {loadingStates.news ? (
        <section className="economic-section news-section loading-skeleton">
          <div className="section-header">
            <FiFileText size={24} className="section-icon" />
            <h2>{t('economicNews.news.title')}</h2>
          </div>
          <div className="skeleton-content">
            <div className="news-grid">
              <div className="skeleton-line" style={{ width: '100%', height: '200px' }}></div>
              <div className="skeleton-line" style={{ width: '100%', height: '200px' }}></div>
            </div>
          </div>
        </section>
      ) : newsData && !newsData.error && newsData.articles?.length > 0 ? (
        <motion.section 
          className="economic-section news-section"
          variants={itemVariants}
        >
          <div className="section-header">
            <FiFileText size={24} className="section-icon" />
            <h2>{t('economicNews.news.title')}</h2>
          </div>
          <div className="news-content">
            <div className="news-grid">
              {newsData.articles.map((article, index) => (
                <motion.article 
                  key={index} 
                  className="news-card"
                  variants={itemVariants}
                >
                  {article.imageUrl && (
                    <div className="news-image">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="news-card-content">
                    <div className="news-meta">
                      {article.source && (
                        <span className="news-source">{article.source}</span>
                      )}
                      {article.publishedAt && (
                        <span className="news-date">
                          <FiClock size={14} />
                          {formatDate(article.publishedAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="news-title">{article.title}</h3>
                    {article.description && (
                      <p className="news-description">{article.description}</p>
                    )}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-link"
                    >
                      {t('economicNews.news.readMore')}
                      <FiExternalLink size={14} />
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
            {newsData.source && (
              <div className="data-source">
                <FiInfo size={14} />
                <span>{t('economicNews.source')}: {newsData.source}</span>
              </div>
            )}
          </div>
        </motion.section>
      ) : errors.news ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.news.title')}: {errors.news}</span>
        </div>
      ) : null}

      {/* Data Source Links */}
      <motion.section 
        className="economic-section links-section"
        variants={itemVariants}
      >
        <div className="section-header">
          <FiExternalLink size={24} className="section-icon" />
          <h2>{t('economicNews.links.title')}</h2>
        </div>
        <div className="links-content">
          <motion.a
            href="https://ec.europa.eu/eurostat"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Eurostat (European Statistics)</span>
            <FiExternalLink size={16} />
          </motion.a>
          <motion.a
            href="https://www.statistics.gr"
            target="_blank"
            rel="noopener noreferrer"
            className="external-link"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>ELSTAT (Hellenic Statistical Authority)</span>
            <FiExternalLink size={16} />
          </motion.a>
        </div>
      </motion.section>

    </motion.div>
  )
}

export default EconomicNews


