import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCalendar, FiArrowRight } from 'react-icons/fi'

function YearReviewWidget() {
  const { t } = useTranslation()
  const previousYear = new Date().getFullYear() - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.5rem' }}>📊</span>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {t('yearReview.title', 'Year in Review')}
        </h3>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: 1.4 }}>
        {t('yearReview.ready', `Your ${previousYear} Wrapped is ready!`, { year: previousYear })}
      </p>

      <Link
        to="/year-in-review"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          color: '#fff',
          borderRadius: '12px',
          fontSize: '0.85rem',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <FiCalendar size={14} />
        {t('yearReview.title', 'Year in Review')}
        <FiArrowRight size={14} />
      </Link>
    </motion.div>
  )
}

export default YearReviewWidget
