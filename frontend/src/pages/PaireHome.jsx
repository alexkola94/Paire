import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FiLock, FiChevronUp, FiHome, FiStar, FiX, FiUsers, FiUser } from 'react-icons/fi'
import { paireHomeService } from '../services/api'
import './PaireHome.css'

const ROOM_META = {
  kitchen:     { emoji: '🍳', label: 'Kitchen' },
  living_room: { emoji: '🛋️', label: 'Living Room' },
  bedroom:     { emoji: '🛏️', label: 'Bedroom' },
  office:      { emoji: '💼', label: 'Office' },
  garden:      { emoji: '🌿', label: 'Garden' },
  garage:      { emoji: '🚗', label: 'Garage' },
  bathroom:    { emoji: '🚿', label: 'Bathroom' },
}

const FURNITURE_EMOJIS = {
  kitchen:     { stove: '🔥', fridge: '❄️', table: '🪑', plant: '🌱', chandelier: '💡' },
  living_room: { sofa: '🛋️', tv: '📺', bookshelf: '📚', rug: '🟫', lamp: '💡' },
  bedroom:     { bed: '🛏️', wardrobe: '👔', nightstand: '🪑', mirror: '🪞', curtains: '🪟' },
  office:      { desk: '🖥️', chair: '💺', monitor: '🖥️', bookcase: '📚', whiteboard: '📋' },
  garden:      { bench: '🪑', fountain: '⛲', tree: '🌳', flowers: '🌸', grill: '🔥' },
  garage:      { car: '🚗', toolbox: '🔧', bike: '🚲', shelving: '📦', workbench: '🔨' },
  bathroom:    { bathtub: '🛁', vanity: '🪞', towelrack: '🧺', plants: '🪴', tiles: '🟦' },
}

