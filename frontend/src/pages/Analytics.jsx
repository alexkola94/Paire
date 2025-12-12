import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiCalendar,
  FiFilter,
  FiDownload
} from 'react-icons/fi'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Line, Bar } from 'react-chartjs-2'
import { analyticsService, transactionService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { format, subDays } from 'date-fns'
import LogoLoader from '../components/LogoLoader'
import Dropdown from '../components/Dropdown'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import { utils, writeFile } from 'xlsx'
import './Analytics.css'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function Analytics() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [loanAnalytics, setLoanAnalytics] = useState(null)
  const [comparativeAnalytics, setComparativeAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState('month') // 'week', 'month', 'year'
  const [viewFilter, setViewFilter] = useState('together') // 'solo', 'partner', 'together'
  const [exportFormat, setExportFormat] = useState('csv') // 'csv', 'json', 'xlsx'

  /**
   * Load analytics data on mount and when date range or filter changes
   */
  useEffect(() => {
    loadAnalytics()
  }, [dateRange, viewFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Get date range based on selection
   */
  const getDateRange = () => {
    const end = new Date()
    let start

    switch (dateRange) {
      case 'week':
        start = subDays(end, 7)
        break
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1)
        break
      case 'year':
        start = new Date(end.getFullYear(), 0, 1)
        break
      default:
        start = new Date(end.getFullYear(), end.getMonth(), 1)
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    }
  }

  /**
   * Filter transactions based on view filter (Solo/Partner/Together)
   */
  const filterTransactions = (transactions) => {
    if (!transactions || transactions.length === 0) return []

    const currentUser = getStoredUser()
    if (!currentUser) return transactions

    const currentUserId = currentUser.id
    const currentUserEmail = currentUser.email?.toLowerCase()

    return transactions.filter(transaction => {
      // Check by user_id first (more reliable)
      const transactionUserId = transaction.user_id || transaction.userId
      const isCurrentUserById = transactionUserId === currentUserId

      // Fallback to email check if user_id doesn't match
      const userEmail = transaction.user_profiles?.email?.toLowerCase() ||
        transaction.userProfiles?.email?.toLowerCase()
      const isCurrentUserByEmail = userEmail === currentUserEmail

      // Determine transaction ownership
      const isCurrentUser = isCurrentUserById || isCurrentUserByEmail
      const isPartner = !isCurrentUser && (transactionUserId || userEmail)

      switch (viewFilter) {
        case 'solo':
          return isCurrentUser
        case 'partner':
          return isPartner
        case 'together':
          return true // Show all transactions
        default:
          return true
      }
    })
  }

  /**
   * Calculate analytics from filtered transactions
   */
  const calculateAnalyticsFromTransactions = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        averageDailySpending: 0,
        categoryBreakdown: [],
        incomeExpenseTrend: [],
        monthlyComparison: []
      }
    }

    // Filter expenses only
    const expenses = transactions.filter(t => t.type === 'expense')
    const income = transactions.filter(t => t.type === 'income')

    // Calculate totals
    const totalIncome = income.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0)
    const balance = totalIncome - totalExpenses

    // Calculate average daily spending
    const range = getDateRange()
    const startDate = new Date(range.start)
    const endDate = new Date(range.end)
    const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
    const averageDailySpending = totalExpenses / daysDiff

    // Category breakdown
    const categoryMap = {}
    expenses.forEach(expense => {
      const category = expense.category || 'other'
      const amount = expense.amount || 0
      if (!categoryMap[category]) {
        categoryMap[category] = 0
      }
      categoryMap[category] += amount
    })

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    // Income vs Expenses trend (by day)
    const trendMap = {}
    transactions.forEach(t => {
      const date = format(new Date(t.date), 'yyyy-MM-dd')
      if (!trendMap[date]) {
        trendMap[date] = { date, income: 0, expenses: 0 }
      }
      if (t.type === 'income') {
        trendMap[date].income += t.amount || 0
      } else if (t.type === 'expense') {
        trendMap[date].expenses += t.amount || 0
      }
    })

    const incomeExpenseTrend = Object.values(trendMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Monthly comparison
    const monthlyMap = {}
    transactions.forEach(t => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: format(date, 'MMM'),
          year: date.getFullYear(),
          income: 0,
          expenses: 0
        }
      }
      if (t.type === 'income') {
        monthlyMap[monthKey].income += t.amount || 0
      } else if (t.type === 'expense') {
        monthlyMap[monthKey].expenses += t.amount || 0
      }
    })

    const monthlyComparison = Object.values(monthlyMap)
      .map(month => ({
        ...month,
        balance: month.income - month.expenses
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return new Date(`${a.month} 1, ${a.year}`) - new Date(`${b.month} 1, ${b.year}`)
      })

    return {
      totalIncome,
      totalExpenses,
      balance,
      averageDailySpending,
      categoryBreakdown,
      incomeExpenseTrend,
      monthlyComparison
    }
  }

  /**
   * Fetch analytics from backend
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const range = getDateRange()

      // Fetch all transactions first to filter them
      try {
        const allTransactions = await transactionService.getAll({
          startDate: range.start,
          endDate: range.end
        })

        // Filter transactions based on view filter
        const filteredTransactions = filterTransactions(allTransactions || [])

        // Calculate analytics from filtered transactions
        const calculatedAnalytics = calculateAnalyticsFromTransactions(filteredTransactions)
        setAnalytics(calculatedAnalytics)
      } catch (error) {
        // Fallback to API if transaction filtering fails
        try {
          const financial = await analyticsService.getFinancialAnalytics(range.start, range.end)
          setAnalytics(financial)
        } catch (apiError) {
          setAnalytics(null)
        }
      }

      try {
        const loans = await analyticsService.getLoanAnalytics(range.start, range.end)
        setLoanAnalytics(loans)
      } catch (error) {
        setLoanAnalytics(null)
      }

      try {
        const comparative = await analyticsService.getComparativeAnalytics(range.start, range.end)
        setComparativeAnalytics(comparative)
      } catch (error) {
        setComparativeAnalytics(null)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }



  /**
   * Prepare category breakdown pie chart data
   */
  const getCategoryChartData = () => {
    if (!analytics || !analytics.categoryBreakdown || analytics.categoryBreakdown.length === 0) return null

    // Show all categories, not just top 6
    const categories = analytics.categoryBreakdown

    // Generate colors for all categories
    const colorPalette = [
      '#6C5CE7', // Primary purple
      '#10B981', // Success green
      '#F59E0B', // Warning orange
      '#EF4444', // Error red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#A855F7'  // Violet
    ]

    // Repeat colors if needed
    const colors = categories.map((_, index) =>
      colorPalette[index % colorPalette.length]
    )

    return {
      labels: categories.map(c => t(`categories.${c.category}`) || c.category),
      datasets: [{
        data: categories.map(c => c.amount),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }

  /**
   * Prepare income vs expenses line chart data
   */
  const getTrendChartData = () => {
    if (!analytics || !analytics.incomeExpenseTrend) return null

    const trend = analytics.incomeExpenseTrend

    return {
      labels: trend.map(t => format(new Date(t.date), 'MMM dd')),
      datasets: [
        {
          label: t('analytics.income'),
          data: trend.map(t => t.income),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: t('analytics.expenses'),
          data: trend.map(t => t.expenses),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    }
  }

  /**
   * Prepare partner comparison bar chart data
   */
  const getPartnerComparisonData = () => {
    if (!comparativeAnalytics || !comparativeAnalytics.partnerComparison) return null

    const partners = comparativeAnalytics.partnerComparison

    return {
      labels: partners.map(p => p.partner || 'Unknown'),
      datasets: [{
        label: t('analytics.spending'),
        data: partners.map(p => p.totalSpent),
        backgroundColor: ['#4F46E5', '#10B981'],
        borderRadius: 8
      }]
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      }
    }
  }



  /**
   * Generate CSV export
   */
  const generateCSV = () => {
    // BOM for Excel to correct display characters
    let csvContent = '\uFEFF'

    // 1. Summary Section
    csvContent += '--- Summary ---\n'
    csvContent += `Period,${dateRange}\n`
    csvContent += `Filter,${viewFilter}\n`
    csvContent += `${t('analytics.totalIncome')},${analytics.totalIncome}\n`
    csvContent += `${t('analytics.totalExpenses')},${analytics.totalExpenses}\n`
    csvContent += `${t('analytics.netBalance')},${analytics.balance}\n`
    csvContent += `${t('analytics.avgDailySpending')},${analytics.averageDailySpending}\n\n`

    // 2. Category Breakdown
    if (analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0) {
      csvContent += '--- Category Breakdown ---\n'
      csvContent += 'Category,Amount,Percentage\n'
      analytics.categoryBreakdown.forEach(cat => {
        const categoryName = t(`categories.${cat.category}`) || cat.category
        csvContent += `"${categoryName}",${cat.amount},${cat.percentage.toFixed(2)}%\n`
      })
      csvContent += '\n'
    }

    // 3. Monthly Comparison
    if (analytics.monthlyComparison && analytics.monthlyComparison.length > 0) {
      csvContent += '--- Monthly Comparison ---\n'
      csvContent += 'Month,Income,Expenses,Balance\n'
      analytics.monthlyComparison.forEach(m => {
        csvContent += `${m.month} ${m.year},${m.income},${m.expenses},${m.balance}\n`
      })
      csvContent += '\n'
    }

    // 4. Partner Comparison
    if (comparativeAnalytics && comparativeAnalytics.partnerComparison) {
      csvContent += '--- Partner Comparison ---\n'
      csvContent += 'Partner,Spent,Transactions,Percentage\n'
      comparativeAnalytics.partnerComparison.forEach(p => {
        csvContent += `"${p.partner}",${p.totalSpent},${p.transactionCount},${p.percentage.toFixed(2)}%\n`
      })
    }

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Generate JSON export
   */
  const generateJSON = () => {
    const data = {
      meta: {
        date: new Date().toISOString(),
        range: dateRange,
        filter: viewFilter
      },
      summary: {
        income: analytics.totalIncome,
        expenses: analytics.totalExpenses,
        balance: analytics.balance,
        averageDaily: analytics.averageDailySpending
      },
      categories: analytics.categoryBreakdown,
      monthly: analytics.monthlyComparison,
      partners: comparativeAnalytics?.partnerComparison || [],
      loans: loanAnalytics || null
    }

    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Generate Excel export
   */
  const generateExcel = () => {
    const wb = utils.book_new()
    const fileName = `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    // 1. Summary Sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Period', dateRange],
      ['Filter', viewFilter],
      [t('analytics.totalIncome'), analytics.totalIncome],
      [t('analytics.totalExpenses'), analytics.totalExpenses],
      [t('analytics.netBalance'), analytics.balance],
      [t('analytics.avgDailySpending'), analytics.averageDailySpending]
    ]
    const summaryWs = utils.aoa_to_sheet(summaryData)
    utils.book_append_sheet(wb, summaryWs, 'Summary')

    // 2. Categories Sheet
    if (analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0) {
      const categoryData = analytics.categoryBreakdown.map(cat => ({
        Category: t(`categories.${cat.category}`) || cat.category,
        Amount: cat.amount,
        Percentage: `${cat.percentage.toFixed(2)}%`
      }))
      const categoryWs = utils.json_to_sheet(categoryData)
      utils.book_append_sheet(wb, categoryWs, 'Categories')
    }

    // 3. Monthly Sheet
    if (analytics.monthlyComparison && analytics.monthlyComparison.length > 0) {
      const monthlyData = analytics.monthlyComparison.map(m => ({
        Month: `${m.month} ${m.year}`,
        Income: m.income,
        Expenses: m.expenses,
        Balance: m.balance
      }))
      const monthlyWs = utils.json_to_sheet(monthlyData)
      utils.book_append_sheet(wb, monthlyWs, 'Monthly')
    }

    // 4. Partners Sheet
    if (comparativeAnalytics && comparativeAnalytics.partnerComparison) {
      const partnerData = comparativeAnalytics.partnerComparison.map(p => ({
        Partner: p.partner,
        Spent: p.totalSpent,
        Transactions: p.transactionCount,
        Percentage: `${p.percentage.toFixed(2)}%`
      }))
      const partnerWs = utils.json_to_sheet(partnerData)
      utils.book_append_sheet(wb, partnerWs, 'Partners')
    }

    writeFile(wb, fileName)
  }

  /**
   * Handle Export based on selected format
   */
  const handleExport = () => {
    if (!analytics) return

    switch (exportFormat) {
      case 'json':
        generateJSON()
        break
      case 'xlsx':
        generateExcel()
        break
      case 'csv':
      default:
        generateCSV()
        break
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="analytics-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>
            <FiBarChart2 size={32} />
            {t('analytics.title')}
          </h1>
          <p className="page-subtitle">{t('analytics.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="analytics-filters">
          {/* Export Format Selector */}
          <Dropdown
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'json', label: 'JSON' },
              { value: 'xlsx', label: 'Excel' }
            ]}
            value={exportFormat}
            onChange={(value) => setExportFormat(value)}
            className="analytics-filter export-format-dropdown"
          />

          <button
            className="btn btn-outline"
            onClick={handleExport}
            disabled={!analytics}
            title={t('common.export')}
            style={{ height: '42px' }}
          >
            <FiDownload size={18} />
            <span className="desktop-only">{t('common.export') || 'Export'}</span>
          </button>

          {/* View Filter */}
          <Dropdown
            icon={<FiFilter size={18} />}
            options={[
              { value: 'together', label: t('analytics.together') },
              { value: 'solo', label: t('analytics.solo') },
              { value: 'partner', label: t('analytics.partner') }
            ]}
            value={viewFilter}
            onChange={(value) => setViewFilter(value)}
            className="analytics-filter"
          />

          {/* Date Range Selector */}
          <Dropdown
            icon={<FiCalendar size={18} />}
            options={[
              { value: 'week', label: t('analytics.lastWeek') },
              { value: 'month', label: t('analytics.thisMonth') },
              { value: 'year', label: t('analytics.thisYear') }
            ]}
            value={dateRange}
            onChange={(value) => setDateRange(value)}
            className="analytics-filter"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="summary-cards">
          <div className="summary-card income-card">
            <div className="card-icon">
              <FiTrendingUp size={32} />
            </div>
            <div className="card-content">
              <h3>{t('analytics.totalIncome')}</h3>
              <p className="amount">{formatCurrency(analytics.totalIncome)}</p>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-icon">
              <FiTrendingDown size={32} />
            </div>
            <div className="card-content">
              <h3>{t('analytics.totalExpenses')}</h3>
              <p className="amount">{formatCurrency(analytics.totalExpenses)}</p>
            </div>
          </div>

          <div className="summary-card balance-card">
            <div className="card-icon">
              <span style={{ fontSize: '32px', fontWeight: 'bold' }}>€</span>
            </div>
            <div className="card-content">
              <h3>{t('analytics.netBalance')}</h3>
              <p className={`amount ${analytics.balance >= 0 ? 'positive' : 'negative'}`}>
                {formatCurrency(analytics.balance)}
              </p>
            </div>
          </div>

          <div className="summary-card average-card">
            <div className="card-icon">
              <FiActivity size={32} />
            </div>
            <div className="card-content">
              <h3>{t('analytics.avgDailySpending')}</h3>
              <p className="amount">{formatCurrency(analytics.averageDailySpending)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Category Breakdown Pie Chart - Always show, even if empty */}
        <div className="card chart-card">
          <div className="card-header">
            <h2>
              <FiPieChart size={24} />
              {t('analytics.categoryBreakdown')}
            </h2>
          </div>
          {analytics && analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
            <>
              <div className="chart-container pie-chart">
                <Pie data={getCategoryChartData()} options={chartOptions} />
              </div>

              {/* Category List - Show all categories */}
              <div className="category-list">
                {analytics.categoryBreakdown.map((cat, index) => (
                  <div key={index} className="category-item">
                    <div className="category-info">
                      <span
                        className="category-color-indicator"
                        style={{
                          backgroundColor: getCategoryChartData()?.datasets[0]?.backgroundColor[index] || '#6C5CE7'
                        }}
                      />
                      <span className="category-name">
                        {t(`categories.${cat.category}`) || cat.category}
                      </span>
                    </div>
                    <span className="category-amount">
                      {formatCurrency(cat.amount)}
                      <small> ({cat.percentage.toFixed(1)}%)</small>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-chart-state">
              <FiPieChart size={64} />
              <h3>{t('analytics.noCategoryData')}</h3>
              <p>{t('analytics.noCategoryDataDescription')}</p>
            </div>
          )}
        </div>

        {/* Income vs Expenses Trend */}
        {analytics && analytics.incomeExpenseTrend && analytics.incomeExpenseTrend.length > 0 && (
          <div className="card chart-card">
            <div className="card-header">
              <h2>
                <FiActivity size={24} />
                {t('analytics.incomeTrend')}
              </h2>
            </div>
            <div className="chart-container">
              <Line data={getTrendChartData()} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Partner Comparison */}
        {comparativeAnalytics && comparativeAnalytics.partnerComparison && comparativeAnalytics.partnerComparison.length > 0 && (
          <div className="card chart-card">
            <div className="card-header">
              <h2>
                <FiBarChart2 size={24} />
                {t('analytics.partnerComparison')}
              </h2>
            </div>
            <div className="chart-container">
              <Bar data={getPartnerComparisonData()} options={chartOptions} />
            </div>

            {/* Partner Details */}
            <div className="partner-details-list">
              {comparativeAnalytics.partnerComparison.map((partner, index) => (
                <div key={index} className="partner-detail-item">
                  <span className="partner-name">{partner.partner}</span>
                  <div className="partner-stats">
                    <span>{formatCurrency(partner.totalSpent)}</span>
                    <span className="partner-percentage">({partner.percentage.toFixed(1)}%)</span>
                    <span className="partner-count">{partner.transactionCount} {t('analytics.transactions')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loan Analytics */}
        {loanAnalytics && (
          <div className="card loans-analytics-card">
            <div className="card-header">
              <h2>{t('analytics.loanSummary')}</h2>
            </div>

            <div className="loan-stats-grid">
              <div className="loan-stat">
                <label>{t('analytics.loansGiven')}</label>
                <span className="stat-value">{formatCurrency(loanAnalytics.totalLoansGiven)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.loansReceived')}</label>
                <span className="stat-value">{formatCurrency(loanAnalytics.totalLoansReceived)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.paidBack')}</label>
                <span className="stat-value positive">{formatCurrency(loanAnalytics.totalPaidBack)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.outstanding')}</label>
                <span className="stat-value negative">{formatCurrency(loanAnalytics.totalOutstanding)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Comparison */}
      {analytics && analytics.monthlyComparison && analytics.monthlyComparison.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>{t('analytics.monthlyComparison')}</h2>
          </div>
          <div className="monthly-comparison-table">
            <table>
              <thead>
                <tr>
                  <th>{t('analytics.month')}</th>
                  <th>{t('analytics.income')}</th>
                  <th>{t('analytics.expenses')}</th>
                  <th>{t('analytics.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {analytics.monthlyComparison.map((month, index) => (
                  <tr key={index}>
                    <td>{month.month} {month.year}</td>
                    <td className="positive">{formatCurrency(month.income)}</td>
                    <td className="negative">{formatCurrency(month.expenses)}</td>
                    <td className={month.balance >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(month.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics

