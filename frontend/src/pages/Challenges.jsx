import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FiTarget, FiCheck, FiClock, FiGift, FiChevronDown, FiChevronUp, FiStar } from 'react-icons/fi'
import { challengeService } from '../services/api'

const DIFFICULTY_META = {
  easy: { label: 'Easy', color: '#34D399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
  medium: { label: 'Medium', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.25)' },
  hard: { label: 'Hard', color: '#F87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' },
}

const TYPE_META = {
  daily: { label: 'Daily', emoji: '☀️' },
  weekly: { label: 'Weekly', emoji: '📅' },
  monthly: { label: 'Monthly', emoji: '📆' },
}

function getChallengeEmoji(icon) {
  const map = {
    'clipboard-check': '📋', 'shield-check': '🛡️', 'ban': '🚫', 'trending-up': '📈',
    'zap': '⚡', 'tag': '🏷️', 'check-circle': '✅', 'heart': '💕',
  }
  return map[icon] || '🎯'
}

const styles = {
  page: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '32px',
  },
  pageIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(239, 68, 68, 0.2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 18px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    outline: 'none',
  },
  tabActive: {
    background: 'rgba(251, 191, 36, 0.2)',
    color: '#FBBF24',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  tabInactive: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: 'var(--glass-border)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '28px',
  },
  statCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    border: 'var(--glass-border)',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-light)',
    marginTop: '6px',
    fontWeight: '500',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  card: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: 'var(--glass-border)',
    padding: '18px',
    marginBottom: '12px',
    transition: 'all 0.3s ease',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
    marginBottom: '10px',
  },
  badgeRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
  },
  progressSection: {
    marginTop: '10px',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  progressLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  progressPct: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  progressBar: {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.8s ease-out',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  joinBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
    color: '#000',
  },
  claimBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(135deg, #10B981, #34D399)',
    color: '#fff',
  },
  rewardBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#FBBF24',
    background: 'rgba(251, 191, 36, 0.12)',
    padding: '4px 10px',
    borderRadius: '8px',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-light)',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '12px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: 1.5,
  },
}

