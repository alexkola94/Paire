import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FiLock, FiChevronUp, FiHome, FiStar } from 'react-icons/fi'
import { paireHomeService } from '../services/api'
import './PaireHome.css'

const ROOM_META = {
  kitchen:     { emoji: '🍳', label: 'Kitchen',     categories: 'Food, Groceries, Dining' },
  living_room: { emoji: '🛋️', label: 'Living Room', categories: 'Entertainment, Streaming' },
  bedroom:     { emoji: '🛏️', label: 'Bedroom',     categories: 'Housing, Rent, Mortgage' },
  office:      { emoji: '💼', label: 'Office',      categories: 'Education, Work' },
  garden:      { emoji: '🌿', label: 'Garden',      categories: 'Health, Fitness, Wellness' },
  garage:      { emoji: '🚗', label: 'Garage',      categories: 'Transport, Fuel, Parking' },
  bathroom:    { emoji: '🚿', label: 'Bathroom',    categories: 'Utilities, Bills, Water' },
}

const LEVEL_LABELS = ['—', 'Bare', 'Basic', 'Furnished', 'Luxury']

function getLevelThreshold(level) {
  const thresholds = [100, 250, 500, 1000]
  if (level <= 0) return thresholds[0]
  if (level >= 4) return null
  return thresholds[level]
}

function StarDisplay({ level, maxLevel = 4 }) {
  return (
    <div className="star-display">
      {Array.from({ length: maxLevel }).map((_, i) => (
        <FiStar
          key={i}
          size={14}
          className={i < level ? 'star-filled' : 'star-empty'}
        />
      ))}
    </div>
  )
}

function RoomCard({ room, index }) {
  const meta = ROOM_META[room.name] || { emoji: '🏠', label: room.name, categories: '' }
  const isUnlocked = room.isUnlocked
  const level = room.level || 0
  const points = room.points || 0
  const pointsToNext = room.pointsToNextLevel
  const isMaxLevel = level >= 4 || pointsToNext === null

  const nextThreshold = getLevelThreshold(level)
  let progressPct = 0
  if (!isMaxLevel && nextThreshold) {
    progressPct = Math.min((points / nextThreshold) * 100, 100)
  } else if (isMaxLevel) {
    progressPct = 100
  }

  const queryClient = useQueryClient()
  const upgradeMutation = useMutation({
    mutationFn: () => paireHomeService.upgradeRoom(room.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paire-home-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['paire-home'] })
    },
  })

  const canUpgrade = isUnlocked && !isMaxLevel && pointsToNext !== null && pointsToNext <= 0

  return (
    <motion.div
      className={`room-card glass-card ${isUnlocked ? 'unlocked' : 'locked'} ${isMaxLevel && isUnlocked ? 'max-level' : ''}`}
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.08 * index,
        duration: 0.45,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <div className="room-header">
        <span className="room-emoji">{meta.emoji}</span>
        <div className="room-title-area">
          <span className="room-name">{meta.label}</span>
          <StarDisplay level={level} />
        </div>
        {!isUnlocked && <FiLock className="lock-icon" />}
      </div>

      {isUnlocked ? (
        <>
          <div className="room-level-tag">
            {LEVEL_LABELS[level] || `Level ${level}`}
          </div>
          <div className="room-progress">
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ delay: 0.08 * index + 0.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
            <span className="progress-label">
              {isMaxLevel
                ? '✨ Max Level'
                : `${points} / ${nextThreshold} pts`}
            </span>
          </div>
          {canUpgrade && (
            <button
              className="upgrade-btn"
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
            >
              <FiChevronUp />
              {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade'}
            </button>
          )}
        </>
      ) : (
        <div className="locked-overlay">
          <FiLock size={24} className="locked-icon-large" />
          <span className="unlock-text">
            {pointsToNext != null ? `${pointsToNext} pts to unlock` : 'Locked'}
          </span>
        </div>
      )}

      <span className="room-categories">{meta.categories}</span>
    </motion.div>
  )
}

function PaireHome() {
  const { t } = useTranslation()

  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ['paire-home'],
    queryFn: () => paireHomeService.getHome(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['paire-home-rooms'],
    queryFn: () => paireHomeService.getRooms(),
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = homeLoading || roomsLoading

  if (isLoading) {
    return (
      <div className="paire-home-page">
        <div className="paire-home-loading">
          <div className="loading-spinner" />
          <p>Loading your home...</p>
        </div>
      </div>
    )
  }

  const rooms = Array.isArray(roomsData) ? roomsData : []
  const homeName = homeData?.homeName || 'Love Nest'
  const homeLevel = homeData?.level || 1
  const totalPoints = homeData?.totalPoints || 0
  const unlockedCount = rooms.filter(r => r.isUnlocked).length

  return (
    <div className="paire-home-page">
      <div className="home-header">
        <div className="home-header-left">
          <h1 className="page-title">
            <FiHome className="home-title-icon" />
            {homeName}
          </h1>
          <p className="page-subtitle">
            Spend wisely to build and upgrade your virtual home
          </p>
        </div>
      </div>

      <div className="home-stats">
        <div className="home-stat glass-card">
          <span className="stat-value">{homeLevel}</span>
          <span className="stat-label">Home Level</span>
        </div>
        <div className="home-stat glass-card">
          <span className="stat-value">{totalPoints.toLocaleString()}</span>
          <span className="stat-label">Total Points</span>
        </div>
        <div className="home-stat glass-card">
          <span className="stat-value">{unlockedCount} / {rooms.length}</span>
          <span className="stat-label">Rooms Unlocked</span>
        </div>
      </div>

      <div className="rooms-grid">
        {rooms.map((room, i) => (
          <RoomCard key={room.name} room={room} index={i} />
        ))}
      </div>
    </div>
  )
}

export default PaireHome
