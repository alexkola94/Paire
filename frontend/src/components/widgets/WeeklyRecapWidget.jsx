import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiCalendar, FiTrendingDown, FiTrendingUp, FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { weeklyRecapService } from '../../services/api'
import useCurrencyFormatter from '../../hooks/useCurrencyFormatter'

const styles = {
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    background: 'rgba(139, 92, 246, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    letterSpacing: '0.02em',
  },
  weekLabel: {
    fontSize: '11px',
    color: 'var(--text-light)',
    marginTop: '2px',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '14px',
  },
  statBlock: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    background: 'var(--bg-tertiary)',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  expenseColor: { color: '#EF4444' },
  incomeColor: { color: '#10B981' },
  topCategory: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'var(--bg-tertiary)',
    marginBottom: '14px',
  },
  topCatLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
  },
  topCatValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  insight: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '16px',
    fontStyle: 'italic',
    padding: '0 2px',
  },
  viewLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#8B5CF6',
    textDecoration: 'none',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(139, 92, 246, 0.1)',
    transition: 'all 0.3s ease',
  },
  emptyState: {
    textAlign: 'center',
    padding: '16px 0',
    color: 'var(--text-light)',
    fontSize: '13px',
  },
}

export default function WeeklyRecapWidget() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const { data: recap, isLoading } = useQuery({
    queryKey: ['weekly-recap-latest'],
    queryFn: () => weeklyRecapService.getLatest(),
  })

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div style={styles.icon}>
              <FiCalendar size={16} color="#8B5CF6" />
            </div>
            <div style={styles.title}>
              {t('weeklyRecap.title', { defaultValue: 'Weekly Recap' })}
            </div>
          </div>
        </div>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: '48px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              marginBottom: '10px',
            }}
          />
        ))}
      </div>
    )
  }

  if (!recap) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <div style={styles.icon}>
              <FiCalendar size={16} color="#8B5CF6" />
            </div>
            <div style={styles.title}>
              {t('weeklyRecap.title', { defaultValue: 'Weekly Recap' })}
            </div>
          </div>
        </div>
        <div style={styles.emptyState}>
          {t('weeklyRecap.noRecap', { defaultValue: 'No recap available yet.' })}
        </div>
      </div>
    )
  }

  const weekStart = recap.weekStartDate
    ? new Date(recap.weekStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''
  const weekEnd = recap.weekEndDate
    ? new Date(recap.weekEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''

  const insightSnippet = recap.personalityInsight || recap.aiInsight || recap.summary || null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={styles.card}
    >
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div style={styles.icon}>
            <FiCalendar size={16} color="#8B5CF6" />
          </div>
          <div>
            <div style={styles.title}>
              {t('weeklyRecap.title', { defaultValue: 'Weekly Recap' })}
            </div>
            {weekStart && (
              <div style={styles.weekLabel}>
                {weekStart} — {weekEnd}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBlock}>
          <div style={styles.statLabel}>
            <FiTrendingDown size={12} />
            {t('weeklyRecap.spent', { defaultValue: 'Spent' })}
          </div>
          <div style={{ ...styles.statValue, ...styles.expenseColor }}>
            {formatCurrency(recap.totalSpent ?? 0)}
          </div>
        </div>
        <div style={styles.statBlock}>
          <div style={styles.statLabel}>
            <FiTrendingUp size={12} />
            {t('weeklyRecap.earned', { defaultValue: 'Earned' })}
          </div>
          <div style={{ ...styles.statValue, ...styles.incomeColor }}>
            {formatCurrency(recap.totalIncome ?? 0)}
          </div>
        </div>
      </div>

      {recap.topCategory && (
        <div style={styles.topCategory}>
          <span style={styles.topCatLabel}>
            {t('weeklyRecap.topCategory', { defaultValue: 'Top Category' })}
          </span>
          <span style={styles.topCatValue}>
            {t(`categories.${recap.topCategory}`, { defaultValue: recap.topCategory })}
          </span>
        </div>
      )}

      {insightSnippet && (
        <div style={styles.insight}>
          &ldquo;{insightSnippet.length > 120 ? insightSnippet.slice(0, 120) + '…' : insightSnippet}&rdquo;
        </div>
      )}

      <Link to="/weekly-recap" style={styles.viewLink}>
        {t('weeklyRecap.viewFull', { defaultValue: 'View Full Recap' })}
        <FiArrowRight size={14} />
      </Link>
    </motion.div>
  )
}
