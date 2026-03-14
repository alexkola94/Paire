import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiChevronLeft, FiChevronRight, FiDownload,
  FiTrendingUp, FiTrendingDown, FiDollarSign,
  FiAward, FiZap, FiTarget, FiUsers, FiCalendar
} from 'react-icons/fi'
import { yearReviewService } from '../../../services/api'
import './YearInReview.css'

const SLIDE_GRADIENTS = [
  'linear-gradient(135deg, #1a0533 0%, #4c1d95 50%, #7c3aed 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
  'linear-gradient(135deg, #042f2e 0%, #064e3b 50%, #065f46 100%)',
  'linear-gradient(135deg, #1c0a00 0%, #7f1d1d 50%, #991b1b 100%)',
  'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
  'linear-gradient(135deg, #1a0a00 0%, #78350f 50%, #92400e 100%)',
  'linear-gradient(135deg, #0c0a1d 0%, #1e1b4b 50%, #3730a3 100%)',
  'linear-gradient(135deg, #2d0a1e 0%, #831843 50%, #9d174d 100%)',
  'linear-gradient(135deg, #1a0533 0%, #4c1d95 50%, #6d28d9 100%)',
]

const slideVariants = {
  enter: (dir) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  exit: (dir) => ({
    x: dir < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  }),
}

