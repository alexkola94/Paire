import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../constants/categories'
import {
  FiShoppingBag, FiTruck, FiHome, FiZap,
  FiFilm, FiHeart, FiBook, FiDollarSign,
  FiBriefcase, FiTrendingUp, FiGift, FiMoreHorizontal,
  FiCreditCard, FiShield, FiWifi, FiPhone, FiActivity,
  FiPackage, FiUser, FiSmartphone, FiAlertCircle, FiMapPin, FiNavigation
} from 'react-icons/fi'
import './CategorySelector.css'

/**
 * Visual Category Selector Component
 * Features:
 * - Visual cards with icons and colors
 * - Faster selection than dropdown
 * - Better mobile experience
 * - Maintains accessibility
 */
function CategorySelector({
  value = '',
  onChange,
  name = 'category',
  categories = [],
  type = 'expense',
  required = false,
  disabled = false,
  label
}) {
  const { t } = useTranslation()

  // Category icons mapping
  const categoryIcons = {
    food: FiShoppingBag,
    transport: FiTruck,
    transportation: FiTruck,
    utilities: FiZap,
    entertainment: FiFilm,
    healthcare: FiHeart,
    shopping: FiShoppingBag,
    education: FiBook,
    salary: FiDollarSign,
    freelance: FiBriefcase,
    investment: FiTrendingUp,
    gift: FiGift,
    other: FiMoreHorizontal,
    // Bill-specific categories
    housing: FiHome,
    subscription: FiFilm, // TV/Streaming icon
    insurance: FiShield,
    rent: FiHome,
    loan: FiCreditCard,
    internet: FiWifi,
    phone: FiPhone,
    gym: FiActivity,
    // Shopping list categories
    groceries: FiShoppingBag,
    household: FiHome,
    personal: FiUser,
    electronics: FiSmartphone,
    clothing: FiPackage,
    // Savings goals categories
    emergency: FiAlertCircle,
    vacation: FiMapPin,
    house: FiHome,
    car: FiNavigation, // Using navigation icon for car/vehicle
    wedding: FiHeart,
    retirement: FiTrendingUp
    // education and investment already exist above
  }

  // Category colors mapping
  const categoryColors = {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    transportation: '#4ECDC4',
    utilities: '#FFE66D',
    entertainment: '#A8E6CF',
    healthcare: '#FF8B94',
    shopping: '#95E1D3',
    education: '#F38181',
    salary: '#AAE3E2',
    freelance: '#DDA0DD',
    investment: '#98D8C8',
    gift: '#F7DC6F',
    other: '#BDC3C7',
    housing: '#95A5A6',
    subscription: '#E74C3C',
    insurance: '#3498DB',
    rent: '#9B59B6',
    loan: '#E67E22',
    internet: '#1ABC9C',
    phone: '#16A085',
    gym: '#F39C12',
    // Shopping list categories
    groceries: '#FF6B6B',
    household: '#95A5A6',
    personal: '#DDA0DD',
    electronics: '#3498DB',
    clothing: '#E74C3C',
    // Savings goals categories
    emergency: '#EF4444',
    vacation: '#3B82F6',
    house: '#8B5CF6',
    car: '#F59E0B',
    wedding: '#EC4899',
    retirement: '#10B981'
    // education and investment already exist above
  }

  /**
   * Handle category selection
   */
  const handleSelect = (categoryValue) => {
    if (disabled) return

    if (onChange) {
      onChange({
        target: {
          name,
          value: categoryValue === value ? '' : categoryValue
        }
      })
    }
  }

  /**
   * Get icon for category
   */
  const getIcon = (category) => {
    const IconComponent = categoryIcons[category] || FiMoreHorizontal
    return <IconComponent size={20} />
  }

  /**
   * Get color for category
   */
  const getColor = (category) => {
    return categoryColors[category] || '#BDC3C7'
  }

  /**
   * Convert hex to rgba with opacity
   */
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }



  // State to handle show more/less
  const [isExpanded, setIsExpanded] = useState(false)
  const INITIAL_VISIBLE_COUNT = 12

  // Default categories if none provided
  const finalCategories = categories && categories.length > 0
    ? categories
    : (type === 'income' ? CATEGORIES.INCOME : CATEGORIES.EXPENSE)

  const visibleCategories = isExpanded ? finalCategories : finalCategories.slice(0, INITIAL_VISIBLE_COUNT)
  const hasMore = finalCategories.length > INITIAL_VISIBLE_COUNT

  return (
    <div className="category-selector-wrapper">
      {label && (
        <label className="category-selector-label">
          {label}
        </label>
      )}

      <div
        className="category-grid"
        role="radiogroup"
        aria-label={label || t('transaction.category')}
        aria-required={required}
      >
        {visibleCategories.map(category => {
          const isSelected = value === category
          const categoryColor = getColor(category)

          // Helper function to get category translation
          const getCategoryTranslation = (cat) => {
            const mainCategoryKey = `categories.${cat}`
            const billCategoryKey = `recurringBills.categories.${cat}`
            const shoppingListCategoryKey = `shoppingLists.categories.${cat}`
            const savingsGoalCategoryKey = `savingsGoals.categories.${cat}`

            const mainTranslation = t(mainCategoryKey, null)
            const billTranslation = t(billCategoryKey, null)
            const shoppingListTranslation = t(shoppingListCategoryKey, null)
            const savingsGoalTranslation = t(savingsGoalCategoryKey, null)

            // If translation key exists (not the same as the key), use it
            // Check in order: main categories, recurringBills, shoppingLists, savingsGoals
            if (mainTranslation !== mainCategoryKey) {
              return mainTranslation
            }
            if (billTranslation !== billCategoryKey) {
              return billTranslation
            }
            if (shoppingListTranslation !== shoppingListCategoryKey) {
              return shoppingListTranslation
            }
            if (savingsGoalTranslation !== savingsGoalCategoryKey) {
              return savingsGoalTranslation
            }
            // Fallback to category name with first letter capitalized
            return cat.charAt(0).toUpperCase() + cat.slice(1)
          }

          const categoryLabel = getCategoryTranslation(category)

          return (
            <button
              key={category}
              type="button"
              onClick={() => handleSelect(category)}
              className={`category-card ${isSelected ? 'selected' : ''}`}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={categoryLabel}
              style={{
                '--category-color': categoryColor,
                '--category-color-selected-bg': hexToRgba(categoryColor, 0.1),
                '--category-color-selected-shadow': hexToRgba(categoryColor, 0.2),
                '--category-color-icon-bg': hexToRgba(categoryColor, 0.1),
                borderColor: isSelected ? categoryColor : 'transparent'
              }}
            >
              <div className="category-icon" style={{ color: categoryColor }}>
                {getIcon(category)}
              </div>
              <span className="category-name">
                {categoryLabel}
              </span>
              {isSelected && (
                <div className="category-check">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="currentColor" />
                    <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}

        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="category-card show-more-btn"
            style={{
              '--category-color': '#666',
              '--category-color-icon-bg': '#f0f0f0',
              borderStyle: 'dashed',
              borderWidth: '1px',
              borderColor: '#ccc'
            }}
          >
            <div className="category-icon" style={{ color: '#666', background: '#f5f5f5' }}>
              {isExpanded ? <FiActivity style={{ transform: 'rotate(45deg)' }} size={20} /> : <FiMoreHorizontal size={20} />}
            </div>
            <span className="category-name">
              {isExpanded ? t('common.showLess', 'Show Less') : t('common.showMore', 'Show More')}
            </span>
          </button>
        )}
      </div>

      {/* Hidden input for form validation */}
      <input
        type="text"
        name={name}
        value={value}
        onChange={() => { }} // Controlled by button clicks
        required={required}
        disabled={disabled}
        style={{ opacity: 0, height: 0, width: 0, position: 'absolute', pointerEvents: 'none' }}
        tabIndex={-1}
      />
    </div>
  )
}

export default CategorySelector

