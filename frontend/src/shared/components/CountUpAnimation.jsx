import { useState, useEffect } from 'react'

/**
 * Animates a number from start to end value
 * @param {number} value - The target value
 * @param {number} duration - Animation duration in ms
 * @param {function} formatter - Function to format the value (e.g. currency)
 */
const CountUpAnimation = ({ value, duration = 1000, formatter = (val) => val }) => {
    const [count, setCount] = useState(0)

    useEffect(() => {
        let startTime
        let animationFrame
        const startValue = 0
        const endValue = value

        const step = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)

            // Easing function (easeOutExpo)
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

            const current = startValue + (endValue - startValue) * easeProgress
            setCount(current)

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step)
            }
        }

        animationFrame = requestAnimationFrame(step)

        return () => cancelAnimationFrame(animationFrame)
    }, [value, duration])

    return <>{formatter(count)}</>
}

export default CountUpAnimation
