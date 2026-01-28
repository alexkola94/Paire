import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
  FiFileText,
  FiUsers,
  FiUser,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi'
import { transactionService, budgetService, savingsGoalService, partnershipService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { format } from 'date-fns'
import SecurityBadge from '../components/SecurityBadge'

import Skeleton from '../components/Skeleton'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import CountUpAnimation from '../components/CountUpAnimation'
import PullToRefresh from '../components/PullToRefresh'
import BudgetProgressBar from '../components/BudgetProgressBar'
import SavingGoalProgressBar from '../components/SavingGoalProgressBar'
import Dropdown from '../components/Dropdown'
import { FiTarget, FiPieChart } from 'react-icons/fi'
import TransactionDetailModal from '../components/TransactionDetailModal'
import PrivacyToggle from '../components/PrivacyToggle'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import './Dashboard.css'

/**
 * Dashboard Page Component
 * Displays financial overview and recent transactions
 * Optimized with React.memo and useMemo for better performance
 */
function Dashboard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  const [refreshing, setRefreshing] = useState(false)
  const [filterMode, setFilterMode] = useState('solo') // 'solo', 'together', or specific partnerId
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5
  const [partnersOptions, setPartnersOptions] = useState([])
  const [detailModal, setDetailModal] = useState(null) // For viewing transaction details

  // Memoize date calculations to avoid recalculation on every render
  const dateRange = useMemo(() => {
    const now = new Date()
    return {
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      endOfMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
  }, [])

  // React Query: month transactions (for summary and client-side filter by partner)
  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['transactions', 'month', dateRange.startOfMonth.toISOString(), dateRange.endOfMonth.toISOString()],
    queryFn: () => transactionService.getAll({
      startDate: dateRange.startOfMonth.toISOString(),
      endDate: dateRange.endOfMonth.toISOString()
    })
  })
  const monthTransactions = useMemo(() => {
    const raw = monthData
    return Array.isArray(raw) ? raw : (raw?.items || [])
  }, [monthData])

  // React Query: recent transactions (server-side paginated, small window)
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['transactions', 'recent', 1, 10],
    queryFn: () => transactionService.getAll({ page: 1, pageSize: 10 })
  })
  const recentTransactions = useMemo(() => {
    const raw = recentData
    return Array.isArray(raw) ? raw : (raw?.items || [])
  }, [recentData])

  // React Query: budgets and saving goals
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: budgetService.getAll
  })
  const { data: savingGoals = [] } = useQuery({
    queryKey: ['savingsGoals'],
    queryFn: savingsGoalService.getAll
  })

  const initialLoading = monthLoading || recentLoading
  const dataLoaded = !monthLoading && !recentLoading

  /**
   * Pull-to-refresh: invalidate and refetch dashboard queries
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['savingsGoals'] })
      ])
    } finally {
      setRefreshing(false)
    }
  }, [queryClient])

  /**
   * Load partnerships for filter options
   */
  useEffect(() => {
    const fetchPartnerships = async () => {
      try {
        const data = await partnershipService.getMyPartnerships()
        const currentUser = getStoredUser()

        const processedList = (data || []).map(p => {
          const isUser1 = p.user1_id === currentUser.id
          return {
            id: p.id,
            partner: isUser1 ? p.user2 : p.user1
          }
        })

        const options = [
          { value: 'solo', label: t('dashboard.filterSolo', 'Solo') },
          { value: 'together', label: t('dashboard.filterTogether', 'Together') }
        ]

        if (processedList.length === 1) {
          // Exact 1 partner: generic "Partner" label
          const p = processedList[0]
          if (p.partner) {
            options.push({
              value: p.partner.id,
              label: t('dashboard.filterPartner', 'Partner')
            })
          }
        } else {
          // Multiple partners: show names
          processedList.forEach(p => {
            if (p.partner) {
              options.push({
                value: p.partner.id,
                label: p.partner.display_name || p.partner.email
              })
            }
          })
        }

        setPartnersOptions(options)
      } catch (err) {
        console.error("Failed to load partnerships for filter", err)
        setPartnersOptions([
          { value: 'solo', label: t('dashboard.filterSolo', 'Solo') },
          { value: 'together', label: t('dashboard.filterTogether', 'Together') }
        ])
      }
    }
    fetchPartnerships()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Filter Logic
   */
  const currentUser = getStoredUser()

  // Filter items based on selected mode (Works for transactions, budgets, and goals)
  const filterItem = useCallback((item) => {
    if (!currentUser) return true // Fallback if no user

    // Check both userId (standard) and user_id (from Budgets)
    const itemUserId = item.userId || item.user_id || item.userProfileId || (item.user_profiles && item.user_profiles.id)
    const currentUserId = currentUser.id || currentUser.Id

    // Normalize to string
    const itemUserIdStr = String(itemUserId)
    const currentUserIdStr = String(currentUserId)

    const isMyItem = itemUserIdStr === currentUserIdStr

    if (filterMode === 'solo') {
      return isMyItem
    }

    if (filterMode === 'together') {
      return true
    }

    // Specific partner filter
    return itemUserIdStr === filterMode

  }, [filterMode, currentUser])

  // Derived Summary based on filtered month transactions
  const displayedSummary = useMemo(() => {
    const filtered = monthTransactions.filter(filterItem)

    const summary = filtered.reduce((acc, transaction) => {
      if (transaction.type === 'expense') {
        acc.expenses += transaction.amount
      } else if (transaction.type === 'income') {
        acc.income += transaction.amount
      }
      return acc
    }, { income: 0, expenses: 0 })

    summary.balance = summary.income - summary.expenses
    return summary
  }, [monthTransactions, filterItem])

  // Filter recent transactions list
  const filteredRecentTransactions = useMemo(() => {
    return recentTransactions.filter(filterItem)
  }, [recentTransactions, filterItem])

  // Filter Budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter(filterItem)
  }, [budgets, filterItem])

  // Filter Saving Goals
  const filteredSavingGoals = useMemo(() => {
    return savingGoals.filter(filterItem)
  }, [savingGoals, filterItem])

  /**
   * Format currency for display
   * Using custom hook for locale awareness
   */
  const formatCurrency = useCurrencyFormatter()

  // Memoize displayed transactions to prevent unnecessary re-renders
  const totalPages = Math.ceil(filteredRecentTransactions.length / PAGE_SIZE)
  const displayedTransactions = useMemo(() => {
    return filteredRecentTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  }, [filteredRecentTransactions, page])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [filterMode])

  /**
   * Skeleton Loading State - Initial Load
   */
  if (initialLoading && !dataLoaded) {
    return (
      <div className="dashboard-page">
        {/* Skeleton Header */}
        <div className="page-header">
          <Skeleton height="32px" width="200px" style={{ marginBottom: '8px' }} />
          <Skeleton height="20px" width="150px" />
        </div>

        {/* Skeleton Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Skeleton height="44px" width="200px" style={{ borderRadius: '12px' }} />
        </div>

        {/* Skeleton Summary Cards */}
        <div className="summary-cards">
          {[1, 2, 3].map((i) => (
            <div key={i} className="summary-card glass-card skeleton-pulse">
              <div className="card-icon">
                <Skeleton type="circular" width="32px" height="32px" />
              </div>
              <div className="card-content">
                <Skeleton height="16px" width="80px" style={{ marginBottom: '8px' }} />
                <Skeleton height="28px" width="120px" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Budget Section */}
        <div className="glass-card skeleton-pulse" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Skeleton height="24px" width="120px" />
            <Skeleton height="20px" width="60px" />
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <Skeleton height="14px" width="100px" />
                <Skeleton height="14px" width="80px" />
              </div>
              <Skeleton height="8px" width="100%" style={{ borderRadius: '4px' }} />
            </div>
          ))}
        </div>

        {/* Skeleton Saving Goals */}
        <div className="glass-card skeleton-pulse" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Skeleton height="24px" width="140px" />
            <Skeleton height="20px" width="60px" />
          </div>
          {[1, 2].map(i => (
            <div key={i} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <Skeleton height="14px" width="120px" />
                <Skeleton height="14px" width="80px" />
              </div>
              <Skeleton height="8px" width="100%" style={{ borderRadius: '4px' }} />
            </div>
          ))}
        </div>

        {/* Skeleton Quick Access */}
        <div className="quick-access-section" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2].map(i => (
            <Skeleton key={i} height="80px" style={{ flex: 1, borderRadius: '16px' }} className="skeleton-pulse" />
          ))}
        </div>

        {/* Skeleton Recent Transactions */}
        <div className="card recent-transactions glass-card skeleton-pulse">
          <div className="card-header flex-between">
            <Skeleton height="24px" width="180px" />
            <Skeleton height="20px" width="80px" />
          </div>
          <div className="transactions-list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', alignItems: 'center' }}>
                <Skeleton type="circular" width="40px" height="40px" />
                <div style={{ flex: 1 }}>
                  <Skeleton height="16px" width="60%" style={{ marginBottom: '6px' }} />
                  <Skeleton height="12px" width="40%" />
                </div>
                <Skeleton height="20px" width="70px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="dashboard-page">
      {/* Blur Overlay for Refreshing State */}
      {refreshing && (
        <div className="dashboard-refresh-overlay">
          <div className="refresh-spinner">
            <FiRefreshCw className="spinning" size={32} />
            <span>{t('common.refreshing', 'Refreshing...')}</span>
          </div>
        </div>
      )}

      {/* Main Content - Blur when refreshing */}
      <div className={`dashboard-content ${refreshing ? 'is-refreshing' : ''}`}>
        {/* Page Header */}
        <div className="page-header">
          <h1>
            {t('dashboard.title')}
            <SecurityBadge />
          </h1>
          <p className="page-subtitle">{t('dashboard.monthlyOverview')}</p>
        </div>

        {/* Filter Controls - Dropdown + Privacy Toggle */}
        <div className="dashboard-filters" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
          <Dropdown
            icon={<FiFilter size={16} />}
            options={partnersOptions.length > 0 ? partnersOptions : [
              { value: 'solo', label: t('dashboard.filterSolo', 'Solo') },
              { value: 'together', label: t('dashboard.filterTogether', 'Together') }
            ]}
            value={filterMode}
            onChange={(value) => setFilterMode(value)}
            className="dashboard-filter-dropdown compact"
            style={{ minWidth: '120px', maxWidth: '160px' }}
          />
          <PrivacyToggle size="small" />
        </div>

      {/* Summary Cards */}
      <motion.div 
        className="summary-cards"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        {/* Income Card */}
        <motion.div 
          className="summary-card income-card glass-card"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
              }
            }
          }}
        >
          <div className="card-icon">
            <FiTrendingUp size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalIncome')}</h3>
            <p className={`amount ${isPrivate ? 'masked-number' : ''}`}>
              <CountUpAnimation value={displayedSummary.income} formatter={formatCurrency} />
            </p>
          </div>
        </motion.div>

        {/* Expenses Card */}
        <motion.div 
          className="summary-card expense-card glass-card"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
              }
            }
          }}
        >
          <div className="card-icon">
            <FiTrendingDown size={32} />
          </div>
          <div className="card-content">
            <h3>{t('dashboard.totalExpenses')}</h3>
            <p className={`amount ${isPrivate ? 'masked-number' : ''}`}>
              <CountUpAnimation value={displayedSummary.expenses} formatter={formatCurrency} />
            </p>
          </div>
        </motion.div>

        {/* Balance Card */}
        <motion.div 
          className="summary-card balance-card glass-card"
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
              }
            }
          }}
        >
          <div className="card-icon">
            <span style={{ fontSize: '32px', fontWeight: 'bold' }}>€</span>
          </div>
          <div className="card-content">
            <h3>{t('dashboard.balance')}</h3>
            <p className={`amount ${displayedSummary.balance >= 0 ? 'positive' : 'negative'} ${isPrivate ? 'masked-number' : ''}`}>
              <CountUpAnimation value={displayedSummary.balance} formatter={formatCurrency} />
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Budget Progress Section - Phase 4 Feature */}
      <motion.div 
        className="budget-section glass-card" 
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiTarget /> {t('navigation.budgets')}
          </h2>
          <Link to="/budgets" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
            {t('common.viewAll')}
          </Link>
        </div>


        {filteredBudgets.length > 0 ? (
          filteredBudgets.slice(0, 3).map(budget => {
            // Calculate spent amount for this category in current month
            // We need full expenses list for this, but currently we only have 'recentTransactions'
            // which might be incomplete if we rely on it for calculation.
            // Ideally api should provide spent amount. 
            // Looking at Budgets.jsx logic, it fetches all expenses for the month to calculate.
            // Dashboard uses monthTransactions (React Query) for current month; spent is derived from filtered month data.

            const spent = monthTransactions
              .filter(filterItem)
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
                icon={null}
                isPrivate={isPrivate}
              />
            )
          })
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            {t('budgets.noBudgets') || "No active budgets. Create one to track spending!"}
          </p>
        )}
      </motion.div>

      {/* Saving Goals Section */}
      <motion.div 
        className="saving-goals-section glass-card" 
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPieChart /> {t('dashboard.savingGoals', 'Saving Goals')}
          </h2>
          <Link to="/savings-goals" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
            {t('common.viewAll')}
          </Link>
        </div>

        {filteredSavingGoals.length > 0 ? (
          filteredSavingGoals.slice(0, 3).map(goal => (
            <SavingGoalProgressBar
              key={goal.id}
              label={goal.name}
              currentAmount={goal.currentAmount}
              targetAmount={goal.targetAmount}
              currencyFormatter={formatCurrency}
              icon={null}
              isPrivate={isPrivate}
            />
          ))
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
            {t('dashboard.noSavingGoals', "Start saving for your dreams! Create a goal.")}
          </p>
        )}
      </motion.div>

      <motion.div 
        className="quick-access-section" 
        style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { 
              opacity: 1, 
              x: 0,
              transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
              }
            }
          }}
        >
          <Link
            to="/currency-calculator"
            className="quick-access-btn"
          >
            <div className="quick-access-icon">
              €
            </div>
            <span>{t('navigation.currencyCalculator')}</span>
          </Link>
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { 
              opacity: 1, 
              x: 0,
              transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
              }
            }
          }}
        >
          <Link
            to="/economic-news"
            className="quick-access-btn"
          >
            <div className="quick-access-icon">
              <FiFileText size={20} />
            </div>
            <span>{t('navigation.economicNews')}</span>
          </Link>
        </motion.div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div 
        className="card recent-transactions glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
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
            <motion.div 
              className="transactions-list"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.05
                  }
                }
              }}
            >
              {displayedTransactions.length > 0 ? (
                displayedTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { 
                        opacity: 1, 
                        x: 0,
                        transition: {
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1]
                        }
                      }
                    }}
                  >
                    <TransactionItem
                      transaction={transaction}
                      formatCurrency={formatCurrency}
                      t={t}
                      onClick={() => setDetailModal(transaction)}
                      isPrivate={isPrivate}
                    />
                  </motion.div>
                ))
              ) : (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {t('common.noDataFound', 'No transactions found for this filter.')}
                </p>
              )}
            </motion.div>

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
      </motion.div>
      </div> {/* End dashboard-content */}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={detailModal}
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
      />
    </PullToRefresh>
  )
}

