import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  FiSearch,
  FiX,
  FiCoffee,
  FiCamera,
  FiShoppingBag,
  FiDollarSign,
  FiHeart
} from 'react-icons/fi'
import { FaBus } from 'react-icons/fa'
import { DISCOVERY_POI_CATEGORIES } from '../../utils/travelConstants'
import '../../styles/DiscoverySearch.css'

// Icon mapping for categories
const categoryIcons = {
  restaurant: FiCoffee,
  attraction: FiCamera,
  shopping: FiShoppingBag,
  transit: FaBus,
  atm: FiDollarSign,
  pharmacy: FiHeart
}

/**
 * DiscoverySearch Component
 * Floating glassmorphism search bar with category filters
 */
const DiscoverySearch = memo(({
  onSearch,
  onCategoryToggle,
  activeCategories = [],
  loading = false
}) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  /**
   * Handle search input change with debounce
   */
  const handleInputChange = useCallback((e) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(value)
      }
    }, 300)
  }, [onSearch])

  /**
   * Clear search
   */
  const handleClear = useCallback(() => {
    setQuery('')
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }, [onSearch])

  /**
   * Handle category chip click
   */
  const handleCategoryClick = useCallback((categoryId) => {
    if (onCategoryToggle) {
      onCategoryToggle(categoryId)
    }
  }, [onCategoryToggle])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Animation variants
  const containerVariants = {
    initial: { y: -100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: 0.1
      }
    },
    exit: {
      y: -100,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }

  const chipVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 20,
        delay: 0.15 + i * 0.05
      }
    })
  }

  return (
    <motion.div
      className="discovery-search"
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Search input */}
      <div className={`discovery-search-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <FiSearch className="search-icon" size={18} />
        <input
          ref={inputRef}
          type="text"
          className="discovery-search-input"
          placeholder={t('travel.discovery.searchPlaceholder', 'Search places...')}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              className="search-clear-btn"
              onClick={handleClear}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FiX size={16} />
            </motion.button>
          )}
        </AnimatePresence>
        {loading && (
          <div className="search-loading">
            <motion.div
              className="search-loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Category filters */}
      <div className="discovery-category-chips">
        {DISCOVERY_POI_CATEGORIES.map((category, index) => {
          const Icon = categoryIcons[category.id] || FiCamera
          const isActive = activeCategories.includes(category.id)

          return (
            <motion.button
              key={category.id}
              className={`discovery-category-chip ${isActive ? 'active' : ''}`}
              variants={chipVariants}
              custom={index}
              initial="initial"
              animate="animate"
              onClick={() => handleCategoryClick(category.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                '--chip-color': category.color,
                '--chip-gradient': category.gradient
              }}
            >
              <Icon size={14} />
              <span>{t(category.label, category.fallbackLabel)}</span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
})

DiscoverySearch.displayName = 'DiscoverySearch'

export default DiscoverySearch
