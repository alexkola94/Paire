import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiBarChart2,
  FiActivity,
  FiCalendar,
  FiFilter,
  FiDownload,
  FiX,
  FiTag,
  FiFileText,
  FiUser
} from 'react-icons/fi'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Line, Bar } from 'react-chartjs-2'
import { analyticsService, transactionService, partnershipService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { format, subDays } from 'date-fns'
import LogoLoader from '../components/LogoLoader'
import Dropdown from '../components/Dropdown'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import { usePrivacyMode } from '../context/PrivacyModeContext'
import ExcelJS from 'exceljs'
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
  const { isPrivate } = usePrivacyMode() // Privacy mode for hiding amounts
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [loanAnalytics, setLoanAnalytics] = useState(null)
  const [comparativeAnalytics, setComparativeAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState('month') // 'week', 'month', 'year'
  const [viewFilter, setViewFilter] = useState('together') // 'solo', 'together', or partnerId
  const [exportFormat, setExportFormat] = useState('csv') // 'csv', 'json', 'xlsx'
  const [partnerships, setPartnerships] = useState([])
  const [partnersOptions, setPartnersOptions] = useState([])
  
  // Category transactions modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [categoryTransactions, setCategoryTransactions] = useState([])
  const [allFilteredTransactions, setAllFilteredTransactions] = useState([])
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  /**
   * Load analytics data on mount and when date range or filter changes
   */
  useEffect(() => {
    loadAnalytics()
  }, [dateRange, viewFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load partnerships on mount
   */
  useEffect(() => {
    const fetchPartnerships = async () => {
      try {
        const data = await partnershipService.getMyPartnerships()
        const currentUser = getStoredUser()

        // Process to extract partner profiles
        const processedList = (data || []).map(p => {
          const isUser1 = p.user1_id === currentUser.id
          return {
            id: p.id,
            partner: isUser1 ? p.user2 : p.user1
          }
        })

        setPartnerships(processedList)

        // Build options
        const options = [
          { value: 'together', label: t('analytics.together') },
          { value: 'solo', label: t('analytics.solo') }
        ]

        if (processedList.length === 1) {
          // Exact 1 partner: generic "Partner" label
          const p = processedList[0]
          if (p.partner) {
            options.push({
              value: p.partner.id,
              label: t('analytics.partner', 'Partner')
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
        console.error("Failed to load partnerships", err)
        // Fallback options
        setPartnersOptions([
          { value: 'together', label: t('analytics.together') },
          { value: 'solo', label: t('analytics.solo') }
        ])
      }
    }
    fetchPartnerships()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Get date range based on selection
   */
  const getDateRange = () => {
    const end = new Date()
    let start

    switch (dateRange) {
      case 'week':
        // Last 7 days
        start = subDays(end, 7)
        break
      case 'month':
        // This month (from 1st to today)
        start = new Date(end.getFullYear(), end.getMonth(), 1)
        break
      case 'lastMonth':
        // Last month (full month)
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
        // End should be last day of last month
        return {
          start: start.toISOString(),
          end: new Date(end.getFullYear(), end.getMonth(), 0, 23, 59, 59).toISOString()
        }
      case 'last3Months':
        // Last 3 months from today
        start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate())
        break
      case 'last6Months':
        // Last 6 months from today
        start = new Date(end.getFullYear(), end.getMonth() - 6, end.getDate())
        break
      case 'year':
        // This year (from Jan 1st to today)
        start = new Date(end.getFullYear(), 0, 1)
        break
      case 'lastYear':
        // Last year (full year)
        start = new Date(end.getFullYear() - 1, 0, 1)
        return {
          start: start.toISOString(),
          end: new Date(end.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString()
        }
      case 'all':
        // All time - set start to a very early date
        start = new Date(2000, 0, 1)
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

      // Normalize IDs to strings for comparison
      const txUserIdStr = String(transactionUserId)
      const currentUserIdStr = String(currentUserId)

      const isCurrentUser = txUserIdStr === currentUserIdStr

      // Fallback to email check if needed (legacy data)
      const userEmail = transaction.user_profiles?.email?.toLowerCase() ||
        transaction.userProfiles?.email?.toLowerCase()
      const isCurrentUserByEmail = userEmail === currentUserEmail

      const isMe = isCurrentUser || (isCurrentUserByEmail && !transactionUserId)

      if (viewFilter === 'solo') {
        return isMe
      }

      if (viewFilter === 'together') {
        return true
      }

      // If filter is specific partner ID
      if (viewFilter !== 'solo' && viewFilter !== 'together') {
        return txUserIdStr === viewFilter
      }

      return true
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
        
        // Store filtered transactions for category drill-down
        setAllFilteredTransactions(filteredTransactions)

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
      // Silent error handling for analytics loading
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
      labels: categories.map(c => t(`categories.${(c.category || '').toLowerCase()}`) || c.category),
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
        const categoryName = t(`categories.${(cat.category || '').toLowerCase()}`) || cat.category
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
  const generateExcel = async () => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Paire App'
    workbook.created = new Date()

    const fileName = `analytics_export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ]
    summarySheet.addRows([
      ['Period', dateRange],
      ['Filter', viewFilter],
      [t('analytics.totalIncome'), analytics.totalIncome],
      [t('analytics.totalExpenses'), analytics.totalExpenses],
      [t('analytics.netBalance'), analytics.balance],
      [t('analytics.avgDailySpending'), analytics.averageDailySpending]
    ])

    // 2. Categories Sheet
    if (analytics.categoryBreakdown && analytics.categoryBreakdown.length > 0) {
      const categorySheet = workbook.addWorksheet('Categories')
      categorySheet.columns = [
        { header: 'Category', key: 'category', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ]
      analytics.categoryBreakdown.forEach(cat => {
        categorySheet.addRow({
          category: t(`categories.${(cat.category || '').toLowerCase()}`) || cat.category,
          amount: cat.amount,
          percentage: `${cat.percentage.toFixed(2)}%`
        })
      })
    }

    // 3. Monthly Sheet
    if (analytics.monthlyComparison && analytics.monthlyComparison.length > 0) {
      const monthlySheet = workbook.addWorksheet('Monthly')
      monthlySheet.columns = [
        { header: 'Month', key: 'month', width: 20 },
        { header: 'Income', key: 'income', width: 15 },
        { header: 'Expenses', key: 'expenses', width: 15 },
        { header: 'Balance', key: 'balance', width: 15 }
      ]
      analytics.monthlyComparison.forEach(m => {
        monthlySheet.addRow({
          month: `${m.month} ${m.year}`,
          income: m.income,
          expenses: m.expenses,
          balance: m.balance
        })
      })
    }

    // 4. Partners Sheet
    if (comparativeAnalytics && comparativeAnalytics.partnerComparison) {
      const partnerSheet = workbook.addWorksheet('Partners')
      partnerSheet.columns = [
        { header: 'Partner', key: 'partner', width: 20 },
        { header: 'Spent', key: 'spent', width: 15 },
        { header: 'Transactions', key: 'transactions', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 }
      ]
      comparativeAnalytics.partnerComparison.forEach(p => {
        partnerSheet.addRow({
          partner: p.partner,
          spent: p.totalSpent,
          transactions: p.transactionCount,
          percentage: `${p.percentage.toFixed(2)}%`
        })
      })
    }

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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

  /**
   * Handle category click - open modal with filtered transactions
   */
  const handleCategoryClick = (category) => {
    // Filter transactions by the selected category (expenses only)
    const filtered = allFilteredTransactions.filter(
      tx => tx.type === 'expense' && 
           (tx.category || 'other').toLowerCase() === category.toLowerCase()
    ).sort((a, b) => new Date(b.date) - new Date(a.date))
    
    setSelectedCategory(category)
    setCategoryTransactions(filtered)
    setCategoryModalOpen(true)
  }

  /**
   * Close category modal
   */
  const closeCategoryModal = () => {
    setCategoryModalOpen(false)
    setSelectedCategory(null)
    setCategoryTransactions([])
  }

  /**
   * Handle click outside modal to close and manage focus
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeCategoryModal()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeCategoryModal()
      }
    }

    if (categoryModalOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      // Focus the close button for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [categoryModalOpen])

  if (loading && partnersOptions.length === 0) { // Wait for options to load if possible, but keep loading state management
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
            options={partnersOptions.length > 0 ? partnersOptions : [
              { value: 'together', label: t('analytics.together') },
              { value: 'solo', label: t('analytics.solo') }
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
              { value: 'lastMonth', label: t('analytics.lastMonth') },
              { value: 'last3Months', label: t('analytics.last3Months') },
              { value: 'last6Months', label: t('analytics.last6Months') },
              { value: 'year', label: t('analytics.thisYear') },
              { value: 'lastYear', label: t('analytics.lastYear') },
              { value: 'all', label: t('analytics.allTime') }
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
              <p className={`amount ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(analytics.totalIncome)}</p>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-icon">
              <FiTrendingDown size={32} />
            </div>
            <div className="card-content">
              <h3>{t('analytics.totalExpenses')}</h3>
              <p className={`amount ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(analytics.totalExpenses)}</p>
            </div>
          </div>

          <div className="summary-card balance-card">
            <div className="card-icon">
              <span style={{ fontSize: '32px', fontWeight: 'bold' }}>€</span>
            </div>
            <div className="card-content">
              <h3>{t('analytics.netBalance')}</h3>
              <p className={`amount ${analytics.balance >= 0 ? 'positive' : 'negative'} ${isPrivate ? 'masked-number' : ''}`}>
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
              <p className={`amount ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(analytics.averageDailySpending)}</p>
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

              {/* Category List - Show all categories (clickable) */}
              <div className="category-list">
                {analytics.categoryBreakdown.map((cat, index) => (
                  <div 
                    key={index} 
                    className="category-item clickable"
                    onClick={() => handleCategoryClick(cat.category)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategoryClick(cat.category)}
                    title={t('analytics.clickToViewTransactions', 'Click to view transactions')}
                  >
                    <div className="category-info">
                      <span
                        className="category-color-indicator"
                        style={{
                          backgroundColor: getCategoryChartData()?.datasets[0]?.backgroundColor[index] || '#6C5CE7'
                        }}
                      />
                      <span className="category-name">
                        {t(`categories.${(cat.category || '').toLowerCase()}`) || cat.category}
                      </span>
                    </div>
                    <span className={`category-amount ${isPrivate ? 'masked-number' : ''}`}>
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
                <span className={`stat-value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(loanAnalytics.totalLoansGiven)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.loansReceived')}</label>
                <span className={`stat-value ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(loanAnalytics.totalLoansReceived)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.paidBack')}</label>
                <span className={`stat-value positive ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(loanAnalytics.totalPaidBack)}</span>
              </div>
              <div className="loan-stat">
                <label>{t('analytics.outstanding')}</label>
                <span className={`stat-value negative ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(loanAnalytics.totalOutstanding)}</span>
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
                    <td className={`positive ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(month.income)}</td>
                    <td className={`negative ${isPrivate ? 'masked-number' : ''}`}>{formatCurrency(month.expenses)}</td>
                    <td className={`${month.balance >= 0 ? 'positive' : 'negative'} ${isPrivate ? 'masked-number' : ''}`}>
                      {formatCurrency(month.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Transactions Modal - Rendered via Portal for proper positioning */}
      {categoryModalOpen && createPortal(
        <div 
          className="category-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
        >
          <div className="category-modal" ref={modalRef}>
            {/* Modal Header */}
            <div className="category-modal-header">
              <div className="modal-title-section">
                <div className="modal-icon-wrapper">
                  <FiTag size={20} />
                </div>
                <div className="modal-title-text">
                  <h2 id="category-modal-title">
                    {t(`categories.${(selectedCategory || '').toLowerCase()}`) || selectedCategory}
                  </h2>
                  <span className="modal-subtitle">
                    {categoryTransactions.length} {t('analytics.transactions')}
                  </span>
                </div>
              </div>
              <button 
                ref={closeButtonRef}
                className="modal-close-btn"
                onClick={closeCategoryModal}
                aria-label={t('common.close')}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Modal Content - Transaction List */}
            <div className="category-modal-content">
              {categoryTransactions.length === 0 ? (
                <div className="empty-transactions">
                  <FiFileText size={48} />
                  <p>{t('analytics.noTransactionsInCategory', 'No transactions in this category')}</p>
                </div>
              ) : (
                <div className="category-transactions-list">
                  {categoryTransactions.map((tx, index) => (
                    <div key={tx.id || index} className="category-transaction-item">
                      <div className="transaction-main">
                        <div className="transaction-info">
                          <span className="transaction-description">
                            {tx.description || t(`categories.${(tx.category || '').toLowerCase()}`) || tx.category}
                          </span>
                          <span className="transaction-date">
                            {format(new Date(tx.date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <span className="transaction-amount negative">
                          -{formatCurrency(tx.amount)}
                        </span>
                      </div>
                      {/* Show who added it if available */}
                      {(tx.user_profiles?.display_name || tx.userProfiles?.display_name) && (
                        <div className="transaction-meta">
                          <FiUser size={12} />
                          <span>{tx.user_profiles?.display_name || tx.userProfiles?.display_name}</span>
                        </div>
                      )}
                      {tx.notes && (
                        <div className="transaction-notes">
                          <FiFileText size={12} />
                          <span>{tx.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="category-modal-footer">
              <div className="modal-total">
                <span>{t('analytics.totalExpenses')}:</span>
                <strong className="negative">
                  {formatCurrency(categoryTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0))}
                </strong>
              </div>
              <button className="btn btn-secondary" onClick={closeCategoryModal}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Analytics

