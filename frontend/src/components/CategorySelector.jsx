import { useTranslation } from 'react-i18next'
import { 
  FiShoppingBag, FiTruck, FiHome, FiZap, 
  FiFilm, FiHeart, FiBook, FiDollarSign,
  FiBriefcase, FiTrendingUp, FiGift, FiMoreHorizontal
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
    other: FiMoreHorizontal
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
    gym: '#F39C12'
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

  // Default categories if none provided
  const defaultExpenseCategories = ['food', 'transport', 'utilities', 'entertainment', 'healthcare', 'shopping', 'education', 'other']
  const defaultIncomeCategories = ['salary', 'freelance', 'investment', 'gift', 'other']
  const finalCategories = categories && categories.length > 0 
    ? categories 
    : (type === 'expense' ? defaultExpenseCategories : defaultIncomeCategories)

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
        {finalCategories.map(category => {
          const isSelected = value === category
          const categoryColor = getColor(category)
          
          return (
            <button
              key={category}
              type="button"
              onClick={() => handleSelect(category)}
              className={`category-card ${isSelected ? 'selected' : ''}`}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={t(`categories.${category}`)}
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
                {t(`categories.${category}`)}
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
      </div>

      {/* Hidden input for form validation */}
      <input
        type="text"
        name={name}
        value={value}
        onChange={() => {}} // Controlled by button clicks
        required={required}
        disabled={disabled}
        style={{ display: 'none' }}
        tabIndex={-1}
      />
    </div>
  )
}

export default CategorySelector

