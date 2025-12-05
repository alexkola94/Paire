import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiCalendar
} from 'react-icons/fi'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Line, Bar } from 'react-chartjs-2'
import { analyticsService } from '../services/api'
import { format, subDays } from 'date-fns'
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

/**
 * Analytics Page Component
 * Displays financial insights, charts, and partner comparisons
 */
function Analytics() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [loanAnalytics, setLoanAnalytics] = useState(null)
  const [comparativeAnalytics, setComparativeAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState('month') // 'week', 'month', 'year'

  /**
   * Load analytics data on mount and when date range changes
   */
  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

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
   * Fetch analytics from backend
   */
  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const range = getDateRange()
      
      console.log('📊 Loading analytics for date range:', range)

      // Fetch all analytics separately to handle individual failures
      try {
        console.log('💰 Fetching financial analytics...')
        const financial = await analyticsService.getFinancialAnalytics(range.start, range.end)
        console.log('✅ Financial analytics loaded:', financial)
        setAnalytics(financial)
      } catch (error) {
        console.error('❌ Error loading financial analytics:', error)
        console.error('Error details:', error.message, error.stack)
        setAnalytics(null)
      }

      try {
        console.log('💳 Fetching loan analytics...')
        const loans = await analyticsService.getLoanAnalytics(range.start, range.end)
        console.log('✅ Loan analytics loaded:', loans)
        setLoanAnalytics(loans)
      } catch (error) {
        console.error('❌ Error loading loan analytics:', error)
        console.error('Error details:', error.message, error.stack)
        setLoanAnalytics(null)
      }

      try {
        console.log('📈 Fetching comparative analytics...')
        const comparative = await analyticsService.getComparativeAnalytics(range.start, range.end)
        console.log('✅ Comparative analytics loaded:', comparative)
        setComparativeAnalytics(comparative)
      } catch (error) {
        console.error('❌ Error loading comparative analytics:', error)
        console.error('Error details:', error.message, error.stack)
        console.error('This is expected if you have no partnership or no transactions')
        setComparativeAnalytics(null)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
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
      currency: 'EUR'
    }).format(amount)
  }

  /**
   * Prepare category breakdown pie chart data
   */
  const getCategoryChartData = () => {
    if (!analytics || !analytics.categoryBreakdown) return null

    const categories = analytics.categoryBreakdown.slice(0, 6) // Top 6 categories

    return {
      labels: categories.map(c => t(`categories.${c.category}`) || c.category),
      datasets: [{
        data: categories.map(c => c.amount),
        backgroundColor: [
          '#4F46E5', // Primary
          '#10B981', // Success
          '#F59E0B', // Warning
          '#EF4444', // Error
          '#8B5CF6', // Purple
          '#EC4899'  // Pink
        ],
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

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
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
        
        {/* Date Range Selector */}
        <div className="date-range-selector">
          <FiCalendar size={18} />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="week">{t('analytics.lastWeek')}</option>
            <option value="month">{t('analytics.thisMonth')}</option>
            <option value="year">{t('analytics.thisYear')}</option>
          </select>
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
        {/* Category Breakdown Pie Chart */}
        {analytics && analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0 && (
          <div className="card chart-card">
            <div className="card-header">
              <h2>
                <FiPieChart size={24} />
                {t('analytics.categoryBreakdown')}
              </h2>
            </div>
            <div className="chart-container pie-chart">
              <Pie data={getCategoryChartData()} options={chartOptions} />
            </div>
            
            {/* Category List */}
            <div className="category-list">
              {analytics.categoryBreakdown.slice(0, 6).map((cat, index) => (
                <div key={index} className="category-item">
                  <span className="category-name">
                    {t(`categories.${cat.category}`) || cat.category}
                  </span>
                  <span className="category-amount">
                    {formatCurrency(cat.amount)}
                    <small> ({cat.percentage.toFixed(1)}%)</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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

