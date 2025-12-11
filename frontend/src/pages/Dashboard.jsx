import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
  FiFileText
} from 'react-icons/fi'
import { transactionService, budgetService, savingsGoalService } from '../services/api'
import { format } from 'date-fns'
import SecurityBadge from '../components/SecurityBadge'

import Skeleton from '../components/Skeleton'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import CountUpAnimation from '../components/CountUpAnimation'
import PullToRefresh from '../components/PullToRefresh'
import BudgetProgressBar from '../components/BudgetProgressBar'
import SavingGoalProgressBar from '../components/SavingGoalProgressBar'
import { FiTarget, FiPieChart } from 'react-icons/fi'
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
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5
  const [budgets, setBudgets] = useState([])
  const [savingGoals, setSavingGoals] = useState([])

  // Memoize date calculations to avoid recalculation on every render
  const dateRange = useMemo(() => {
    const now = new Date()
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
  }, []) // Only calculate once on mount

  /**
   * Fetch summary, recent transactions, and budgets
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

      // Fetch budgets
      try {
        const budgetData = await budgetService.getAll()
        setBudgets(budgetData || [])
      } catch (err) {
        console.warn('Failed to load budgets', err)
      }

      // Fetch saving goals
      try {
        const goalsData = await savingsGoalService.getAll()
        setSavingGoals(goalsData || [])
      } catch (err) {
        console.warn('Failed to load saving goals', err)
      }

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
   * Format currency for display
   * Using custom hook for locale awareness
   */
  const formatCurrency = useCurrencyFormatter()

  // Memoize displayed transactions to prevent unnecessary re-renders
  const totalPages = Math.ceil(recentTransactions.length / PAGE_SIZE)
  const displayedTransactions = useMemo(() => {
    return recentTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [recentTransactions, page])

  if (loading) {
    return (
      <div className="dashboard-page">
        {/* Skeleton Header */}
        <div className="page-header">
          <Skeleton height="32px" width="200px" style={{ marginBottom: '8px' }} />
          <Skeleton height="20px" width="150px" />
        </div>

        {/* Skeleton Summary Cards */}
        <div className="summary-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="summary-card glass-card">
              <div className="card-icon">
                <Skeleton type="circular" width="32px" height="32px" />
              </div>
              <div className="card-content">
                <Skeleton height="16px" width="80px" style={{ marginBottom: '8px' }} />
                <Skeleton height="24px" width="100px" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Quick Access */}
        <div className="quick-access-section" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2].map(i => (
            <Skeleton key={i} height="80px" style={{ flex: 1, borderRadius: '16px' }} />
          ))}
        </div>

        {/* Skeleton Recent Transactions */}
        <div className="card recent-transactions glass-card">
          <div className="card-header flex-between">
            <Skeleton height="24px" width="180px" />
            <Skeleton height="20px" width="80px" />
          </div>
          <div className="transactions-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 0' }}>
                <Skeleton type="circular" width="40px" height="40px" />
                <div style={{ flex: 1 }}>
                  <Skeleton height="16px" width="60%" style={{ marginBottom: '4px' }} />
                  <Skeleton height="12px" width="30%" />
                </div>
                <Skeleton height="20px" width="60px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleRefresh = async () => {
    await loadDashboardData()
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="dashboard-page">
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
        <div className="summary-card income-card glass-card">
          <div className="card-icon">
            <FiTrendingUp size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalIncome')}</h3>
            <p className="amount">
              <CountUpAnimation value={summary.income} formatter={formatCurrency} />
            </p>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="summary-card expense-card glass-card">
          <div className="card-icon">
            <FiTrendingDown size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalExpenses')}</h3>
            <p className="amount">
              <CountUpAnimation value={summary.expenses} formatter={formatCurrency} />
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="summary-card balance-card glass-card">
          <div className="card-icon">
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>€</span>
          </div>
          <div className="card-content">
            <h3>{t('dashboard.balance')}</h3>
            <p className={`amount ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
              <CountUpAnimation value={summary.balance} formatter={formatCurrency} />
            </p>
          </div>
        </div>
      </div>

      {/* Budget Progress Section - Phase 4 Feature */}
      <div className="budget-section glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiTarget /> {t('navigation.budgets')}
          </h2>
          <Link to="/budgets" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
            {t('common.viewAll')}
          </Link>
        </div>


        {budgets.length > 0 ? (
          budgets.slice(0, 3).map(budget => {
            // Calculate spent amount for this category in current month
            // We need full expenses list for this, but currently we only have 'recentTransactions'
            // which might be incomplete if we rely on it for calculation.
            // Ideally api should provide spent amount. 
            // Looking at Budgets.jsx logic, it fetches all expenses for the month to calculate.
            // For dashboard performance, we can estimate from recentTransactions OR fetch month expenses.
            // Let's assume we can rely on 'recentTransactions' if it contains all month's data,
            // BUT loadDashboardData creates 'recentTransactions' from ALL transactions, so we can filter locally.

            const spent = recentTransactions
              .filter(t =>
                t.type === 'expense' &&
                t.category === budget.category &&
                new Date(t.date) >= dateRange.startOfMonth &&
                new Date(t.date) <= dateRange.endOfMonth
              )
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <BudgetProgressBar
                key={budget.id}
                label={t(`categories.${budget.category}`) || budget.category}
                spent={spent}
                total={budget.amount}
                currencyFormatter={formatCurrency}
                // No specific icon mapping yet, generic or based on category
                icon={null}
              />
            )
          })
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            {t('budgets.noBudgets') || "No active budgets. Create one to track spending!"}
          </p>
        )}
      </div>

      {/* Saving Goals Section */}
      <div className="saving-goals-section glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPieChart /> {t('dashboard.savingGoals', 'Saving Goals')}
          </h2>
          <Link to="/savings-goals" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
            {t('common.viewAll')}
          </Link>
        </div>

        {savingGoals.length > 0 ? (
          savingGoals.slice(0, 3).map(goal => (
            <SavingGoalProgressBar
              key={goal.id}
              label={goal.name}
              currentAmount={goal.currentAmount}
              targetAmount={goal.targetAmount}
              currencyFormatter={formatCurrency}
              icon={null}
            />
          ))
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            {t('dashboard.noSavingGoals', "Start saving for your dreams! Create a goal.")}
          </p>
        )}
      </div>

      <div className="quick-access-section" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Link
          to="/currency-calculator"
          className="quick-access-btn"
        >
          <div className="quick-access-icon">
            €
          </div>
          <span>{t('navigation.currencyCalculator')}</span>
        </Link>

        <Link
          to="/economic-news"
          className="quick-access-btn"
        >
          <div className="quick-access-icon">
            <FiFileText size={20} />
          </div>
          <span>{t('navigation.economicNews')}</span>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="card recent-transactions glass-card">
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  &lt;
                </button>

                <span>
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
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

