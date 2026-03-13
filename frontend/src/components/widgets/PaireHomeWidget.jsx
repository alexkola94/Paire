import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiHome, FiLock, FiArrowRight } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { paireHomeService } from '../../services/api'

const TOTAL_ROOMS = 7

const ROOM_ICONS = ['🛋️', '🍳', '🛏️', '📚', '🌿', '🎮', '🏠']

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
    gap: '10px',
    marginBottom: '16px',
  },
  icon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  homeName: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  levelBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#C4B5FD',
    background: 'rgba(139, 92, 246, 0.2)',
    padding: '2px 8px',
    borderRadius: '8px',
    marginTop: '4px',
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  progressCount: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  progressBar: {
    height: '6px',
    borderRadius: '3px',
    background: 'var(--bg-tertiary)',
    overflow: 'hidden',
    marginBottom: '18px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #8B5CF6, #3B82F6)',
    transition: 'width 0.8s ease-out',
  },
  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
    marginBottom: '18px',
  },
  roomCell: {
    aspectRatio: '1',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  roomUnlocked: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
  },
  roomLocked: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--glass-border)',
  },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.3)',
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

export default function PaireHomeWidget() {
  const { t } = useTranslation()
  const { data: home, isLoading } = useQuery({
    queryKey: ['paire-home'],
    queryFn: () => paireHomeService.getHome(),
  })

  const unlockedCount = useMemo(() => {
    if (!home?.rooms) return 0
    return home.rooms.filter((r) => r.isUnlocked).length
  }, [home])

  if (isLoading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>
            <FiHome size={18} color="#8B5CF6" />
          </div>
          <div>
            <div
              style={{
                width: '100px',
                height: '14px',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
              }}
            />
            <div
              style={{
                width: '60px',
                height: '10px',
                borderRadius: '6px',
                background: 'var(--bg-tertiary)',
                marginTop: '8px',
              }}
            />
          </div>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: 0 }} />
        </div>
      </div>
    )
  }

  if (!home) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>
            <FiHome size={18} color="#8B5CF6" />
          </div>
          <div style={styles.homeName}>
            {t('paireHome.title', { defaultValue: 'Paire Home' })}
          </div>
        </div>
        <div style={styles.emptyState}>
          {t('paireHome.notStarted', { defaultValue: 'Start your financial journey to build your home!' })}
        </div>
      </div>
    )
  }

  const rooms = home.rooms || []
  const progressPct = Math.round((unlockedCount / TOTAL_ROOMS) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={styles.card}
    >
      <div style={styles.header}>
        <div style={styles.icon}>
          <FiHome size={18} color="#8B5CF6" />
        </div>
        <div>
          <div style={styles.homeName}>{home.name || t('paireHome.title', { defaultValue: 'Paire Home' })}</div>
          <div style={styles.levelBadge}>
            {t('paireHome.level', { defaultValue: 'Level' })} {home.level ?? 1}
          </div>
        </div>
      </div>

      <div style={styles.progressRow}>
        <span style={styles.progressLabel}>
          {t('paireHome.roomsUnlocked', { defaultValue: 'Rooms Unlocked' })}
        </span>
        <span style={styles.progressCount}>
          {unlockedCount} / {TOTAL_ROOMS}
        </span>
      </div>

      <div style={styles.progressBar}>
        <motion.div
          style={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>

      <div style={styles.roomGrid}>
        {Array.from({ length: TOTAL_ROOMS }).map((_, i) => {
          const room = rooms[i]
          const unlocked = room?.isUnlocked
          return (
            <motion.div
              key={i}
              style={{
                ...styles.roomCell,
                ...(unlocked ? styles.roomUnlocked : styles.roomLocked),
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
            >
              <span style={{ opacity: unlocked ? 1 : 0.3 }}>{ROOM_ICONS[i]}</span>
              {!unlocked && (
                <div style={styles.lockOverlay}>
                  <FiLock size={12} color="var(--text-light)" />
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      <Link to="/paire-home" style={styles.viewLink}>
        {t('paireHome.visitHome', { defaultValue: 'Visit Home' })}
        <FiArrowRight size={14} />
      </Link>
    </motion.div>
  )
}
