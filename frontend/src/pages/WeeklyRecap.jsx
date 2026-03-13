import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiChevronLeft, FiChevronRight, FiDollarSign,
  FiTrendingUp, FiTrendingDown, FiCalendar,
  FiShoppingBag, FiHome, FiCoffee, FiHeart,
  FiTruck, FiZap, FiBookOpen, FiMoreHorizontal,
  FiRefreshCw
} from 'react-icons/fi'
import { weeklyRecapService } from '../services/api'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './WeeklyRecap.css'

const CATEGORY_ICONS = {
  food: FiCoffee,
  groceries: FiShoppingBag,
  dining: FiCoffee,
  restaurant: FiCoffee,
  housing: FiHome,
  rent: FiHome,
  mortgage: FiHome,
  transport: FiTruck,
  fuel: FiTruck,
  health: FiHeart,
  fitness: FiHeart,
  utilities: FiZap,
  bills: FiZap,
  education: FiBookOpen,
  entertainment: FiBookOpen,
  streaming: FiBookOpen,
}

function getCategoryIcon(category) {
  if (!category) return FiMoreHorizontal
  const normalized = category.toLowerCase().trim()
  return CATEGORY_ICONS[normalized] || FiMoreHorizontal
}

function formatWeekRange(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  const opts = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`
}

function parseTopCategories(raw) {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed)) return parsed.slice(0, 5)
    return []
  } catch {
    return []
  }
}

function renderInsights(content) {
  if (!content) return null
  const lines = content.split('\n').filter(l => l.trim())
  return lines.map((line, i) => {
    const boldProcessed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    const formatted = boldProcessed.replace(/\*(.+?)\*/g, '<em>$1</em>')
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      return (
        <li key={i} className="insight-bullet" dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
      )
    }
    if (line.trim().startsWith('#')) {
      const text = line.replace(/^#+\s*/, '')
      return <h4 key={i} className="insight-heading" dangerouslySetInnerHTML={{ __html: text }} />
    }
    return <p key={i} className="insight-paragraph" dangerouslySetInnerHTML={{ __html: formatted }} />
  })
}

function WeeklyRecap() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['weekly-recap-history'],
    queryFn: () => weeklyRecapService.getHistory(12),
    staleTime: 5 * 60 * 1000,
  })

  const [generating, setGenerating] = useState(false)
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await weeklyRecapService.generate()
      await refetch()
      setSelectedIndex(0)
    } catch (err) {
      console.error('Failed to generate recap:', err)
    } finally {
      setGenerating(false)
    }
  }

  const recaps = useMemo(() => {
    if (!historyData || !Array.isArray(historyData)) return []
    return [...historyData].sort((a, b) =>
      new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    )
  }, [historyData])

  const recap = recaps[selectedIndex] || null
  const canGoNewer = selectedIndex > 0
  const canGoOlder = selectedIndex < recaps.length - 1

  const goNewer = () => {
    if (canGoNewer) {
      setDirection(-1)
      setSelectedIndex(i => i - 1)
    }
  }

  const goOlder = () => {
    if (canGoOlder) {
      setDirection(1)
      setSelectedIndex(i => i + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="weekly-recap-page">
        <div className="weekly-recap-loading">
          <div className="loading-spinner" />
          <p>Loading your recap...</p>
        </div>
      </div>
    )
  }

  if (!recaps.length) {
    return (
      <div className="weekly-recap-page">
        <div className="weekly-recap-empty glass-card">
          <FiCalendar size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h2>No Recaps Yet</h2>
          <p className="empty-text">Your weekly financial recap will appear here once generated.</p>
          <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
            <FiRefreshCw className={generating ? 'spinning' : ''} />
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>
      </div>
    )
  }

  const balance = (recap?.totalIncome || 0) - (recap?.totalSpent || 0)
  const topCategories = parseTopCategories(recap?.topCategories)
  const insightsContent = recap?.formattedContent || recap?.insights || ''

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  }

  return (
    <div className="weekly-recap-page">
      <div className="recap-header">
        <div className="recap-header-text">
          <h1 className="page-title">Weekly Recap</h1>
          <p className="page-subtitle">Your financial week at a glance</p>
        </div>
        <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
          <FiRefreshCw className={generating ? 'spinning' : ''} />
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      <div className="week-navigator">
        <button
          className="nav-arrow"
          onClick={goOlder}
          disabled={!canGoOlder}
          aria-label="Previous week"
        >
          <FiChevronLeft />
        </button>
        <div className="week-label">
          <FiCalendar className="week-cal-icon" />
          <span>{recap ? formatWeekRange(recap.weekStart, recap.weekEnd) : '—'}</span>
        </div>
        <button
          className="nav-arrow"
          onClick={goNewer}
          disabled={!canGoNewer}
          aria-label="Next week"
        >
          <FiChevronRight />
        </button>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={recap?.id || selectedIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="recap-content"
        >
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card glass-card expense-card">
              <div className="summary-icon-wrap expense-icon">
                <FiTrendingDown size={20} />
              </div>
              <div className="summary-data">
                <span className="summary-label">Total Spent</span>
                <span className="summary-amount expense-amount">
                  {formatCurrency(recap?.totalSpent || 0)}
                </span>
              </div>
            </div>
            <div className="summary-card glass-card income-card">
              <div className="summary-icon-wrap income-icon">
                <FiTrendingUp size={20} />
              </div>
              <div className="summary-data">
                <span className="summary-label">Total Income</span>
                <span className="summary-amount income-amount">
                  {formatCurrency(recap?.totalIncome || 0)}
                </span>
              </div>
            </div>
            <div className="summary-card glass-card balance-card">
              <div className={`summary-icon-wrap ${balance >= 0 ? 'income-icon' : 'expense-icon'}`}>
                <FiDollarSign size={20} />
              </div>
              <div className="summary-data">
                <span className="summary-label">Balance</span>
                <span className={`summary-amount ${balance >= 0 ? 'income-amount' : 'expense-amount'}`}>
                  {formatCurrency(Math.abs(balance))}
                </span>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div className="categories-section glass-card">
              <h3 className="section-title">Top Categories</h3>
              <div className="categories-list">
                {topCategories.map((cat, i) => {
                  const IconComp = getCategoryIcon(cat.category || cat.name)
                  return (
                    <div key={i} className="category-row">
                      <div className="category-left">
                        <div className="category-icon-wrap">
                          <IconComp size={16} />
                        </div>
                        <span className="category-name">{cat.category || cat.name || 'Other'}</span>
                      </div>
                      <span className="category-amount">
                        {formatCurrency(cat.amount || cat.total || 0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Insights */}
          {insightsContent && (
            <div className="insights-section glass-card">
              <h3 className="section-title">
                💬 Insights
                {recap?.personalityMode && (
                  <span className="personality-badge">{recap.personalityMode}</span>
                )}
              </h3>
              <div className="insights-content">
                {renderInsights(insightsContent)}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default WeeklyRecap
