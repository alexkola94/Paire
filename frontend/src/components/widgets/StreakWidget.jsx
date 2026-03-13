import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FiZap } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { streakService } from '../../services/api'

const STREAK_TYPES = ['expense_logging', 'login', 'budget_adherence']

const STREAK_LABELS = {
  expense_logging: 'streaks.expenseLogging',
  login: 'streaks.login',
  budget_adherence: 'streaks.budgetAdherence',
}

const styles = {
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  cardActive: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(251, 146, 60, 0.15) 100%)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconActive: {
    background: 'linear-gradient(135deg, #8B5CF6, #F97316)',
  },
  iconInactive: {
    background: 'var(--bg-tertiary)',
  },
  streakCount: {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '-0.02em',
    lineHeight: 1,
    color: 'var(--text-primary)',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginTop: '2px',
  },
  sublabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  pillRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '16px',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
  },
  pillActive: {
    background: 'rgba(139, 92, 246, 0.25)',
    color: '#C4B5FD',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  pillInactive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-light)',
    border: '1px solid var(--glass-border)',
  },
  pillCount: {
    fontWeight: '700',
    fontSize: '13px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '12px 0',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    opacity: 0.4,
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
}

export default function StreakWidget() {
  const { t } = useTranslation()
  const { data: streaks, isLoading } = useQuery({
    queryKey: ['streaks'],
    queryFn: () => streakService.getAll(),
  })

  const bestStreak = useMemo(() => {
    if (!streaks?.length) return null
    return streaks.reduce(
      (best, s) => (s.currentStreak > (best?.currentStreak ?? 0) ? s : best),
      null
    )
  }, [streaks])

  const streakMap = useMemo(() => {
    if (!streaks?.length) return {}
    const map = {}
    streaks.forEach((s) => {
      map[s.streakType] = s
    })
    return map
  }, [streaks])

  const hasActiveStreak = bestStreak && bestStreak.currentStreak > 0

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              ...styles.iconWrapper,
              ...styles.iconInactive,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div>
            <div
              style={{
                width: '80px',
                height: '14px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
              }}
            />
            <div
              style={{
                width: '120px',
                height: '10px',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                marginTop: '8px',
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        ...styles.card,
        ...(hasActiveStreak ? styles.cardActive : {}),
      }}
    >
      {hasActiveStreak ? (
        <>
          <div style={styles.header}>
            <motion.div
              style={{ ...styles.iconWrapper, ...styles.iconActive }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FiZap size={20} color="#fff" />
            </motion.div>
            <div>
              <div style={styles.streakCount}>{bestStreak.currentStreak}</div>
              <div style={styles.label}>
                {t('streaks.dayStreak', { count: bestStreak.currentStreak, defaultValue: `Day Streak!` })}
              </div>
              {bestStreak.longestStreak > bestStreak.currentStreak && (
                <div style={styles.sublabel}>
                  {t('streaks.longestStreak', { count: bestStreak.longestStreak, defaultValue: `Best: ${bestStreak.longestStreak} days` })}
                </div>
              )}
            </div>
          </div>

          <div style={styles.pillRow}>
            {STREAK_TYPES.map((type) => {
              const streak = streakMap[type]
              const isActive = streak && streak.currentStreak > 0
              return (
                <div
                  key={type}
                  style={{
                    ...styles.pill,
                    ...(isActive ? styles.pillActive : styles.pillInactive),
                  }}
                >
                  <span>{t(STREAK_LABELS[type], { defaultValue: type.replace('_', ' ') })}</span>
                  <span style={styles.pillCount}>{streak?.currentStreak ?? 0}</span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={styles.emptyState}>
          <div style={styles.iconWrapper}>
            <FiZap size={20} color="var(--text-light)" />
          </div>
          <div style={styles.emptyText}>
            {t('streaks.noActiveStreak', { defaultValue: 'Log an expense to start your streak!' })}
          </div>
        </div>
      )}
    </motion.div>
  )
}
