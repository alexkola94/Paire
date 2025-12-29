import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'
import { transactionService } from '../services/api'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import Skeleton from './Skeleton'

/**
 * Widget to compare spending between this week and last week
 */
const WeeklyComparisonWidget = () => {
    const { t } = useTranslation()
    const formatCurrency = useCurrencyFormatter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        thisWeek: 0,
        lastWeek: 0,
        difference: 0,
        percentage: 0
    })

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const now = new Date()

                // This Week
                const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
                const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 })

                // Last Week
                const lastWeekStart = subWeeks(thisWeekStart, 1)
                const lastWeekEnd = subWeeks(thisWeekEnd, 1)

                const [thisWeekData, lastWeekData] = await Promise.all([
                    transactionService.getAll({
                        startDate: thisWeekStart.toISOString(),
                        endDate: thisWeekEnd.toISOString(),
                        type: 'expense'
                    }),
                    transactionService.getAll({
                        startDate: lastWeekStart.toISOString(),
                        endDate: lastWeekEnd.toISOString(),
                        type: 'expense'
                    })
                ])

                const thisWeekTotal = (thisWeekData || []).reduce((sum, t) => sum + (t.amount || 0), 0)
                const lastWeekTotal = (lastWeekData || []).reduce((sum, t) => sum + (t.amount || 0), 0)

                const difference = thisWeekTotal - lastWeekTotal
                const percentage = lastWeekTotal > 0
                    ? ((difference / lastWeekTotal) * 100)
                    : (thisWeekTotal > 0 ? 100 : 0)

                setStats({
                    thisWeek: thisWeekTotal,
                    lastWeek: lastWeekTotal,
                    difference,
                    percentage
                })
            } catch (error) {
                console.error('Failed to load weekly comparison', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="weekly-comparison-widget">
                <div className="comparison-header">
                    <Skeleton height="20px" width="100px" />
                </div>
                <div className="comparison-body">
                    <Skeleton height="32px" width="120px" style={{ marginBottom: '8px' }} />
                    <Skeleton height="16px" width="80%" />
                </div>
            </div>
        )
    }

    const isSpendingMore = stats.difference > 0
    const isSpendingLess = stats.difference < 0
    const isSame = stats.difference === 0

    return (
        <div className="weekly-comparison-widget h-full flex flex-col justify-between">
            <div className="comparison-metric">
                <span className="text-sm text-text-secondary">{t('analytics.thisWeek', 'This Week')}</span>
                <div className="text-2xl font-bold mt-1">
                    {formatCurrency(stats.thisWeek)}
                </div>
            </div>

            <div className={`comparison-trend flex items-center mt-3 ${isSpendingMore ? 'text-error' : isSpendingLess ? 'text-success' : 'text-text-secondary'
                }`}>
                <div className="icon-wrapper mr-2 p-1 rounded-full bg-opacity-10 bg-current">
                    {isSpendingMore ? <FiTrendingUp size={16} /> :
                        isSpendingLess ? <FiTrendingDown size={16} /> :
                            <FiMinus size={16} />}
                </div>

                <div className="trend-text text-sm">
                    {isSame ? (
                        <span>{t('analytics.sameAsLastWeek', 'Same as last week')}</span>
                    ) : (
                        <>
                            <span className="font-medium">
                                {Math.abs(stats.percentage).toFixed(0)}%
                            </span>
                            <span className="ml-1">
                                {isSpendingMore
                                    ? t('analytics.moreThanLastWeek', 'more than last week')
                                    : t('analytics.lessThanLastWeek', 'less than last week')}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-2 text-xs text-text-secondary">
                {t('analytics.lastWeekWas', 'Last week')}: {formatCurrency(stats.lastWeek)}
            </div>
        </div>
    )
}

export default WeeklyComparisonWidget
