import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign,
  FiArrowRight 
} from 'react-icons/fi'
import { transactionService } from '../services/api'
import { format } from 'date-fns'
import './Dashboard.css'

/**
 * Dashboard Page Component
 * Displays financial overview and recent transactions
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

  /**
   * Load dashboard data on component mount
   */
  useEffect(() => {
    loadDashboardData()
  }, [])

  /**
   * Fetch summary and recent transactions
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Get current month dates
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      console.log('🔍 Dashboard Debug - Date Range:', {
        now: now.toISOString(),
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear()
      })

      // Fetch summary for current month
      console.log('📊 Fetching summary...')
      const summaryData = await transactionService.getSummary(
        startOfMonth.toISOString(),
        endOfMonth.toISOString()
      )
      console.log('✅ Summary received:', summaryData)
      setSummary(summaryData)

      // Fetch recent transactions (last 10)
      console.log('📝 Fetching transactions...')
      const transactions = await transactionService.getAll()
      console.log('✅ Transactions received:', transactions?.length, 'transactions')
      setRecentTransactions(transactions.slice(0, 10))
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Format currency for display
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>{t('dashboard.title')}</h1>
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
            <FiDollarSign size={32} />
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
          <Link to="/expenses" className="view-all-link">
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
          <div className="transactions-list">
            {recentTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className={`transaction-item ${transaction.type}`}
              >
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
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    {transaction.user_profiles && (
                      <span className="added-by">
                        {' • Added by '}
                        {transaction.user_profiles.display_name}
                        {transaction.user_profiles.email && (
                          <span className="added-by-email"> ({transaction.user_profiles.email})</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
                <div className={`transaction-amount ${transaction.type}`}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

