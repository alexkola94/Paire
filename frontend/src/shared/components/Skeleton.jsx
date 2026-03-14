import './Skeleton.css'

/**
 * Skeleton Loader Component
 * Creates a placeholder for loading content
 * 
 * @param {string} type - 'text', 'circular', 'rectangular', 'card'
 * @param {string} width - specific width (e.g. '100%')
 * @param {string} height - specific height
 * @param {string} className - extra classes
 * @param {object} style - extra inline styles
 */
const Skeleton = ({
    type = 'text',
    width,
    height,
    className = '',
    style = {}
}) => {
    const customStyle = {
        width,
        height,
        ...style
    }

    return (
        <div
            className={`skeleton skeleton-${type} ${className}`}
            style={customStyle}
        />
    )
}

export default Skeleton
