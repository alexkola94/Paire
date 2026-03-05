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

function EconomicNews() {
  const { t } = useTranslation()
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [cpiData, setCpiData] = useState(null)
  const [foodPricesData, setFoodPricesData] = useState(null)
  const [indicatorsData, setIndicatorsData] = useState(null)
  const [newsData, setNewsData] = useState(null)

  const [loadingStates, setLoadingStates] = useState({
    cpi: true,
    foodPrices: true,
    indicators: true,
    news: true
  })

  const [errors, setErrors] = useState({
    cpi: null,
    foodPrices: null,
    indicators: null,
    news: null
  })

  const updateLoadingState = (section, isLoading) => {
    setLoadingStates(prev => {
      const updated = { ...prev, [section]: isLoading }

      if (!isLoading && initialLoading) {
        const allLoaded = Object.values(updated).every(loading => !loading)
        if (allLoaded) {
          setTimeout(() => setInitialLoading(false), 0)
        }
      }

      return updated
    })
  }

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

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
        greeceEconomicDataService.clearCache()
      } else {
        setInitialLoading(true)
        setLoadingStates({
          cpi: true,
          foodPrices: true,
          indicators: true,
          news: true
        })
      }

      setErrors({
        cpi: null,
        foodPrices: null,
        indicators: null,
        news: null
      })

      Promise.allSettled([
        loadSection('cpi', greeceEconomicDataService.getCPI, setCpiData),
        loadSection('foodPrices', greeceEconomicDataService.getFoodPrices, setFoodPricesData),
        loadSection('indicators', greeceEconomicDataService.getEconomicIndicators, setIndicatorsData),
        loadSection('news', greeceEconomicDataService.getNews, setNewsData)
      ]).finally(() => {
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

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = () => {
    loadData(true)
  }

  const formatChange = (change, changePercent) => {
    if (change === null || change === undefined) return null
    const isPositive = change >= 0
    const Icon = isPositive ? FiTrendingUp : FiTrendingDown
    const sign = isPositive ? '+' : ''

    return (
      <span className={`change-indicator ${isPositive ? 'positive' : 'negative'}`}>
        <Icon size={14} />
        <span>{sign}{changePercent ? `${changePercent.toFixed(1)}%` : change}</span>
      </span>
    )
  }

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

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date())

  const hasAnyData = cpiData || foodPricesData || indicatorsData || newsData
  const allSectionsLoading = Object.values(loadingStates).every(loading => loading)

  if (initialLoading && !hasAnyData && allSectionsLoading) {
    return (
      <div className="economic-news-page">
        <div className="newspaper-masthead">
          <div className="masthead-rule" />
          <h1 className="masthead-title">{t('economicNews.title')}</h1>
          <div className="masthead-rule" />
        </div>
        <div className="economic-news-loading">
          <LogoLoader />
          <p>{t('economicNews.loading')}</p>
        </div>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.15
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

  const indicatorItems = []
  if (indicatorsData && !indicatorsData.error) {
    if (indicatorsData.gdp && !indicatorsData.gdp.error) {
      indicatorItems.push({ key: 'gdp', icon: FiDollarSign, label: t('economicNews.indicators.gdp'), data: indicatorsData.gdp })
    }
    if (indicatorsData.unemployment && !indicatorsData.unemployment.error) {
      indicatorItems.push({ key: 'unemployment', icon: FiUsers, label: t('economicNews.indicators.unemployment'), data: indicatorsData.unemployment })
    }
    if (indicatorsData.inflation && !indicatorsData.inflation.error) {
      indicatorItems.push({ key: 'inflation', icon: FiTrendingUp, label: t('economicNews.indicators.inflation'), data: indicatorsData.inflation })
    }
    if (indicatorsData.householdIncome && !indicatorsData.householdIncome.error) {
      indicatorItems.push({ key: 'householdIncome', icon: FiDollarSign, label: t('economicNews.indicators.householdIncome'), data: indicatorsData.householdIncome })
    }
  }

  const featuredArticle = newsData?.articles?.[0] || null
  const secondaryArticles = newsData?.articles?.slice(1) || []

  return (
    <motion.div
      className="economic-news-page newspaper-layout"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ===== MASTHEAD ===== */}
      <motion.header className="newspaper-masthead" variants={itemVariants}>
        <div className="masthead-rule" />
        <div className="masthead-inner">
          <div className="masthead-dateline">
            <span className="dateline-text">{todayFormatted}</span>
            {(cpiData?.lastUpdated || foodPricesData?.lastUpdated || indicatorsData?.lastUpdated || newsData?.lastUpdated) && (
              <span className="dateline-updated">
                <FiClock size={12} />
                {t('economicNews.lastUpdated')}: {formatDate(
                  cpiData?.lastUpdated ||
                  foodPricesData?.lastUpdated ||
                  indicatorsData?.lastUpdated ||
                  newsData?.lastUpdated
                )}
              </span>
            )}
          </div>
          <h1 className="masthead-title">{t('economicNews.title')}</h1>
          <p className="masthead-subtitle">{t('economicNews.subtitle')}</p>
          <button
            className="masthead-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={t('economicNews.refresh')}
          >
            <FiRefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
        <div className="masthead-rule" />
      </motion.header>

      {/* ===== INDICATOR TICKER STRIP ===== */}
      {loadingStates.indicators ? (
        <div className="ticker-strip loading-skeleton">
          <div className="ticker-skeleton-badge" />
          <div className="ticker-skeleton-badge" />
          <div className="ticker-skeleton-badge" />
          <div className="ticker-skeleton-badge" />
        </div>
      ) : indicatorItems.length > 0 ? (
        <motion.div className="ticker-strip" variants={itemVariants}>
          {indicatorItems.map((item) => {
            const IconComponent = item.icon
            const displayValue = item.data.value
              ? item.key === 'householdIncome'
                ? `${item.data.value.toLocaleString()} ${item.data.unit}`
                : `${item.data.value.toFixed(1)} ${item.data.unit}`
              : 'N/A'
            return (
              <motion.div
                key={item.key}
                className="ticker-badge"
                variants={itemVariants}
                whileHover={{ scale: 1.03 }}
              >
                <div className="ticker-badge-icon">
                  <IconComponent size={16} />
                </div>
                <div className="ticker-badge-info">
                  <span className="ticker-badge-label">{item.label}</span>
                  <span className="ticker-badge-value">{displayValue}</span>
                </div>
                {formatChange(item.data.change, item.data.changePercent)}
              </motion.div>
            )
          })}
          {indicatorsData?.source && (
            <div className="ticker-source">
              <FiInfo size={12} />
              <span>{indicatorsData.source}</span>
            </div>
          )}
        </motion.div>
      ) : errors.indicators ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.indicators.title')}: {errors.indicators}</span>
        </div>
      ) : null}

      {/* ===== CPI HEADLINE ===== */}
      {loadingStates.cpi ? (
        <div className="cpi-headline loading-skeleton">
          <div className="skeleton-line" style={{ width: '40%', height: '48px' }} />
          <div className="skeleton-line" style={{ width: '60%', height: '18px', marginTop: '12px' }} />
        </div>
      ) : cpiData && !cpiData.error ? (
        <motion.section className="cpi-headline" variants={itemVariants}>
          <div className="cpi-headline-accent" />
          <div className="cpi-headline-body">
            <div className="cpi-headline-top">
              <FiBarChart2 size={20} className="section-icon" />
              <h2 className="cpi-headline-label">{t('economicNews.cpi.title')}</h2>
            </div>
            <div className="cpi-headline-value-row">
              <span className="cpi-headline-value">{cpiData.currentRate?.toFixed(2) || 'N/A'}%</span>
              {formatChange(cpiData.change, cpiData.changePercent)}
            </div>
            <div className="cpi-headline-meta">
              {cpiData.previousRate && (
                <span className="cpi-meta-item">
                  {t('economicNews.cpi.previous')}: {cpiData.previousRate.toFixed(2)}%
                </span>
              )}
              <span className="cpi-meta-item cpi-meta-source">
                {t('economicNews.cpi.source')}: {cpiData.source || 'Eurostat'}
              </span>
            </div>
          </div>
        </motion.section>
      ) : errors.cpi ? (
        <div className="section-error">
          <FiAlertCircle size={16} />
          <span>{t('economicNews.cpi.title')}: {errors.cpi}</span>
        </div>
      ) : null}

      <div className="newspaper-divider" />

      {/* ===== TWO-COLUMN BODY ===== */}
      <div className="newspaper-body">

        {/* LEFT COLUMN: Market Prices */}
        <div className="newspaper-col newspaper-col-left">
          {loadingStates.foodPrices ? (
            <section className="market-prices-section loading-skeleton">
              <div className="col-section-header">
                <FiShoppingBag size={20} className="section-icon" />
                <h2>{t('economicNews.foodPrices.title')}</h2>
              </div>
              <div className="skeleton-content">
                <div className="skeleton-line" style={{ width: '100%', height: '60px', marginBottom: '8px' }} />
                <div className="skeleton-line" style={{ width: '100%', height: '60px', marginBottom: '8px' }} />
                <div className="skeleton-line" style={{ width: '100%', height: '60px' }} />
              </div>
            </section>
          ) : foodPricesData && !foodPricesData.error && foodPricesData.categories?.length > 0 ? (
            <motion.section className="market-prices-section" variants={itemVariants}>
              <div className="col-section-header">
                <FiShoppingBag size={20} className="section-icon" />
                <h2>{t('economicNews.foodPrices.title')}</h2>
              </div>
              <div className="market-prices-list">
                {foodPricesData.categories.map((category, index) => (
                  <motion.div
                    key={index}
                    className="market-category"
                    variants={itemVariants}
                  >
                    <div className="market-category-header">
                      <h3>{category.name}</h3>
                      <div className="market-category-stats">
                        <span className="market-avg">
                          {t('economicNews.foodPrices.average')}: €{category.averagePrice.toFixed(2)}
                        </span>
                        {formatChange(category.change, category.changePercent)}
                      </div>
                    </div>
                    {category.items && category.items.length > 0 && (
                      <div className="market-items">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="market-item-row">
                            <span className="market-item-name">{item.name}</span>
                            <span className="market-item-dots" />
                            <span className="market-item-price">
                              €{item.price.toFixed(2)}/{item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {index < foodPricesData.categories.length - 1 && (
                      <div className="market-category-divider" />
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
        </div>

        {/* Vertical column rule (newspaper style) */}
        <div className="newspaper-col-rule" />

        {/* RIGHT COLUMN: News */}
        <div className="newspaper-col newspaper-col-right">
          {loadingStates.news ? (
            <section className="news-column-section loading-skeleton">
              <div className="col-section-header">
                <FiFileText size={20} className="section-icon" />
                <h2>{t('economicNews.news.title')}</h2>
              </div>
              <div className="skeleton-content">
                <div className="skeleton-line" style={{ width: '100%', height: '220px', marginBottom: '12px' }} />
                <div className="skeleton-line" style={{ width: '100%', height: '80px', marginBottom: '8px' }} />
                <div className="skeleton-line" style={{ width: '100%', height: '80px' }} />
              </div>
            </section>
          ) : newsData && !newsData.error && newsData.articles?.length > 0 ? (
            <motion.section className="news-column-section" variants={itemVariants}>
              <div className="col-section-header">
                <FiFileText size={20} className="section-icon" />
                <h2>{t('economicNews.news.title')}</h2>
              </div>

              {/* Featured Article */}
              {featuredArticle && (
                <motion.article className="news-featured" variants={itemVariants}>
                  {featuredArticle.imageUrl && (
                    <div className="news-featured-image">
                      <img
                        src={featuredArticle.imageUrl}
                        alt={featuredArticle.title}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="news-featured-body">
                    <div className="news-meta">
                      {featuredArticle.source && (
                        <span className="news-source">{featuredArticle.source}</span>
                      )}
                      {featuredArticle.publishedAt && (
                        <span className="news-date">
                          <FiClock size={12} />
                          {formatDate(featuredArticle.publishedAt)}
                        </span>
                      )}
                    </div>
                    <h3 className="news-featured-title">{featuredArticle.title}</h3>
                    {featuredArticle.description && (
                      <p className="news-featured-desc">{featuredArticle.description}</p>
                    )}
                    <a
                      href={featuredArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="news-link"
                    >
                      {t('economicNews.news.readMore')}
                      <FiExternalLink size={14} />
                    </a>
                  </div>
                </motion.article>
              )}

              {/* Secondary Articles */}
              {secondaryArticles.length > 0 && (
                <div className="news-secondary-list">
                  {secondaryArticles.map((article, index) => (
                    <motion.article
                      key={index}
                      className="news-compact"
                      variants={itemVariants}
                    >
                      <div className="news-compact-body">
                        <div className="news-meta">
                          {article.source && (
                            <span className="news-source">{article.source}</span>
                          )}
                          {article.publishedAt && (
                            <span className="news-date">
                              <FiClock size={12} />
                              {formatDate(article.publishedAt)}
                            </span>
                          )}
                        </div>
                        <h4 className="news-compact-title">{article.title}</h4>
                        {article.description && (
                          <p className="news-compact-desc">{article.description}</p>
                        )}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="news-link"
                        >
                          {t('economicNews.news.readMore')}
                          <FiExternalLink size={12} />
                        </a>
                      </div>
                    </motion.article>
                  ))}
                </div>
              )}

              {newsData.source && (
                <div className="data-source">
                  <FiInfo size={14} />
                  <span>{t('economicNews.source')}: {newsData.source}</span>
                </div>
              )}
            </motion.section>
          ) : errors.news ? (
            <div className="section-error">
              <FiAlertCircle size={16} />
              <span>{t('economicNews.news.title')}: {errors.news}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== SOURCES FOOTER (Colophon) ===== */}
      <motion.footer className="newspaper-footer" variants={itemVariants}>
        <div className="footer-rule" />
        <div className="footer-content">
          <span className="footer-label">{t('economicNews.links.title')}</span>
          <div className="footer-links">
            <motion.a
              href="https://ec.europa.eu/eurostat"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Eurostat
              <FiExternalLink size={14} />
            </motion.a>
            <span className="footer-link-sep" />
            <motion.a
              href="https://www.statistics.gr"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ELSTAT
              <FiExternalLink size={14} />
            </motion.a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  )
}

export default EconomicNews
