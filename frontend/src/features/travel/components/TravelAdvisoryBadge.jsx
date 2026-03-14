import React from 'react'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiShield, FiInfo } from 'react-icons/fi'
import '../styles/TravelAdvisory.css'

const getLevelConfig = (level, t) => {
  const normalized = (level || 'unknown').toLowerCase()

  switch (normalized) {
    case 'low':
      return {
        label: t('travel.advisory.riskLevel.low', 'Low risk'),
        className: 'advisory-level-low',
        Icon: FiShield
      }
    case 'medium':
      return {
        label: t('travel.advisory.riskLevel.medium', 'Medium risk'),
        className: 'advisory-level-medium',
        Icon: FiAlertTriangle
      }
    case 'high':
      return {
        label: t('travel.advisory.riskLevel.high', 'High risk'),
        className: 'advisory-level-high',
        Icon: FiAlertTriangle
      }
    case 'critical':
      return {
        label: t('travel.advisory.riskLevel.critical', 'Critical risk'),
        className: 'advisory-level-critical',
        Icon: FiAlertTriangle
      }
    default:
      return {
        label: t('travel.advisory.riskLevel.unknown', 'Risk level unknown'),
        className: 'advisory-level-unknown',
        Icon: FiInfo
      }
  }
}

/**
 * TravelAdvisoryBadge
 * --------------------
 * Tiny inline badge for using inside lists / chips without taking much space.
 */
const TravelAdvisoryBadge = ({ advisory }) => {
  const { t } = useTranslation()

  if (!advisory) return null

  const { level } = advisory
  const { label, className, Icon } = getLevelConfig(level, t)

  return (
    <span
      className={`travel-advisory-badge ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon className="travel-advisory-badge-icon" size={12} />
      <span className="travel-advisory-badge-text">{label}</span>
    </span>
  )
}

export default TravelAdvisoryBadge