export default function Challenges() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('active')

  const { data: availableChallenges = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['challenges-available'],
    queryFn: () => challengeService.getAvailable(),
  })

  const { data: userChallenges = [], isLoading: loadingUser } = useQuery({
    queryKey: ['user-challenges'],
    queryFn: () => challengeService.getUserChallenges(),
  })

  const joinMutation = useMutation({
    mutationFn: (challengeId) => challengeService.join(challengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['user-challenges', 'active'] })
    },
  })

  const claimMutation = useMutation({
    mutationFn: (userChallengeId) => challengeService.claimReward(userChallengeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['streaks'] })
    },
  })

  const activeChallenges = useMemo(() =>
    userChallenges.filter(uc => uc.status === 'active'), [userChallenges])
  const completedChallenges = useMemo(() =>
    userChallenges.filter(uc => uc.status === 'completed'), [userChallenges])
  const joinedIds = useMemo(() =>
    new Set(userChallenges.filter(uc => uc.status === 'active').map(uc => uc.challengeId)), [userChallenges])
  const totalPoints = useMemo(() =>
    completedChallenges.reduce((sum, uc) => sum + (uc.challenge?.rewardPoints || 0), 0), [completedChallenges])

  const tabs = [
    { id: 'active', label: t('challenges.active', { defaultValue: 'Active' }), count: activeChallenges.length },
    { id: 'available', label: t('challenges.available', { defaultValue: 'Browse' }), count: availableChallenges.length },
    { id: 'completed', label: t('challenges.completedTab', { defaultValue: 'Completed' }), count: completedChallenges.length },
  ]

  const isLoading = loadingAvailable || loadingUser

  return (
    <div style={styles.page}>
      <motion.div
        style={styles.pageHeader}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={styles.pageIcon}>
          <FiTarget size={24} color="#FBBF24" />
        </div>
        <div>
          <div style={styles.pageTitle}>
            {t('challenges.title', { defaultValue: 'Challenges' })}
          </div>
          <div style={styles.pageSubtitle}>
            {t('challenges.subtitle', { defaultValue: 'Complete challenges to earn rewards and level up' })}
          </div>
        </div>
      </motion.div>

      <div style={styles.statsRow}>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div style={{ ...styles.statValue, color: '#FBBF24' }}>{activeChallenges.length}</div>
          <div style={styles.statLabel}>{t('challenges.activeCount', { defaultValue: 'Active' })}</div>
        </motion.div>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div style={{ ...styles.statValue, color: '#10B981' }}>{completedChallenges.length}</div>
          <div style={styles.statLabel}>{t('challenges.completedCount', { defaultValue: 'Completed' })}</div>
        </motion.div>
        <motion.div style={styles.statCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div style={{ ...styles.statValue, color: '#C4B5FD' }}>{totalPoints}</div>
          <div style={styles.statLabel}>{t('challenges.pointsEarned', { defaultValue: 'Points Earned' })}</div>
        </motion.div>
      </div>

      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : styles.tabInactive),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'active' && (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading ? (
              <LoadingCards />
            ) : activeChallenges.length === 0 ? (
              <EmptyState emoji="🎯" text={t('challenges.noActive', { defaultValue: 'No active challenges. Browse and join one!' })} />
            ) : (
              activeChallenges.map((uc, i) => (
                <ActiveChallengeCard
                  key={uc.id}
                  userChallenge={uc}
                  index={i}
                  onClaim={() => claimMutation.mutate(uc.id)}
                  claimLoading={claimMutation.isPending}
                  t={t}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'available' && (
          <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading ? (
              <LoadingCards />
            ) : availableChallenges.length === 0 ? (
              <EmptyState emoji="🏆" text={t('challenges.noneAvailable', { defaultValue: 'No challenges available right now. Check back soon!' })} />
            ) : (
              availableChallenges.map((ch, i) => (
                <AvailableChallengeCard
                  key={ch.id}
                  challenge={ch}
                  index={i}
                  isJoined={joinedIds.has(ch.id)}
                  onJoin={() => joinMutation.mutate(ch.id)}
                  joinLoading={joinMutation.isPending}
                  t={t}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'completed' && (
          <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {completedChallenges.length === 0 ? (
              <EmptyState emoji="🌟" text={t('challenges.noneCompleted', { defaultValue: 'Complete your first challenge to see it here!' })} />
            ) : (
              completedChallenges.map((uc, i) => (
                <CompletedChallengeCard key={uc.id} userChallenge={uc} index={i} t={t} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActiveChallengeCard({ userChallenge, index, onClaim, claimLoading, t }) {
  const uc = userChallenge
  const ch = uc.challenge || {}
  const diff = DIFFICULTY_META[ch.difficulty] || DIFFICULTY_META.medium
  const typeMeta = TYPE_META[ch.challengeType] || TYPE_META.weekly
  const progress = uc.progress || 0
  const isCompleted = uc.status === 'completed'

  return (
    <motion.div
      style={styles.card}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.4 }}
    >
      <div style={styles.cardTop}>
        <div style={{ ...styles.cardIcon, background: diff.bg, border: `1px solid ${diff.border}` }}>
          {getChallengeEmoji(ch.icon)}
        </div>
        <div style={styles.cardBody}>
          <div style={styles.cardName}>{ch.name}</div>
          <div style={styles.cardDesc}>{ch.description}</div>
          <div style={styles.badgeRow}>
            <span style={{ ...styles.badge, background: diff.bg, color: diff.color }}>{diff.label}</span>
            <span style={{ ...styles.badge, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {typeMeta.emoji} {typeMeta.label}
            </span>
            <span style={styles.rewardBadge}>
              <FiStar size={10} /> {ch.rewardPoints} pts
            </span>
          </div>
          <div style={styles.progressSection}>
            <div style={styles.progressRow}>
              <span style={styles.progressLabel}>{t('challenges.progress', { defaultValue: 'Progress' })}</span>
              <span style={styles.progressPct}>{Math.round(progress)}%</span>
            </div>
            <div style={styles.progressBar}>
              <motion.div
                style={{
                  ...styles.progressFill,
                  background: isCompleted
                    ? 'linear-gradient(90deg, #10B981, #34D399)'
                    : `linear-gradient(90deg, ${diff.color}, ${diff.color}88)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>
          {isCompleted && !uc.rewardClaimed && (
            <div style={styles.actions}>
              <button style={styles.claimBtn} onClick={onClaim} disabled={claimLoading}>
                <FiGift size={14} /> {t('challenges.claimReward', { defaultValue: 'Claim Reward' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function AvailableChallengeCard({ challenge, index, isJoined, onJoin, joinLoading, t }) {
  const ch = challenge
  const diff = DIFFICULTY_META[ch.difficulty] || DIFFICULTY_META.medium
  const typeMeta = TYPE_META[ch.challengeType] || TYPE_META.weekly

  return (
    <motion.div
      style={styles.card}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.4 }}
    >
      <div style={styles.cardTop}>
        <div style={{ ...styles.cardIcon, background: diff.bg, border: `1px solid ${diff.border}` }}>
          {getChallengeEmoji(ch.icon)}
        </div>
        <div style={styles.cardBody}>
          <div style={styles.cardName}>{ch.name}</div>
          <div style={styles.cardDesc}>{ch.description}</div>
          <div style={styles.badgeRow}>
            <span style={{ ...styles.badge, background: diff.bg, color: diff.color }}>{diff.label}</span>
            <span style={{ ...styles.badge, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {typeMeta.emoji} {typeMeta.label}
            </span>
            <span style={styles.rewardBadge}>
              <FiStar size={10} /> {ch.rewardPoints} pts
            </span>
          </div>
          <div style={styles.actions}>
            {isJoined ? (
              <span style={{ fontSize: '13px', color: '#10B981', fontWeight: '600' }}>
                <FiCheck size={14} style={{ verticalAlign: 'middle' }} /> {t('challenges.joined', { defaultValue: 'Joined' })}
              </span>
            ) : (
              <button style={styles.joinBtn} onClick={onJoin} disabled={joinLoading}>
                <FiTarget size={14} /> {t('challenges.join', { defaultValue: 'Join Challenge' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CompletedChallengeCard({ userChallenge, index, t }) {
  const uc = userChallenge
  const ch = uc.challenge || {}

  return (
    <motion.div
      style={{ ...styles.card, borderColor: 'rgba(16, 185, 129, 0.15)' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.4 }}
    >
      <div style={styles.cardTop}>
        <div style={{ ...styles.cardIcon, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          {getChallengeEmoji(ch.icon)}
        </div>
        <div style={styles.cardBody}>
          <div style={styles.cardName}>
            <FiCheck size={14} color="#10B981" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            {ch.name}
          </div>
          <div style={styles.cardDesc}>{ch.description}</div>
          <div style={styles.badgeRow}>
            <span style={{ ...styles.badge, background: 'rgba(16, 185, 129, 0.1)', color: '#34D399' }}>
              {t('challenges.completed', { defaultValue: 'Completed' })}
            </span>
            {uc.rewardClaimed && (
              <span style={{ ...styles.badge, background: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24' }}>
                <FiGift size={10} /> {t('challenges.rewardClaimed', { defaultValue: 'Reward Claimed' })}
              </span>
            )}
            <span style={styles.rewardBadge}>
              <FiStar size={10} /> {ch.rewardPoints} pts
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingCards() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...styles.card, opacity: 0.5 }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-tertiary)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '60%', height: 14, borderRadius: 7, background: 'var(--bg-tertiary)', marginBottom: 10 }} />
              <div style={{ width: '90%', height: 10, borderRadius: 5, background: 'var(--bg-tertiary)', marginBottom: 10 }} />
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

function EmptyState({ emoji, text }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>{emoji}</div>
      <div style={styles.emptyText}>{text}</div>
    </div>
  )
}
