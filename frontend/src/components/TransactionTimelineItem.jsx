import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import {
  FiShoppingCart,
  FiHome,
  FiTruck,
  FiHeart,
  FiMusic,
  FiBook,
  FiDollarSign,
  FiBriefcase,
  FiTrendingUp,
  FiGift,
  FiMoreHorizontal,
  FiCoffee,
  FiSmartphone,
  FiWifi,
  FiShield,
  FiCreditCard,
  FiDroplet,
  FiActivity
} from 'react-icons/fi'

// Category to icon mapping
const categoryIcons = {
  // Expense categories
  food: FiCoffee,
  groceries: FiShoppingCart,
  transport: FiTruck,
  transportation: FiTruck,
  housing: FiHome,
  utilities: FiDroplet,
  entertainment: FiMusic,
  healthcare: FiHeart,
  shopping: FiShoppingCart,
  education: FiBook,
  subscription: FiCreditCard,
  insurance: FiShield,
  rent: FiHome,
  loan: FiCreditCard,
  internet: FiWifi,
  phone: FiSmartphone,
  gym: FiActivity,
  household: FiHome,
  personal: FiHeart,
  electronics: FiSmartphone,
  clothing: FiShoppingCart,
  // Income categories
  salary: FiBriefcase,
  freelance: FiBriefcase,
  investment: FiTrendingUp,
  gift: FiGift,
  // Default
  other: FiMoreHorizontal
}

const TransactionTimelineItem = React.memo(({ transaction, formatCurrency, isMobile, isPrivate = false }) => {
  const { t } = useTranslation()

  const {
    id,
    date,
    description,
    amount,
    type,
    category = 'other'
  } = transaction

  // Get time from date
  const time = useMemo(() => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date
    return format(parsedDate, 'HH:mm')
  }, [date])

  // Get icon component
  const IconComponent = categoryIcons[category?.toLowerCase()] || categoryIcons.other

  // Determine side (expense = left, income = right)
  const isExpense = type === 'expense'
  const side = isExpense ? 'left' : 'right'

  // Format amount with sign
  const formattedAmount = useMemo(() => {
    const sign = isExpense ? '-' : '+'
    return `${sign}${formatCurrency(Math.abs(amount))}`
  }, [amount, isExpense, formatCurrency])

  // Get category label
  const categoryLabel = t(`categories.${category?.toLowerCase()}`, { defaultValue: category || t('categories.other') })

  // Mobile layout: single column with type indicator
  if (isMobile) {
    return (
      <div className={`timeline-item timeline-item-mobile timeline-item-${type}`}>
        <div className="timeline-node-mobile">
          <div className={`timeline-node-circle timeline-node-${type}`}>
            <IconComponent size={16} />
          </div>
          <div className="timeline-connector-mobile" />
        </div>
        <div className={`timeline-card timeline-card-${type}`}>
          <div className="timeline-card-header">
            <span className="timeline-card-description">
              {description || t('transaction.noDescription')}
            </span>
            <span className={`timeline-card-amount timeline-amount-${type} ${isPrivate ? 'masked-number' : ''}`}>
              {formattedAmount}
            </span>
          </div>
          <div className="timeline-card-footer">
            <span className="timeline-card-category">{categoryLabel}</span>
            <span className="timeline-card-time">{time}</span>
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout: split left/right
  return (
    <div className={`timeline-item timeline-item-desktop timeline-item-${side}`}>
      {/* Left side - shows expense or empty */}
      <div className="timeline-side timeline-side-left">
        {isExpense && (
          <div className={`timeline-card timeline-card-expense`}>
            <div className="timeline-card-header">
              <span className="timeline-card-description">
                {description || t('transaction.noDescription')}
              </span>
              <span className={`timeline-card-amount timeline-amount-expense ${isPrivate ? 'masked-number' : ''}`}>
                {formattedAmount}
              </span>
            </div>
            <div className="timeline-card-footer">
              <span className="timeline-card-category">{categoryLabel}</span>
              <span className="timeline-card-time">{time}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center node */}
      <div className="timeline-center">
        <div className={`timeline-node-circle timeline-node-${type}`}>
          <IconComponent size={18} />
        </div>
        <div className={`timeline-connector timeline-connector-${side}`} />
      </div>

      {/* Right side - shows income or empty */}
      <div className="timeline-side timeline-side-right">
        {!isExpense && (
          <div className={`timeline-card timeline-card-income`}>
            <div className="timeline-card-header">
              <span className="timeline-card-description">
                {description || t('transaction.noDescription')}
              </span>
              <span className={`timeline-card-amount timeline-amount-income ${isPrivate ? 'masked-number' : ''}`}>
                {formattedAmount}
              </span>
            </div>
            <div className="timeline-card-footer">
              <span className="timeline-card-category">{categoryLabel}</span>
              <span className="timeline-card-time">{time}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

TransactionTimelineItem.displayName = 'TransactionTimelineItem'

TransactionTimelineItem.propTypes = {
  transaction: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]).isRequired,
    description: PropTypes.string,
    amount: PropTypes.number.isRequired,
    type: PropTypes.oneOf(['income', 'expense']).isRequired,
    category: PropTypes.string
  }).isRequired,
  formatCurrency: PropTypes.func.isRequired,
  isMobile: PropTypes.bool
}

export default TransactionTimelineItem