function AnimatedCounter({ target = 0, duration = 1500, prefix = '', suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame
    const start = performance.now()
    const to = target

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(to * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  const formatted = decimals > 0
    ? Number(display.toFixed(decimals)).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : Math.round(display).toLocaleString()

  return <span className="yr-counter">{prefix}{formatted}{suffix}</span>
}

function YearInReview() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const slideRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear - 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)

  const availableYears = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentYear - 1 - i),
    [currentYear]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCurrentSlide(0)
    setDirection(0)

    yearReviewService.getReview(year)
      .then((res) => { if (!cancelled) setData(res) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year])

  const slides = useMemo(() => {
    if (!data) return []
    const s = [
      { id: 'intro', gradient: SLIDE_GRADIENTS[0] },
      { id: 'numbers', gradient: SLIDE_GRADIENTS[1] },
      { id: 'categories', gradient: SLIDE_GRADIENTS[2] },
      { id: 'biggest', gradient: SLIDE_GRADIENTS[3] },
      { id: 'months', gradient: SLIDE_GRADIENTS[4] },
      { id: 'streaks', gradient: SLIDE_GRADIENTS[5] },
      { id: 'scores', gradient: SLIDE_GRADIENTS[6] },
    ]
    if (data.partnerComparison) {
      s.push({ id: 'partner', gradient: SLIDE_GRADIENTS[7] })
    }
    s.push({ id: 'summary', gradient: SLIDE_GRADIENTS[8] })
    return s
  }, [data])

  const goNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setDirection(1)
      setCurrentSlide((prev) => prev + 1)
    }
  }, [currentSlide, slides.length])

  const goPrev = useCallback(() => {
    if (currentSlide > 0) {
      setDirection(-1)
      setCurrentSlide((prev) => prev - 1)
    }
  }, [currentSlide])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev, navigate])

  const handleShare = async () => {
    if (!slideRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `paire-wrapped-${year}-slide-${currentSlide + 1}.png`
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Share capture failed:', err)
    }
  }

  const getMonthName = useCallback((month) => {
    if (typeof month === 'number') {
      return new Date(2024, month - 1).toLocaleDateString(i18n.language, { month: 'long' })
    }
    if (typeof month === 'string' && month.includes('-')) {
      const [y, m] = month.split('-')
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString(i18n.language, { month: 'long' })
    }
    return String(month)
  }, [i18n.language])

  const getShortMonth = useCallback((index) => {
    return new Date(2024, index).toLocaleDateString(i18n.language, { month: 'short' })
  }, [i18n.language])

  const formatMoney = useCallback((amount) => {
    return Math.round(amount || 0).toLocaleString(i18n.language)
  }, [i18n.language])

  const getMotivationalMessage = (savingsRate) => {
    if (savingsRate >= 30) return t('yearReview.motivation.amazing', 'You\'re a savings superstar! Keep it up!')
    if (savingsRate >= 20) return t('yearReview.motivation.great', 'Great discipline! You\'re building real wealth.')
    if (savingsRate >= 10) return t('yearReview.motivation.good', 'Solid progress. Every bit saved counts!')
    return t('yearReview.motivation.improve', 'Room to grow \u2014 small changes lead to big results!')
  }

  // --- Slide renderers ---

  const renderIntro = () => (
    <div className="yr-slide-inner yr-intro">
      <motion.div
        className="yr-intro-year"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        {year}
      </motion.div>
      <motion.h1
        className="yr-intro-title"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        {t('yearReview.intro.title', 'Your Financial Wrapped')}
      </motion.h1>
      <motion.p
        className="yr-intro-subtitle"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.6 }}
      >
        {t('yearReview.intro.subtitle', 'A look back at your financial journey')}
      </motion.p>
      <motion.div
        className="yr-intro-cta"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        {t('yearReview.intro.tapToContinue', 'Tap or press \u2192 to continue')}
      </motion.div>
    </div>
  )

  const renderNumbers = () => (
    <div className="yr-slide-inner yr-numbers">
      <h2 className="yr-slide-heading">{t('yearReview.numbers.title', 'The Big Picture')}</h2>
      <div className="yr-numbers-grid">
        <motion.div
          className="yr-number-card"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <FiTrendingUp className="yr-number-icon yr-icon-income" />
          <span className="yr-number-label">{t('yearReview.numbers.income', 'Total Income')}</span>
          <span className="yr-number-value yr-income">
            <AnimatedCounter target={data.totalIncome} prefix="$" />
          </span>
        </motion.div>
        <motion.div
          className="yr-number-card"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <FiTrendingDown className="yr-number-icon yr-icon-expense" />
          <span className="yr-number-label">{t('yearReview.numbers.expenses', 'Total Expenses')}</span>
          <span className="yr-number-value yr-expense">
            <AnimatedCounter target={data.totalExpenses} prefix="$" />
          </span>
        </motion.div>
        <motion.div
          className="yr-number-card yr-savings-highlight"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <FiDollarSign className="yr-number-icon yr-icon-savings" />
          <span className="yr-number-label">{t('yearReview.numbers.saved', 'Net Savings')}</span>
          <span className={`yr-number-value ${data.netSavings >= 0 ? 'yr-income' : 'yr-expense'}`}>
            <AnimatedCounter
              target={Math.abs(data.netSavings)}
              prefix={data.netSavings >= 0 ? '+$' : '-$'}
            />
          </span>
        </motion.div>
      </div>
    </div>
  )

  const renderCategories = () => {
    const categories = (data.topCategories || []).slice(0, 5)
    const maxAmount = categories[0]?.amount || 1

    return (
      <div className="yr-slide-inner yr-categories">
        <h2 className="yr-slide-heading">{t('yearReview.categories.title', 'Where Your Money Went')}</h2>
        <div className="yr-categories-list">
          {categories.map((cat, i) => {
            const width = (cat.amount / maxAmount) * 100
            return (
              <motion.div
                key={cat.category}
                className="yr-category-row"
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.12 * i + 0.2, duration: 0.5 }}
              >
                <div className="yr-category-info">
                  <span className="yr-category-rank">#{i + 1}</span>
                  <span className="yr-category-name">{cat.category}</span>
                  <span className="yr-category-amount">${formatMoney(cat.amount)}</span>
                </div>
                <div className="yr-category-bar-track">
                  <motion.div
                    className="yr-category-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ delay: 0.12 * i + 0.45, duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderBiggest = () => (
    <div className="yr-slide-inner yr-biggest">
      <h2 className="yr-slide-heading">{t('yearReview.biggest.title', 'Your Biggest Expense')}</h2>
      {data.biggestExpense ? (
        <>
          <motion.div
            className="yr-biggest-amount"
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            $<AnimatedCounter target={data.biggestExpense.amount} duration={2000} />
          </motion.div>
          <motion.div
            className="yr-biggest-details"
            initial={{ y: 25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <span className="yr-biggest-desc">{data.biggestExpense.description}</span>
            <span className="yr-biggest-meta">
              {data.biggestExpense.category}
              {data.biggestExpense.date && (
                <> &middot; {new Date(data.biggestExpense.date).toLocaleDateString(i18n.language, { month: 'long', day: 'numeric' })}</>
              )}
            </span>
          </motion.div>
        </>
      ) : (
        <p className="yr-empty-text">{t('yearReview.biggest.none', 'No expenses recorded')}</p>
      )}
    </div>
  )

  const renderMonths = () => (
    <div className="yr-slide-inner yr-months">
      <h2 className="yr-slide-heading">{t('yearReview.months.title', 'Month Highlights')}</h2>
      <div className="yr-months-grid">
        {data.bestSavingsMonth && (
          <motion.div
            className="yr-month-card yr-month-best"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <FiTrendingUp className="yr-month-icon" />
            <span className="yr-month-card-label">{t('yearReview.months.bestSavings', 'Best Savings Month')}</span>
            <span className="yr-month-name">{getMonthName(data.bestSavingsMonth.month)}</span>
            <span className="yr-month-amount yr-income">+${formatMoney(data.bestSavingsMonth.savings)}</span>
          </motion.div>
        )}
        {data.highestSpendingMonth && (
          <motion.div
            className="yr-month-card yr-month-worst"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <FiTrendingDown className="yr-month-icon" />
            <span className="yr-month-card-label">{t('yearReview.months.highestSpending', 'Highest Spending Month')}</span>
            <span className="yr-month-name">{getMonthName(data.highestSpendingMonth.month)}</span>
            <span className="yr-month-amount yr-expense">${formatMoney(data.highestSpendingMonth.total)}</span>
          </motion.div>
        )}
      </div>
    </div>
  )

  const renderStreaks = () => (
    <div className="yr-slide-inner yr-streaks">
      <h2 className="yr-slide-heading">{t('yearReview.streaks.title', 'Your Achievements')}</h2>
      <div className="yr-streaks-grid">
        <motion.div
          className="yr-streak-card"
          initial={{ y: 35, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <FiZap className="yr-streak-icon" style={{ color: '#F59E0B' }} />
          <span className="yr-streak-value">
            <AnimatedCounter target={data.longestStreak || 0} />
          </span>
          <span className="yr-streak-label">{t('yearReview.streaks.longestStreak', 'Day Streak')}</span>
        </motion.div>
        <motion.div
          className="yr-streak-card"
          initial={{ y: 35, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <FiAward className="yr-streak-icon" style={{ color: '#8B5CF6' }} />
          <span className="yr-streak-value">
            <AnimatedCounter target={data.achievementsUnlocked || 0} />
          </span>
          <span className="yr-streak-label">{t('yearReview.streaks.achievements', 'Achievements')}</span>
        </motion.div>
        <motion.div
          className="yr-streak-card"
          initial={{ y: 35, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <FiTarget className="yr-streak-icon" style={{ color: '#10B981' }} />
          <span className="yr-streak-value">
            <AnimatedCounter target={data.challengeStats?.completed || 0} />
          </span>
          <span className="yr-streak-label">{t('yearReview.streaks.challenges', 'Challenges Done')}</span>
        </motion.div>
      </div>
      {data.challengeStats?.totalPoints > 0 && (
        <motion.div
          className="yr-streaks-bonus"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          {t('yearReview.streaks.pointsEarned', '{{points}} points earned', { points: data.challengeStats.totalPoints.toLocaleString() })}
        </motion.div>
      )}
    </div>
  )

  const renderScores = () => {
    const scores = data.monthlyScores || []
    const maxScore = Math.max(...scores, 1)

    return (
      <div className="yr-slide-inner yr-scores">
        <h2 className="yr-slide-heading">{t('yearReview.scores.title', 'Paire Score Journey')}</h2>
        <div className="yr-scores-chart">
          {scores.map((score, i) => {
            const height = (score / maxScore) * 100
            const color = score >= 80 ? '#10B981' : score >= 60 ? '#8B5CF6' : score >= 40 ? '#F59E0B' : '#EF4444'
            return (
              <motion.div
                key={i}
                className="yr-score-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * i + 0.15 }}
              >
                <span className="yr-score-val">{score}</span>
                <div className="yr-score-bar-track">
                  <motion.div
                    className="yr-score-bar"
                    style={{ backgroundColor: color }}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.06 * i + 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
                <span className="yr-score-month">{getShortMonth(i)}</span>
              </motion.div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderPartner = () => {
    if (!data.partnerComparison) return null
    const pc = data.partnerComparison
    const maxSpend = Math.max(pc.youSpent, pc.partnerSpent, 1)
    const maxSave = Math.max(pc.youSaved, pc.partnerSaved, 1)

    return (
      <div className="yr-slide-inner yr-partner">
        <h2 className="yr-slide-heading">
          <FiUsers style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {t('yearReview.partner.title', 'You & Your Partner')}
        </h2>

        <div className="yr-partner-section">
          <h3 className="yr-partner-section-title">{t('yearReview.partner.spending', 'Spending')}</h3>
          <div className="yr-partner-bars">
            <div className="yr-partner-bar-row">
              <span className="yr-partner-label">{t('yearReview.partner.you', 'You')}</span>
              <div className="yr-partner-bar-track">
                <motion.div
                  className="yr-partner-bar-fill yr-bar-coral"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pc.youSpent / maxSpend) * 100}%` }}
                  transition={{ delay: 0.3, duration: 0.7 }}
                />
              </div>
              <span className="yr-partner-amount">${formatMoney(pc.youSpent)}</span>
            </div>
            <div className="yr-partner-bar-row">
              <span className="yr-partner-label">{t('yearReview.partner.partner', 'Partner')}</span>
              <div className="yr-partner-bar-track">
                <motion.div
                  className="yr-partner-bar-fill yr-bar-pink"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pc.partnerSpent / maxSpend) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.7 }}
                />
              </div>
              <span className="yr-partner-amount">${formatMoney(pc.partnerSpent)}</span>
            </div>
          </div>
        </div>

        <div className="yr-partner-section">
          <h3 className="yr-partner-section-title">{t('yearReview.partner.savings', 'Savings')}</h3>
          <div className="yr-partner-bars">
            <div className="yr-partner-bar-row">
              <span className="yr-partner-label">{t('yearReview.partner.you', 'You')}</span>
              <div className="yr-partner-bar-track">
                <motion.div
                  className="yr-partner-bar-fill yr-bar-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pc.youSaved / maxSave) * 100}%` }}
                  transition={{ delay: 0.7, duration: 0.7 }}
                />
              </div>
              <span className="yr-partner-amount">${formatMoney(pc.youSaved)}</span>
            </div>
            <div className="yr-partner-bar-row">
              <span className="yr-partner-label">{t('yearReview.partner.partner', 'Partner')}</span>
              <div className="yr-partner-bar-track">
                <motion.div
                  className="yr-partner-bar-fill yr-bar-teal"
                  initial={{ width: 0 }}
                  animate={{ width: `${(pc.partnerSaved / maxSave) * 100}%` }}
                  transition={{ delay: 0.9, duration: 0.7 }}
                />
              </div>
              <span className="yr-partner-amount">${formatMoney(pc.partnerSaved)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSummary = () => (
    <div className="yr-slide-inner yr-summary">
      <motion.h2
        className="yr-slide-heading"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        {t('yearReview.summary.title', 'Your Year at a Glance')}
      </motion.h2>

      <div className="yr-summary-stats">
        <motion.div
          className="yr-summary-stat"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="yr-summary-value yr-primary">
            <AnimatedCounter target={data.savingsRate || 0} suffix="%" decimals={1} />
          </span>
          <span className="yr-summary-label">{t('yearReview.summary.savingsRate', 'Savings Rate')}</span>
        </motion.div>
        <motion.div
          className="yr-summary-stat"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <span className="yr-summary-value">
            <AnimatedCounter target={data.totalTransactions || 0} />
          </span>
          <span className="yr-summary-label">{t('yearReview.summary.transactions', 'Transactions')}</span>
        </motion.div>
        {data.homeLevel != null && (
          <motion.div
            className="yr-summary-stat"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <span className="yr-summary-value yr-primary">Lv.{data.homeLevel}</span>
            <span className="yr-summary-label">{t('yearReview.summary.homeLevel', 'Paire Home')}</span>
          </motion.div>
        )}
      </div>

      <motion.div
        className="yr-summary-ring"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 120 120" className="yr-summary-svg">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r="52"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - Math.min((data.savingsRate || 0) / 100, 1)) }}
            transition={{ delay: 0.9, duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            transform="rotate(-90 60 60)"
          />
        </svg>
      </motion.div>

      <motion.p
        className="yr-summary-message"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        {getMotivationalMessage(data.savingsRate || 0)}
      </motion.p>

      <motion.div
        className="yr-summary-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        Paire &middot; {year}
      </motion.div>
    </div>
  )

  const renderSlideContent = (slideId) => {
    switch (slideId) {
      case 'intro': return renderIntro()
      case 'numbers': return renderNumbers()
      case 'categories': return renderCategories()
      case 'biggest': return renderBiggest()
      case 'months': return renderMonths()
      case 'streaks': return renderStreaks()
      case 'scores': return renderScores()
      case 'partner': return renderPartner()
      case 'summary': return renderSummary()
      default: return null
    }
  }

  if (loading) {
    return createPortal(
      <div className="yr-page yr-state-page" style={{ background: SLIDE_GRADIENTS[0] }}>
        <div className="yr-state-content">
          <div className="yr-loading-spinner" />
          <p>{t('yearReview.loading', 'Preparing your wrapped...')}</p>
        </div>
      </div>,
      document.body
    )
  }

  if (error || !data) {
    return createPortal(
      <div className="yr-page yr-state-page" style={{ background: SLIDE_GRADIENTS[0] }}>
        <div className="yr-state-content">
          <h2 className="yr-error-title">{t('yearReview.error.title', 'Oops!')}</h2>
          <p className="yr-error-text">{error || t('yearReview.error.noData', 'No data available for this year.')}</p>
          <div className="yr-error-actions">
            <select
              className="yr-error-year-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button className="yr-error-btn" onClick={() => navigate(-1)}>
              {t('yearReview.error.goBack', 'Go Back')}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  const current = slides[currentSlide]

  return createPortal(
    <div className="yr-page">
      <div className="yr-header">
        <button className="yr-header-btn" onClick={() => navigate(-1)} aria-label="Close">
          <FiX size={20} />
        </button>
        <div className="yr-year-selector">
          <FiCalendar size={14} />
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button className="yr-header-btn" onClick={handleShare} aria-label="Download slide">
          <FiDownload size={18} />
        </button>
      </div>

      <div className="yr-slides-viewport">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${currentSlide}-${year}`}
            ref={slideRef}
            className="yr-slide"
            style={{ background: current?.gradient }}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) goNext()
              else if (info.offset.x > 80) goPrev()
            }}
          >
            {renderSlideContent(current?.id)}
          </motion.div>
        </AnimatePresence>
      </div>

      {currentSlide > 0 && (
        <button className="yr-nav-btn yr-nav-prev" onClick={goPrev} aria-label="Previous slide">
          <FiChevronLeft size={28} />
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button className="yr-nav-btn yr-nav-next" onClick={goNext} aria-label="Next slide">
          <FiChevronRight size={28} />
        </button>
      )}

      <div className="yr-progress">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`yr-dot ${i === currentSlide ? 'yr-dot-active' : ''} ${i < currentSlide ? 'yr-dot-visited' : ''}`}
            onClick={() => {
              setDirection(i > currentSlide ? 1 : -1)
              setCurrentSlide(i)
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>,
    document.body
  )
}

export default YearInReview
