import { Link } from 'react-router-dom'
import './EmptyState.css'

/**
 * Shared empty state component. Use for consistent structure and layout
 * across Dashboard, Budgets, SavingsGoals, RecurringBills, Receipts, Loans,
 * Expenses, Income, AllTransactions, ShoppingLists, Partnership, Achievements, Analytics.
 *
 * @param {React.ReactNode} [icon] - Optional icon (e.g. <FiTarget size={64} />; size is overridden by CSS)
 * @param {string} [title] - Optional heading (rendered as h3)
 * @param {string} [description] - Optional body text
 * @param {{ label: string, onClick?: () => void, to?: string, icon?: React.ReactNode }} [primaryAction]
 * @param {Array<{ label: string, onClick?: () => void, to?: string, icon?: React.ReactNode }>} [secondaryActions]
 * @param {'default'|'compact'|'noResults'} [variant='default']
 * @param {boolean} [asCard=true] - Wrap in card + glass-card classes
 * @param {string} [className] - Extra class names
 * @param {boolean} [iconCircle=false] - Wrap icon in a circle (e.g. Partnership page)
 */
export default function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryActions,
  variant = 'default',
  asCard = true,
  className = '',
  iconCircle = false
}) {
  const variantClass = variant !== 'default' ? `empty-state--${variant}` : ''
  const cardClasses = asCard ? 'card glass-card as-card' : ''
  const classes = ['empty-state', variantClass, cardClasses, className].filter(Boolean).join(' ')
  const iconWrapperClass = iconCircle ? 'empty-state__icon empty-state__icon--circle' : 'empty-state__icon'

  const renderAction = (action, isPrimary) => {
    if (!action?.label) return null
    const btnClass = isPrimary ? 'btn btn-primary' : 'btn btn-secondary'
    const content = (
      <>
        {action.icon}
        {action.label}
      </>
    )
    if (action.to) {
      return (
        <Link key={action.label} to={action.to} className={btnClass}>
          {content}
        </Link>
      )
    }
    return (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        className={btnClass}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={classes}>
      {icon && (
        <div className={iconWrapperClass} aria-hidden>
          {icon}
        </div>
      )}
      {title && <h3 className="empty-state__title">{title}</h3>}
      {description && <p className="empty-state__description">{description}</p>}
      {(primaryAction || (secondaryActions?.length > 0)) && (
        <div className="empty-state__actions">
          {primaryAction && renderAction(primaryAction, true)}
          {secondaryActions?.map((action) => renderAction(action, false))}
        </div>
      )}
    </div>
  )
}
