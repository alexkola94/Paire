import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiAward, FiStar, FiTarget, FiTrendingDown, FiTrendingUp,
  FiUsers, FiCalendar, FiCheckCircle, FiLock, FiUnlock
} from 'react-icons/fi'
import { achievementService } from '../services/api'
import './Achievements.css'

/**
 * Achievements Page Component
 * Display user achievements with progress tracking and celebrations
 */
function Achievements() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false)

  // Icon mapping for achievement icons
  const iconMap = {
    FiAward: FiAward,
    FiStar: FiStar,
    FiTarget: FiTarget,
    FiTrendingDown: FiTrendingDown,
    FiTrendingUp: FiTrendingUp,
    FiUsers: FiUsers,
    FiCalendar: FiCalendar,
    FiCheckCircle: FiCheckCircle
  }

  /**
   * Load achievements and stats on mount
   */
  useEffect(() => {
    loadData()
    checkForNewAchievements()
  }, [])

  /**
   * Fetch achievements and statistics
   */
  const loadData = async () => {
    try {
      setLoading(true)
      const [achievementsData, statsData] = await Promise.all([
        achievementService.getAll(),
        achievementService.getStats()
      ])
      setAchievements(achievementsData || [])
      setStats(statsData || null)
    } catch (error) {
      console.error('Error loading achievements:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Check for newly unlocked achievements
   */
  const checkForNewAchievements = async () => {
    try {
      const result = await achievementService.check()
      if (result?.newAchievements > 0) {
        // Reload data to show new achievements
        await loadData()
        // Show notification for new achievements
        showAchievementNotification(result.achievements)
      }
    } catch (error) {
      console.error('Error checking achievements:', error)
    }
  }

  /**
   * Show notification for newly unlocked achievements
   */
  const showAchievementNotification = (newAchievements) => {
    // This will be enhanced with a toast/notification component
    if (newAchievements && newAchievements.length > 0) {
      const achievement = newAchievements[0]
      // You can integrate with a toast notification library here
      console.log('New achievement unlocked:', achievement)
    }
  }

  /**
   * Get icon component for achievement
   */
  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || FiAward
    return <IconComponent />
  }

  /**
   * Get color class for rarity
   */
  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'legendary': return 'rarity-legendary'
      case 'epic': return 'rarity-epic'
      case 'rare': return 'rarity-rare'
      default: return 'rarity-common'
    }
  }

  /**
   * Filter achievements by category and unlock status
   */
  const filteredAchievements = achievements.filter(achievement => {
    if (selectedCategory !== 'all' && achievement.achievement.category !== selectedCategory) {
      return false
    }
    if (showUnlockedOnly && !achievement.isUnlocked) {
      return false
    }
    return true
  })

  /**
   * Get unique categories from achievements
   */
  const categories = ['all', ...new Set(achievements.map(a => a.achievement.category))]

  if (loading) {
    return (
      <div className="achievements-page">
        <div className="achievements-loading">
          <div className="loading-spinner"></div>
          <p>{t('achievements.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <div className="achievements-title-section">
          <h1 className="achievements-title">
            <FiAward className="title-icon" />
            {t('achievements.title')}
          </h1>
          <p className="achievements-subtitle">{t('achievements.subtitle')}</p>
        </div>

        {/* Statistics Summary */}
        {stats && (
          <div className="achievements-stats">
            <div className="stat-card">
              <div className="stat-value">{stats.unlocked}</div>
              <div className="stat-label">{t('achievements.stats.unlocked')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">{t('achievements.stats.total')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalPoints}</div>
              <div className="stat-label">{t('achievements.stats.points')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.round(stats.percentage)}%</div>
              <div className="stat-label">{t('achievements.stats.completion')}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="achievements-filters">
        <div className="filter-group">
          <label>{t('achievements.filters.category')}</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="filter-select"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {t(`achievements.categories.${category}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={showUnlockedOnly}
              onChange={(e) => setShowUnlockedOnly(e.target.checked)}
            />
            {t('achievements.filters.unlockedOnly')}
          </label>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="achievements-grid">
        {filteredAchievements.map((item) => {
          const achievement = item.achievement
          const isUnlocked = item.isUnlocked
          const progress = item.progress || 0

          return (
            <div
              key={achievement.id}
              className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'} ${getRarityColor(achievement.rarity)}`}
            >
              <div className="achievement-icon-wrapper">
                {isUnlocked ? (
                  <div className="achievement-icon unlocked-icon">
                    {getIcon(achievement.icon || 'FiAward')}
                  </div>
                ) : (
                  <div className="achievement-icon locked-icon">
                    <FiLock />
                  </div>
                )}
                {isUnlocked && (
                  <div className="achievement-badge">
                    <FiCheckCircle />
                  </div>
                )}
              </div>

              <div className="achievement-content">
                <h3 className="achievement-name">{achievement.name}</h3>
                <p className="achievement-description">{achievement.description}</p>

                <div className="achievement-meta">
                  <span className={`achievement-rarity ${getRarityColor(achievement.rarity)}`}>
                    {t(`achievements.rarity.${achievement.rarity}`)}
                  </span>
                  <span className="achievement-points">
                    {achievement.points} {t('achievements.points')}
                  </span>
                </div>

                {/* Progress Bar */}
                {!isUnlocked && progress > 0 && (
                  <div className="achievement-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{Math.round(progress)}%</span>
                  </div>
                )}

                {isUnlocked && item.userAchievement && (
                  <div className="achievement-unlocked-date">
                    {t('achievements.unlockedOn')} {new Date(item.userAchievement.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="achievements-empty">
          <FiAward className="empty-icon" />
          <p>{t('achievements.noAchievements')}</p>
        </div>
      )}
    </div>
  )
}

export default Achievements