/**
 * Transaction Item Component
 * Memoized to prevent re-renders when parent updates
 * Supports privacy mode to hide sensitive amounts
 */
const TransactionItem = memo(({ transaction, formatCurrency, t, onClick, isPrivate }) => {
  const formattedDate = useMemo(() => {
    return format(new Date(transaction.date), 'MMM dd, yyyy')
  }, [transaction.date])

  return (
    <div 
      className={`transaction-item ${transaction.type} clickable`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
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
          {formattedDate}
          {transaction.paidBy === 'Bank' || transaction.isBankSynced ? (
            <span className="added-by">
              {' • ' + t('dashboard.bankConnection', 'Imported from Bank')}
            </span>
          ) : transaction.user_profiles && (
            <span className="added-by" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {' • '}
              {(transaction.user_profiles.avatar_url || transaction.user_profiles.avatarUrl) && (
                <img
                  src={transaction.user_profiles.avatar_url || transaction.user_profiles.avatarUrl}
                  alt={transaction.user_profiles.display_name}
                  className="tag-avatar"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              {t('dashboard.addedBy') + ' '}
              {transaction.user_profiles.display_name}
            </span>
          )}
        </p>
      </div>
      <div className={`transaction-amount ${transaction.type} ${isPrivate ? 'masked-number' : ''}`}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(Math.abs(transaction.amount))}
      </div>
    </div>
  )
})

TransactionItem.displayName = 'TransactionItem'

export default memo(Dashboard)