const SEASONAL_THEMES = [
  { key: 'default',  label: 'Default',  color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' },
  { key: 'spring',   label: 'Spring',   color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #F472B6 100%)' },
  { key: 'summer',   label: 'Summer',   color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #3B82F6 100%)' },
  { key: 'autumn',   label: 'Autumn',   color: '#D97706', gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)' },
  { key: 'winter',   label: 'Winter',   color: '#60A5FA', gradient: 'linear-gradient(135deg, #60A5FA 0%, #E0E7FF 100%)' },
  { key: 'holiday',  label: 'Holiday',  color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)' },
]

const LEVEL_LABELS = ['—', 'Bare', 'Basic', 'Furnished', 'Luxury']

function getLevelThreshold(level) {
  const thresholds = [100, 250, 500, 1000]
  if (level <= 0) return thresholds[0]
  if (level >= 4) return null
  return thresholds[level]
}

function StarDisplay({ level, maxLevel = 4 }) {
  return (
    <div className="ph-star-display">
      {Array.from({ length: maxLevel }).map((_, i) => (
        <FiStar key={i} size={12} className={i < level ? 'ph-star-filled' : 'ph-star-empty'} />
      ))}
    </div>
  )
}

function StatsBar({ homeLevel, totalPoints, unlockedCount, totalRooms }) {
  return (
    <div className="ph-stats-bar">
      <div className="ph-stat-pill">
        <span className="ph-stat-icon">🏠</span>
        <div className="ph-stat-info">
          <span className="ph-stat-value">{homeLevel}</span>
          <span className="ph-stat-label">Level</span>
        </div>
      </div>
      <div className="ph-stat-pill">
        <span className="ph-stat-icon">✨</span>
        <div className="ph-stat-info">
          <span className="ph-stat-value">{totalPoints.toLocaleString()}</span>
          <span className="ph-stat-label">Points</span>
        </div>
      </div>
      <div className="ph-stat-pill">
        <span className="ph-stat-icon">🔓</span>
        <div className="ph-stat-info">
          <span className="ph-stat-value">{unlockedCount}/{totalRooms}</span>
          <span className="ph-stat-label">Rooms</span>
        </div>
      </div>
    </div>
  )
}

function ThemeSelector({ activeTheme, onSelect, isPending }) {
  return (
    <div className="ph-theme-selector">
      <span className="ph-theme-title">Season</span>
      <div className="ph-theme-row">
        {SEASONAL_THEMES.map(t => (
          <button
            key={t.key}
            className={`ph-theme-dot ${activeTheme === t.key ? 'active' : ''}`}
            style={{ background: t.gradient }}
            onClick={() => onSelect(t.key)}
            disabled={isPending}
            title={t.label}
          >
            {activeTheme === t.key && <span className="ph-theme-check">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function RoomTile({ room, index, onClick, equippedFurniture }) {
  const meta = ROOM_META[room.name] || { emoji: '🏠', label: room.name }
  const isUnlocked = room.isUnlocked
  const level = room.level || 0
  const equipped = equippedFurniture[room.name] || []

  return (
    <motion.button
      className={`ph-room-tile ${isUnlocked ? 'unlocked' : 'locked'} ${level >= 4 ? 'max-level' : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.06 * index, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => isUnlocked && onClick(room)}
      disabled={!isUnlocked}
    >
      {!isUnlocked && (
        <div className="ph-room-lock-overlay">
          <FiLock size={20} />
        </div>
      )}
      <span className="ph-room-emoji">{meta.emoji}</span>
      <span className="ph-room-name">{meta.label}</span>
      <StarDisplay level={level} />
      {isUnlocked && equipped.length > 0 && (
        <div className="ph-room-furniture-icons">
          {equipped.slice(0, 4).map((f, i) => {
            const emoji = FURNITURE_EMOJIS[room.name]?.[f] || '📦'
            return <span key={i} className="ph-furniture-mini">{emoji}</span>
          })}
          {equipped.length > 4 && <span className="ph-furniture-more">+{equipped.length - 4}</span>}
        </div>
      )}
      {isUnlocked && level < 4 && (
        <span className="ph-room-level-badge">{LEVEL_LABELS[level] || `Lv${level}`}</span>
      )}
      {level >= 4 && isUnlocked && (
        <span className="ph-room-level-badge max">✨ Max</span>
      )}
    </motion.button>
  )
}

function FurniturePanel({ room, furniture, onClose, onEquip, equipPending }) {
  const meta = ROOM_META[room.name] || { emoji: '🏠', label: room.name }
  const roomFurniture = furniture.filter(f => f.room === room.name)
  const level = room.level || 0
  const points = room.points || 0
  const pointsToNext = room.pointsToNextLevel
  const isMaxLevel = level >= 4 || pointsToNext === null
  const nextThreshold = getLevelThreshold(level)

  const queryClient = useQueryClient()
  const upgradeMutation = useMutation({
    mutationFn: () => paireHomeService.upgradeRoom(room.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paire-home-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['paire-home'] })
    },
  })

  const canUpgrade = !isMaxLevel && pointsToNext !== null && pointsToNext <= 0

  let progressPct = 0
  if (!isMaxLevel && nextThreshold) {
    progressPct = Math.min((points / nextThreshold) * 100, 100)
  } else if (isMaxLevel) {
    progressPct = 100
  }

  return (
    <motion.div
      className="ph-panel-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="ph-furniture-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="ph-panel-header">
          <div className="ph-panel-title-row">
            <span className="ph-panel-emoji">{meta.emoji}</span>
            <div>
              <h3 className="ph-panel-room-name">{meta.label}</h3>
              <StarDisplay level={level} />
            </div>
          </div>
          <button className="ph-panel-close" onClick={onClose}><FiX size={20} /></button>
        </div>

        <div className="ph-panel-progress">
          <div className="ph-panel-progress-track">
            <motion.div
              className="ph-panel-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
          <span className="ph-panel-progress-label">
            {isMaxLevel ? '✨ Max Level' : `${points} / ${nextThreshold} pts`}
          </span>
          {canUpgrade && (
            <button
              className="ph-upgrade-btn"
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
            >
              <FiChevronUp size={16} />
              {upgradeMutation.isPending ? 'Upgrading...' : 'Upgrade Room'}
            </button>
          )}
        </div>

        <div className="ph-panel-furniture-list">
          <h4 className="ph-panel-section-title">Furniture</h4>
          {roomFurniture.length === 0 && (
            <p className="ph-panel-empty">No furniture available yet.</p>
          )}
          {roomFurniture.map(item => {
            const emoji = FURNITURE_EMOJIS[room.name]?.[item.code] || '📦'
            const isLocked = !item.isUnlocked
            return (
              <div key={item.code} className={`ph-furniture-item ${isLocked ? 'locked' : ''} ${item.isEquipped ? 'equipped' : ''}`}>
                <span className="ph-fi-emoji">{emoji}</span>
                <div className="ph-fi-info">
                  <span className="ph-fi-name">{item.name || item.code}</span>
                  {isLocked && <span className="ph-fi-cost">{item.pointsToUnlock || '?'} pts to unlock</span>}
                </div>
                {!isLocked && (
                  <button
                    className={`ph-fi-toggle ${item.isEquipped ? 'on' : 'off'}`}
                    onClick={() => onEquip(room.name, item.code, !item.isEquipped)}
                    disabled={equipPending}
                  >
                    {item.isEquipped ? 'Remove' : 'Place'}
                  </button>
                )}
                {isLocked && <FiLock size={14} className="ph-fi-lock" />}
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

function CoupleToggle({ isCoupleView, onToggle, hasPartner }) {
  if (!hasPartner) return null
  return (
    <div className="ph-couple-toggle">
      <button
        className={`ph-ct-btn ${!isCoupleView ? 'active' : ''}`}
        onClick={() => onToggle(false)}
      >
        <FiUser size={14} /> My Home
      </button>
      <button
        className={`ph-ct-btn ${isCoupleView ? 'active' : ''}`}
        onClick={() => onToggle(true)}
      >
        <FiUsers size={14} /> Our Home
      </button>
    </div>
  )
}

function PaireHome() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [isCoupleView, setIsCoupleView] = useState(false)

  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ['paire-home', isCoupleView ? 'couple' : 'solo'],
    queryFn: () => isCoupleView ? paireHomeService.getCoupleHome() : paireHomeService.getHome(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ['paire-home-rooms'],
    queryFn: () => paireHomeService.getRooms(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: furnitureData } = useQuery({
    queryKey: ['paire-home-furniture'],
    queryFn: () => paireHomeService.getFurniture(),
    staleTime: 5 * 60 * 1000,
  })

  const activeTheme = homeData?.seasonalTheme || 'default'

  const themeMutation = useMutation({
    mutationFn: (theme) => paireHomeService.setTheme(theme),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paire-home'] })
    },
  })

  const equipMutation = useMutation({
    mutationFn: ({ room, code, equip }) => paireHomeService.equipFurniture(room, code, equip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paire-home-furniture'] })
      queryClient.invalidateQueries({ queryKey: ['paire-home-rooms'] })
    },
  })

  const handleEquip = useCallback((room, code, equip) => {
    equipMutation.mutate({ room, code, equip })
  }, [equipMutation])

  const isLoading = homeLoading || roomsLoading
  const rooms = Array.isArray(roomsData) ? roomsData : []
  const furniture = Array.isArray(furnitureData) ? furnitureData : []
  const homeName = homeData?.homeName || 'Love Nest'
  const homeLevel = homeData?.level || 1
  const totalPoints = homeData?.totalPoints || 0
  const unlockedCount = rooms.filter(r => r.isUnlocked).length
  const hasPartner = !!homeData?.partnerId || !!homeData?.partnerName

  const equippedByRoom = {}
  furniture.forEach(f => {
    if (f.isEquipped) {
      if (!equippedByRoom[f.room]) equippedByRoom[f.room] = []
      equippedByRoom[f.room].push(f.code)
    }
  })

  const themeClass = `ph-theme-${activeTheme}`

  if (isLoading) {
    return (
      <div className="paire-home-page">
        <div className="ph-loading">
          <div className="ph-loading-spinner" />
          <p>Loading your home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`paire-home-page ${themeClass}`}>
      <div className="ph-header">
        <div className="ph-header-left">
          <h1 className="ph-title">
            <FiHome className="ph-title-icon" />
            {homeName}
          </h1>
          <p className="ph-subtitle">Spend wisely to build and upgrade your virtual home</p>
        </div>
        <CoupleToggle
          isCoupleView={isCoupleView}
          onToggle={setIsCoupleView}
          hasPartner={hasPartner}
        />
      </div>

      <StatsBar
        homeLevel={homeLevel}
        totalPoints={totalPoints}
        unlockedCount={unlockedCount}
        totalRooms={rooms.length}
      />

      <ThemeSelector
        activeTheme={activeTheme}
        onSelect={(theme) => themeMutation.mutate(theme)}
        isPending={themeMutation.isPending}
      />

      <div className="ph-house-wrapper">
        <div className="ph-roof">
          <div className="ph-roof-shape" />
          <div className="ph-chimney" />
        </div>

        <div className="ph-house-grid">
          {rooms.map((room, i) => (
            <RoomTile
              key={room.name}
              room={room}
              index={i}
              onClick={(r) => setSelectedRoom(r)}
              equippedFurniture={equippedByRoom}
            />
          ))}
        </div>

        <div className="ph-foundation" />
      </div>

      <AnimatePresence>
        {selectedRoom && (
          <FurniturePanel
            room={selectedRoom}
            furniture={furniture}
            onClose={() => setSelectedRoom(null)}
            onEquip={handleEquip}
            equipPending={equipMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default PaireHome
