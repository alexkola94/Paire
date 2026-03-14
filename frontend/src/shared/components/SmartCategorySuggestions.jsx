import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrendingUp, FiX } from 'react-icons/fi'
import './SmartCategorySuggestions.css'

/**
 * Smart Category Suggestions Component
 * Shows suggested categories based on recent transaction patterns
 */
function SmartCategorySuggestions({
  suggestedCategories = [],
  currentCategory = '',
  onSelectCategory,
  onDismiss
}) {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show suggestions if we have them and no category is selected
    setIsVisible(
      suggestedCategories.length > 0 &&
      !currentCategory &&
      suggestedCategories.length > 0
    )
  }, [suggestedCategories, currentCategory])

  if (!isVisible || suggestedCategories.length === 0) {
    return null
  }

  const handleSelect = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category)
    }
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
  }

  return (
    <div className="smart-category-suggestions">
      <div className="smart-category-header">
        <div className="smart-category-title">
          <FiTrendingUp size={16} />
          <span>{t('transaction.smartSuggestions.suggestedCategory')}</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="smart-category-dismiss"
          aria-label={t('common.close')}
        >
          <FiX size={16} />
        </button>
      </div>
      <div className="smart-category-list">
        {suggestedCategories.slice(0, 3).map((category, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSelect(category)}
            className="smart-category-item"
          >
            {t(`categories.${(category || '').toLowerCase()}`)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SmartCategorySuggestions

