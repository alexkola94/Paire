
import { useMemo } from 'react'
import './SavingGoalProgressBar.css'

export default function SavingGoalProgressBar({
    label,
    currentAmount,
    targetAmount,
    currencyFormatter,
    icon
}) {
    const percentage = useMemo(() => {
        if (!targetAmount || targetAmount === 0) return 0
        return Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100))
    }, [currentAmount, targetAmount])

    // Dynamic color based on progress - Savings are good, so green/blue
    const progressColor = useMemo(() => {
        if (percentage >= 100) return 'var(--success, #2ecc71)' // Green if complete
        return 'var(--info, #3498db)' // Blue for in progress
    }, [percentage])

    return (
        <div className="saving-goal-progress-container">
            <div className="saving-info">
                <div className="saving-label-group">
                    {icon && <span className="saving-icon">{icon}</span>}
                    <span className="saving-label">{label}</span>
                </div>
                <div className="saving-values">
                    <span className="current-value">
                        {currencyFormatter(currentAmount)}
                    </span>
                    <span className="target-value"> / {currencyFormatter(targetAmount)}</span>
                </div>
            </div>

            <div className="progress-track">
                <div
                    className="progress-fill"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: progressColor,
                    }}
                />
            </div>
        </div>
    )
}
