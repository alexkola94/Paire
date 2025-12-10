import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight
} from 'react-icons/fi'
import { transactionService } from '../services/api'
import { format } from 'date-fns'
import SecurityBadge from '../components/SecurityBadge'
import LogoLoader from '../components/LogoLoader'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './Dashboard.css'

/**
 * Dashboard Page Component
 * Displays financial overview and recent transactions
 * Optimized with React.memo and useMemo for better performance
 */
function Dashboard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [visibleCount, setVisibleCount] = useState(5)

  // Memoize date calculations to avoid recalculation on every render
  const dateRange = useMemo(() => {
    const now = new Date()
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
  }, []) // Only calculate once on mount

  /**
   * Fetch summary and recent transactions
   * Memoized with useCallback to prevent unnecessary re-renders
   */
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch summary for current month
      const summaryData = await transactionService.getSummary(
        dateRange.startOfMonth.toISOString(),
        dateRange.endOfMonth.toISOString()
      )
      setSummary(summaryData)

      // Fetch recent transactions (fetch all, then slice locally for display)
      const transactions = await transactionService.getAll()
      // Ensure they are sorted by date desc
      const sortedTransactions = transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
      setRecentTransactions(sortedTransactions)
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange.startOfMonth, dateRange.endOfMonth])

  /**
   * Load dashboard data on component mount
   */
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  /**
   * Handle Load More
   */
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 5)
  }

  /**
   * Format currency for display
   * Using custom hook for locale awareness
   */
  const formatCurrency = useCurrencyFormatter()

  // Memoize displayed transactions to prevent unnecessary re-renders
  const displayedTransactions = useMemo(() => {
    return recentTransactions.slice(0, visibleCount)
  }, [recentTransactions, visibleCount])

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>
          {t('dashboard.title')}
          <SecurityBadge />
        </h1>
        <p className="page-subtitle">{t('dashboard.monthlyOverview')}</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        {/* Income Card */}
        <div className="summary-card income-card">
          <div className="card-icon">
            <FiTrendingUp size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalIncome')}</h3>
            <p className="amount">{formatCurrency(summary.income)}</p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="summary-card expense-card">
          <div className="card-icon">
            <FiTrendingDown size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalExpenses')}</h3>
            <p className="amount">{formatCurrency(summary.expenses)}</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="summary-card balance-card">
          <div className="card-icon">
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>€</span>
          </div>
          <div className="card-content">
            <h3>{t('dashboard.balance')}</h3>
            <p className={`amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card recent-transactions">
        <div className="card-header flex-between">
          <h2>{t('dashboard.recentTransactions')}</h2>
          <Link to="/transactions" className="view-all-link">
            {t('common.viewAll')}
            <FiArrowRight size={18} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noTransactions')}</p>
            <div className="quick-actions">
              <Link to="/expenses" className="btn btn-primary">
                <FiTrendingDown />
                {t('expenses.addExpense')}
              </Link>
              <Link to="/income" className="btn btn-secondary">
                <FiTrendingUp />
                {t('income.addIncome')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="transactions-list">
              {displayedTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  formatCurrency={formatCurrency}
                  t={t}
                />
              ))}
            </div>

            {visibleCount < recentTransactions.length && (
              <div className="load-more-container">
                <button
                  onClick={handleLoadMore}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {t('common.loadMore', 'Load More')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Transaction Item Component
 * Memoized to prevent re-renders when parent updates
 */
const TransactionItem = memo(({ transaction, formatCurrency, t }) => {
  const formattedDate = useMemo(() => {
    return format(new Date(transaction.date), 'MMM dd, yyyy')
  }, [transaction.date])

  return (
    <div className={`transaction-item ${transaction.type}`}>
      <div className="transaction-icon">
        {transaction.type === 'income' ? (
          <FiTrendingUp size={20} />
        ) : (
          <FiTrendingDown size={20} />
        )}
      </div>
      <div className="transaction-details">
        <h4>{transaction.description || transaction.category}</h4>
        <p className="transaction-date">
          {formattedDate}
          {transaction.user_profiles && (
            <span className="added-by">
              {' • ' + t('dashboard.addedBy') + ' '}
              {transaction.user_profiles.display_name}
            </span>
          )}
        </p>
      </div>
      <div className={`transaction-amount ${transaction.type}`}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount))}
      </div>
    </div>
  )
})

TransactionItem.displayName = 'TransactionItem'

export default memo(Dashboard)

