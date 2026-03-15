import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { financialHealthService } from '../../../services/api'

const RING_SIZE = 120
const STROKE_WIDTH = 10
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getScoreColor(score) {
  if (score < 40) return '#EF4444'
  if (score < 70) return '#F59E0B'
  return '#10B981'
}

function getScoreLabel(score, t) {
  if (score < 40) return t('paireScore.needsWork', { defaultValue: 'Needs Work' })
  if (score < 70) return t('paireScore.good', { defaultValue: 'Good' })
  return t('paireScore.excellent', { defaultValue: 'Excellent' })
}

const COMPONENT_KEYS = [
  { key: 'budgetAdherenceScore', label: 'paireScore.budget', defaultLabel: 'Budget', color: '#8B5CF6' },
  { key: 'savingsRateScore', label: 'paireScore.savings', defaultLabel: 'Savings', color: '#10B981' },
  { key: 'debtHealthScore', label: 'paireScore.debt', defaultLabel: 'Debt', color: '#F59E0B' },
  { key: 'expenseConsistencyScore', label: 'paireScore.consistency', defaultLabel: 'Consistency', color: '#3B82F6' },
  { key: 'goalProgressScore', label: 'paireScore.goals', defaultLabel: 'Goals', color: '#EC4899' },
]

const styles = {
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    padding: '24px',
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    marginBottom: '16px',
    letterSpacing: '0.02em',
  },
  ringSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: '20px',
  },
  ringCenter: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: '36px',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    color: 'var(--text-primary)',
  },
  scoreLabel: {
    fontSize: '11px',
    fontWeight: '600',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  changeIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '4px',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  changePositive: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
  },
  changeNegative: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
  },
  componentsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  componentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  componentLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    width: '76px',
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.8s ease-out',
  },
  componentValue: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    width: '28px',
    textAlign: 'right',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px 0',
    color: 'var(--text-light)',
    fontSize: '13px',
  },
}

export default function PaireScoreWidget() {
  const { t } = useTranslation()
  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['paire-score'],
    queryFn: () => financialHealthService.getScore(),
  })

  const score = scoreData?.overallScore ?? 0
  const color = getScoreColor(score)
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE
  const change = scoreData?.changeFromLastMonth ?? null

  const components = useMemo(() => {
    if (!scoreData) return []
    return COMPONENT_KEYS.map((c) => ({
      ...c,
      value: scoreData[c.key] ?? 0,
    }))
  }, [scoreData])

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.title}>{t('paireScore.title', { defaultValue: 'Paire Score' })}</div>
        <div style={{ ...styles.ringSection, opacity: 0.3 }}>
          <svg width={RING_SIZE} height={RING_SIZE}>
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={STROKE_WIDTH}
            />
          </svg>
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '6px',
              borderRadius: '3px',
              background: 'var(--bg-tertiary)',
              marginBottom: '10px',
            }}
          />
        ))}
      </div>
    )
  }

  if (!scoreData) {
    return (
      <div style={styles.card}>
        <div style={styles.title}>{t('paireScore.title', { defaultValue: 'Paire Score' })}</div>
        <div style={styles.emptyState}>
          {t('paireScore.noData', { defaultValue: 'Not enough data yet. Keep logging!' })}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={styles.card}
    >
      <div style={styles.title}>{t('paireScore.title', { defaultValue: 'Paire Score' })}</div>

      <div style={styles.ringSection}>
        <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--bg-tertiary)"
            strokeWidth={STROKE_WIDTH}
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        </svg>

        <div style={styles.ringCenter}>
          <motion.span
            style={{ ...styles.scoreNumber, color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span style={{ ...styles.scoreLabel, color }}>{getScoreLabel(score, t)}</span>
          {change !== null && change !== 0 && (
            <div
              style={{
                ...styles.changeIndicator,
                ...(change > 0 ? styles.changePositive : styles.changeNegative),
              }}
            >
              {change > 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
              {change > 0 ? '+' : ''}
              {change}
            </div>
          )}
        </div>
      </div>

      <div style={styles.componentsSection}>
        {components.map((comp) => (
          <div key={comp.key} style={styles.componentRow}>
            <span style={styles.componentLabel}>
              {t(comp.label, { defaultValue: comp.defaultLabel })}
            </span>
            <div style={styles.barTrack}>
              <motion.div
                style={{
                  ...styles.barFill,
                  background: comp.color,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${comp.value}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <span style={styles.componentValue}>{comp.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
