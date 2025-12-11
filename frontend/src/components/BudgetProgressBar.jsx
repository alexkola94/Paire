
import { useMemo } from 'react'
import './BudgetProgressBar.css'

export default function BudgetProgressBar({
    label,
    spent,
    total,
    currencyFormatter,
    color = 'var(--primary)',
    icon
}) {
    const percentage = useMemo(() => {
        if (!total || total === 0) return 0
        return Math.min(100, Math.max(0, (spent / total) * 100))
    }, [spent, total])

    const isOverBudget = spent > total

    // Dynamic color based on status
    const progressColor = useMemo(() => {
        if (isOverBudget) return 'var(--error, #e74c3c)' // Red if over budget
        if (percentage > 85) return 'var(--warning, #f1c40f)' // Yellow if warning
        return color
    }, [isOverBudget, percentage, color])

    return (
        <div className="budget-progress-container">
            <div className="budget-info">
                <div className="budget-label-group">
                    {icon && <span className="budget-icon">{icon}</span>}
                    <span className="budget-label">{label}</span>
                </div>
                <div className="budget-values">
                    <span className={`spent-value ${isOverBudget ? 'over-budget' : ''}`}>
                        {currencyFormatter(spent)}
                    </span>
                    <span className="total-value"> / {currencyFormatter(total)}</span>
                </div>
            </div>

            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{
                        width: `${percentage}% `,
                        backgroundColor: progressColor,

                    }}
                />
            </div>
        </div>
    )
}

