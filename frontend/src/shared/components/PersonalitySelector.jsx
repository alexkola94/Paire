import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHeart, FiTarget, FiStar, FiZap, FiMusic, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { reminderService } from '../../services/api'

const PERSONALITIES = [
  {
    id: 'supportive',
    icon: FiHeart,
    gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  },
  {
    id: 'tough_love',
    icon: FiTarget,
    gradient: 'linear-gradient(135deg, #EF4444, #F87171)',
  },
  {
    id: 'cheerleader',
    icon: FiStar,
    gradient: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
  },
  {
    id: 'roast',
    icon: FiZap,
    gradient: 'linear-gradient(135deg, #F97316, #FB923C)',
  },
  {
    id: 'hype',
    icon: FiMusic,
    gradient: 'linear-gradient(135deg, #10B981, #34D399)',
  },
]

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: '24px',
    border: 'var(--glass-border)',
    padding: '32px 28px',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    border: 'none',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: 'var(--bg-tertiary)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    border: '1px solid rgba(139, 92, 246, 0.5)',
    background: 'rgba(139, 92, 246, 0.12)',
  },
  cardHover: {
    background: 'var(--bg-secondary)',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  cardDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },
  selectedDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#8B5CF6',
    flexShrink: 0,
    boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
  },
  savingLabel: {
    fontSize: '12px',
    color: 'rgba(139, 92, 246, 0.8)',
    textAlign: 'center',
    marginTop: '16px',
  },
}

export default function PersonalitySelector({ currentPersonality, onSelect, isOpen, onClose }) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)

  const handleSelect = async (personalityId) => {
    if (personalityId === currentPersonality || saving) return

    setSaving(true)
    try {
      await reminderService.updateSettings({ chatbotPersonality: personalityId })
      onSelect?.(personalityId)
    } catch (err) {
      console.error('Failed to update personality:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            style={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={styles.closeBtn}
              onClick={onClose}
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <FiX size={16} />
            </button>

            <div style={styles.title}>
              {t('personality.title', { defaultValue: 'Choose Your Vibe' })}
            </div>
            <div style={styles.subtitle}>
              {t('personality.subtitle', {
                defaultValue: 'Pick how your AI assistant talks to you about money.',
              })}
            </div>

            <div style={styles.grid}>
              {PERSONALITIES.map((p) => {
                const isSelected = currentPersonality === p.id
                const isHovered = hoveredId === p.id
                const Icon = p.icon
                return (
                  <motion.div
                    key={p.id}
                    style={{
                      ...styles.card,
                      ...(isSelected ? styles.cardSelected : {}),
                      ...(isHovered && !isSelected ? styles.cardHover : {}),
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(p.id)}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    layout
                  >
                    <div style={{ ...styles.iconCircle, background: p.gradient }}>
                      <Icon size={20} color="#fff" />
                    </div>
                    <div style={styles.cardContent}>
                      <div style={styles.cardName}>
                        {t(`personality.${p.id}.name`, {
                          defaultValue: p.id.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                        })}
                      </div>
                      <div style={styles.cardDesc}>
                        {t(`personality.${p.id}.description`, {
                          defaultValue: getDefaultDescription(p.id),
                        })}
                      </div>
                    </div>
                    {isSelected && (
                      <motion.div
                        style={styles.selectedDot}
                        layoutId="personality-selected"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>

            {saving && (
              <div style={styles.savingLabel}>
                {t('personality.saving', { defaultValue: 'Updating...' })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function getDefaultDescription(id) {
  const descriptions = {
    supportive: 'Gentle encouragement and empathetic guidance on your finances.',
    tough_love: 'Direct, no-nonsense feedback to keep you accountable.',
    cheerleader: 'Celebrates every win and keeps you motivated!',
    roast: 'Playful roasts to make budgeting entertaining.',
    hype: 'High-energy hype to fuel your financial goals!',
  }
  return descriptions[id] || ''
}
