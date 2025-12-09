import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FiTrendingUp, 
  FiTrendingDown,
  FiArrowLeft,
  FiChevronRight
} from 'react-icons/fi'
import { transactionService } from '../services/api'
import { format } from 'date-fns'
import LogoLoader from '../components/LogoLoader'
import './AllTransactions.css'

/**
 * All Transactions Page Component
 * Displays all transactions (income and expenses) merged together
 * Optimized with React.memo and useMemo for better performance
 */
function AllTransactions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])

  /**
   * Fetch all transactions (both income and expenses)
   * Memoized with useCallback to prevent unnecessary re-renders
   */
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch all transactions without type filter to get both income and expenses
      const data = await transactionService.getAll()
      // Sort by date (newest first)
      const sortedData = data.sort((a, b) => {
        return new Date(b.date) - new Date(a.date)
      })
      setTransactions(sortedData)
    } catch (error) {
      console.error('❌ Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load transactions on component mount
   */
  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  /**
   * Format currency for display
   * Memoized to avoid creating new formatter on every render
   */
  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }, [])

  // Memoize transactions to prevent unnecessary re-renders
  const memoizedTransactions = useMemo(() => {
    return transactions
  }, [transactions])

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="all-transactions-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/dashboard" className="breadcrumb-link">
              {t('navigation.dashboard')}
            </Link>
          </li>
          <li className="breadcrumb-separator" aria-hidden="true">
            <FiChevronRight size={16} />
          </li>
          <li className="breadcrumb-item breadcrumb-current" aria-current="page">
            {t('allTransactions.title')}
          </li>
        </ol>
      </nav>

      {/* Page Header with Back Button */}
      <div className="page-header">
        <div className="page-header-top">
          <button
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label={t('common.back')}
            title={t('common.back')}
          >
            <FiArrowLeft size={20} />
            <span>{t('common.back')}</span>
          </button>
        </div>
        <div className="page-header-content">
          <h1>{t('allTransactions.title')}</h1>
          <p className="page-subtitle">
            {t('allTransactions.totalCount', { count: transactions.length })}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card empty-state">
          <p>{t('allTransactions.noTransactions')}</p>
        </div>
      ) : (
        <div className="card transactions-container">
          <div className="transactions-list">
            {memoizedTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                formatCurrency={formatCurrency}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
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

export default memo(AllTransactions)

