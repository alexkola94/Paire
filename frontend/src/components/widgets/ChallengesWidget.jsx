import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiTarget, FiArrowRight, FiCheck, FiClock } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { challengeService } from '../../services/api'

const DIFFICULTY_COLORS = {
  easy: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#34D399' },
  medium: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)', text: '#FBBF24' },
  hard: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#F87171' },
}

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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(239, 68, 68, 0.2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  activeBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#FBBF24',
    background: 'rgba(251, 191, 36, 0.15)',
    padding: '3px 10px',
    borderRadius: '10px',
  },
  challengeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--glass-border)',
    marginBottom: '8px',
    transition: 'all 0.3s ease',
  },
  challengeIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  challengeInfo: {
    flex: 1,
    minWidth: 0,
  },
  challengeName: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  progressBar: {
    height: '4px',
    borderRadius: '2px',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease-out',
  },
  progressText: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '3px',
  },
  statusIcon: {
    flexShrink: 0,
  },
  viewLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#FBBF24',
    textDecoration: 'none',
    padding: '10px',
    borderRadius: '12px',
    background: 'rgba(251, 191, 36, 0.08)',
    transition: 'all 0.3s ease',
    marginTop: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '16px 0',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
}

function getChallengeEmoji(icon) {
  const map = {
    'clipboard-check': '📋',
    'shield-check': '🛡️',
    'ban': '🚫',
    'trending-up': '📈',
    'zap': '⚡',
    'tag': '🏷️',
    'check-circle': '✅',
    'heart': '💕',
  }
  return map[icon] || '🎯'
}

export default function ChallengesWidget() {
  const { t } = useTranslation()
  const { data: userChallenges, isLoading } = useQuery({
    queryKey: ['user-challenges', 'active'],
    queryFn: () => challengeService.getUserChallenges('active'),
  })

  const activeChallenges = useMemo(() => {
    if (!Array.isArray(userChallenges)) return []
    return userChallenges.slice(0, 3)
  }, [userChallenges])

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.icon}>
              <FiTarget size={18} color="#FBBF24" />
            </div>
            <div style={styles.title}>
              {t('challenges.title', { defaultValue: 'Challenges' })}
            </div>
          </div>
        </div>
        {[0, 1].map((i) => (
          <div key={i} style={{ ...styles.challengeItem, opacity: 0.5 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-tertiary)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'var(--bg-tertiary)', marginBottom: 8 }} />
              <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        ))}
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
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.icon}>
            <FiTarget size={18} color="#FBBF24" />
          </div>
          <div style={styles.title}>
            {t('challenges.title', { defaultValue: 'Challenges' })}
          </div>
        </div>
        {activeChallenges.length > 0 && (
          <span style={styles.activeBadge}>
            {activeChallenges.length} {t('challenges.active', { defaultValue: 'active' })}
          </span>
        )}
      </div>

      {activeChallenges.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.5 }}>🎯</div>
          <div style={styles.emptyText}>
            {t('challenges.noActive', { defaultValue: 'No active challenges. Browse available challenges to get started!' })}
          </div>
        </div>
      ) : (
        activeChallenges.map((uc, i) => {
          const challenge = uc.challenge || {}
          const difficulty = DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.medium
          const progress = uc.progress || 0
          const isCompleted = uc.status === 'completed'

          return (
            <motion.div
              key={uc.id}
              style={styles.challengeItem}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.35 }}
            >
              <div
                style={{
                  ...styles.challengeIcon,
                  background: difficulty.bg,
                  border: `1px solid ${difficulty.border}`,
                }}
              >
                {getChallengeEmoji(challenge.icon)}
              </div>
              <div style={styles.challengeInfo}>
                <div style={styles.challengeName}>{challenge.name || 'Challenge'}</div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(progress, 100)}%`,
                      background: isCompleted
                        ? 'linear-gradient(90deg, #10B981, #34D399)'
                        : `linear-gradient(90deg, ${difficulty.text}, ${difficulty.text}88)`,
                    }}
                  />
                </div>
                <div style={styles.progressText}>
                  {isCompleted
                    ? t('challenges.completed', { defaultValue: 'Completed!' })
                    : `${Math.round(progress)}%`}
                </div>
              </div>
              <div style={styles.statusIcon}>
                {isCompleted ? (
                  <FiCheck size={16} color="#10B981" />
                ) : (
                  <FiClock size={14} color="var(--text-light)" />
                )}
              </div>
            </motion.div>
          )
        })
      )}

      <Link to="/challenges" style={styles.viewLink}>
        {t('challenges.viewAll', { defaultValue: 'View All Challenges' })}
        <FiArrowRight size={14} />
      </Link>
    </motion.div>
  )
}
