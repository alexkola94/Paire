import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FiTarget, FiTrendingUp, FiDollarSign, FiActivity,
  FiAward, FiRefreshCw, FiUsers, FiHeart
} from 'react-icons/fi'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { financialHealthService } from '../services/api'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import './PaireScore.css'

const SCORE_COMPONENTS = [
  { key: 'budgetAdherenceScore', name: 'Budget Adherence', weight: 25, icon: FiTarget, color: '#8B5CF6' },
  { key: 'savingsRateScore', name: 'Savings Rate', weight: 25, icon: FiDollarSign, color: '#10B981' },
  { key: 'debtHealthScore', name: 'Debt Health', weight: 20, icon: FiTrendingUp, color: '#3B82F6' },
  { key: 'expenseConsistencyScore', name: 'Expense Consistency', weight: 15, icon: FiActivity, color: '#F59E0B' },
  { key: 'goalProgressScore', name: 'Goal Progress', weight: 15, icon: FiAward, color: '#EC4899' },
]

function AnimatedScoreRing({ score, size = 200, strokeWidth = 14 }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    let frame
    const duration = 1200
    const start = performance.now()
    const from = 0
    const to = Math.min(score, 100)

    const animate = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(from + (to - from) * eased))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const getScoreColor = (val) => {
    if (val >= 80) return '#10B981'
    if (val >= 60) return '#8B5CF6'
    if (val >= 40) return '#F59E0B'
    return '#EF4444'
  }

  const strokeColor = getScoreColor(animatedScore)

  return (
    <div className="score-ring-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter="url(#glow)"
          style={{ transition: 'stroke 0.5s ease' }}
        />
      </svg>
      <div className="score-ring-value">
        <span className="score-number" style={{ color: strokeColor }}>{animatedScore}</span>
        <span className="score-label-text">/ 100</span>
      </div>
    </div>
  )
}

function ComponentCard({ component, score, index }) {
  const Icon = component.icon
  const barWidth = Math.min(Math.max(score, 0), 100)

  return (
    <motion.div
      className="component-card glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="component-header">
        <div className="component-icon" style={{ background: `${component.color}18`, color: component.color }}>
          <Icon size={18} />
        </div>
        <div className="component-info">
          <span className="component-name">{component.name}</span>
          <span className="component-weight">{component.weight}% weight</span>
        </div>
        <span className="component-score" style={{ color: component.color }}>{score}</span>
      </div>
      <div className="component-bar-track">
        <motion.div
          className="component-bar-fill"
          style={{ backgroundColor: component.color }}
          initial={{ width: 0 }}
          animate={{ width: `${barWidth}%` }}
          transition={{ delay: 0.2 * index + 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </motion.div>
  )
}

function HistoryChart({ data }) {
  const { t } = useTranslation()

  if (!data || data.length === 0) return null

  const chartData = [...data]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(item => ({
      period: item.period,
      label: new Date(item.period + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      score: item.overallScore,
    }))

  return (
    <div className="history-section glass-card">
      <h3 className="section-title">
        <FiTrendingUp className="section-icon" />
        Score History
      </h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--bg-tertiary)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--glass-bg)',
                border: 'var(--glass-border)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                boxShadow: 'var(--shadow-md)',
              }}
              labelFormatter={(label) => label}
              formatter={(value) => [value, 'Score']}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ r: 5, fill: '#8B5CF6', strokeWidth: 2, stroke: 'var(--bg-secondary)' }}
              activeDot={{ r: 7, fill: '#8B5CF6', strokeWidth: 2, stroke: 'var(--bg-secondary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function PartnershipSection({ data }) {
  if (!data) return null

  return (
    <motion.div
      className="partnership-section glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <h3 className="section-title">
        <FiUsers className="section-icon" />
        Partnership Score
      </h3>
      <div className="partnership-scores">
        <div className="partner-score-item">
          <span className="partner-label">You</span>
          <AnimatedScoreRing score={data.userScore?.overallScore || 0} size={120} strokeWidth={10} />
        </div>
        <div className="partner-combined">
          <FiHeart className="heart-icon" />
          <div className="combined-score-display">
            <span className="combined-value">{data.combinedScore}</span>
            <span className="combined-label">Combined</span>
          </div>
        </div>
        <div className="partner-score-item">
          <span className="partner-label">Partner</span>
          <AnimatedScoreRing score={data.partnerScore?.overallScore || 0} size={120} strokeWidth={10} />
        </div>
      </div>
    </motion.div>
  )
}

function TipsSection({ tips }) {
  if (!tips) return null

  const tipsList = tips.split('. ').filter(t => t.trim())

  return (
    <motion.div
      className="tips-section glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
    >
      <h3 className="section-title">
        <FiTarget className="section-icon" />
        Improvement Tips
      </h3>
      <ul className="tips-list">
        {tipsList.map((tip, i) => (
          <li key={i} className="tip-item">
            <span className="tip-bullet">💡</span>
            <span>{tip.trim().replace(/\.$/, '')}.</span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

function PaireScore() {
  const { t } = useTranslation()

  const { data: scoreData, isLoading: scoreLoading, refetch: refetchScore } = useQuery({
    queryKey: ['financial-health-score'],
    queryFn: () => financialHealthService.getScore(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['financial-health-history'],
    queryFn: () => financialHealthService.getHistory(6),
    staleTime: 10 * 60 * 1000,
  })

  const { data: partnershipData } = useQuery({
    queryKey: ['financial-health-partnership'],
    queryFn: () => financialHealthService.getPartnershipScore(),
    retry: false,
    staleTime: 10 * 60 * 1000,
  })

  const [recalculating, setRecalculating] = useState(false)

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await financialHealthService.recalculate()
      await refetchScore()
    } catch (err) {
      console.error('Failed to recalculate:', err)
    } finally {
      setRecalculating(false)
    }
  }

  if (scoreLoading) {
    return (
      <div className="paire-score-page">
        <div className="paire-score-loading">
          <div className="loading-spinner" />
          <p>Calculating your score...</p>
        </div>
      </div>
    )
  }

  const score = scoreData?.overallScore ?? 0
  const getScoreLabel = (val) => {
    if (val >= 90) return 'Excellent'
    if (val >= 75) return 'Great'
    if (val >= 60) return 'Good'
    if (val >= 40) return 'Fair'
    return 'Needs Work'
  }

  return (
    <div className="paire-score-page">
      <div className="paire-score-header">
        <div className="header-text">
          <h1 className="page-title">Your Paire Score</h1>
          <p className="page-subtitle">
            A holistic view of your financial health
          </p>
        </div>
        <button
          className="recalculate-btn"
          onClick={handleRecalculate}
          disabled={recalculating}
        >
          <FiRefreshCw className={recalculating ? 'spinning' : ''} />
          {recalculating ? 'Recalculating...' : 'Recalculate'}
        </button>
      </div>

      <div className="score-hero glass-card">
        <AnimatedScoreRing score={score} size={220} strokeWidth={16} />
        <div className="score-hero-details">
          <span className="score-label-badge">{getScoreLabel(score)}</span>
          {scoreData?.period && (
            <span className="score-period">
              Period: {scoreData.period}
            </span>
          )}
        </div>
      </div>

      <div className="components-grid">
        {SCORE_COMPONENTS.map((comp, i) => (
          <ComponentCard
            key={comp.key}
            component={comp}
            score={scoreData?.[comp.key] ?? 0}
            index={i}
          />
        ))}
      </div>

      <HistoryChart data={historyData} />
      <PartnershipSection data={partnershipData} />
      <TipsSection tips={scoreData?.tips} />
    </div>
  )
}

export default PaireScore
