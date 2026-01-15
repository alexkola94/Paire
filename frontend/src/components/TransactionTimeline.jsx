import React, { useMemo, useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { el, es, fr, enGB } from 'date-fns/locale'
import TransactionTimelineItem from './TransactionTimelineItem'
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './TransactionTimeline.css'

// Locale mapping for date-fns
const localeMap = {
  en: enGB,
  el: el,
  es: es,
  fr: fr
}

/**
 * Groups transactions by date and returns sorted groups
 */
const groupTransactionsByDate = (transactions, t, language) => {
  if (!transactions || transactions.length === 0) return []

  const locale = localeMap[language] || enGB

  // Group by date
  const groups = new Map()
  transactions.forEach(transaction => {
    const date = typeof transaction.date === 'string'
      ? parseISO(transaction.date)
      : transaction.date
    const dateKey = format(date, 'yyyy-MM-dd')

    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date,
        dateKey,
        transactions: []
      })
    }
    groups.get(dateKey).transactions.push(transaction)
  })

  // Sort groups by date ascending (oldest first, newest at bottom)
  return Array.from(groups.values())
    .sort((a, b) => a.date - b.date)
    .map(group => {
      let dateLabel
      if (isToday(group.date)) {
        dateLabel = t('timeline.today')
      } else if (isYesterday(group.date)) {
        dateLabel = t('timeline.yesterday')
      } else {
        dateLabel = format(group.date, 'd MMM', { locale })
      }

      // Sort transactions within group by time ascending (oldest first, newest at bottom)
      const sortedTransactions = [...group.transactions].sort((a, b) => {
        const dateA = typeof a.date === 'string' ? parseISO(a.date) : a.date
        const dateB = typeof b.date === 'string' ? parseISO(b.date) : b.date
        return dateA - dateB
      })

      return {
        ...group,
        dateLabel,
        transactions: sortedTransactions
      }
    })
}

// Memoized date header component
const DateHeader = React.memo(({ label }) => (
  <div className="timeline-date-header-wrapper">
    <div className="timeline-date-header">
      <span className="timeline-date-badge">{label}</span>
    </div>
  </div>
))

DateHeader.displayName = 'DateHeader'

const TransactionTimeline = ({
  transactions = [],
  maxHeight = '600px',
  showRelativeDates = true
}) => {
  const { t, i18n } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const { isPrivate } = usePrivacyMode()
  const containerRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  // Track window width for responsive layout
  useEffect(() => {
    const updateDimensions = () => {
      setIsMobile(window.innerWidth < 768)
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Auto-scroll to bottom on mount to show most recent transactions
  useEffect(() => {
    if (containerRef.current && transactions && transactions.length > 0) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 150)
      return () => clearTimeout(timer)
    }
  }, []) // Only run on mount

  // Process and memoize transaction groups
  const groupedTransactions = useMemo(() =>
    groupTransactionsByDate(transactions, t, i18n.language),
    [transactions, t, i18n.language]
  )

  // Empty state
  if (!transactions || transactions.length === 0) {
    return (
      <div className="timeline-container timeline-empty">
        <div className="timeline-empty-state">
          <div className="timeline-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p>{t('timeline.noTransactions')}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`timeline-container ${isMobile ? 'timeline-mobile' : 'timeline-desktop'}`}
      style={{ maxHeight, overflowY: 'auto' }}
    >
      <div className="timeline-axis" />

      <div className="timeline-content">
        {groupedTransactions.map(group => (
          <div key={group.dateKey} className="timeline-group">
            <DateHeader label={group.dateLabel} />

            {group.transactions.map(transaction => (
              <TransactionTimelineItem
                key={transaction.id}
                transaction={transaction}
                formatCurrency={formatCurrency}
                isMobile={isMobile}
                isPrivate={isPrivate}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

TransactionTimeline.propTypes = {
  transactions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
    description: PropTypes.string,
    amount: PropTypes.number.isRequired,
    type: PropTypes.oneOf(['income', 'expense']).isRequired,
    category: PropTypes.string
  })),
  maxHeight: PropTypes.string,
  showRelativeDates: PropTypes.bool
}

export default React.memo(TransactionTimeline)
