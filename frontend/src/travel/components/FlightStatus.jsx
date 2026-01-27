import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiClock,
    FiAlertCircle,
    FiCheckCircle,
    FiXCircle,
    FiRefreshCw,
    FiNavigation
} from 'react-icons/fi'
import { RiFlightTakeoffLine, RiFlightLandLine } from 'react-icons/ri'
import { getFlightStatus, isFlightTrackingEnabled } from '../services/flightService'
import './FlightStatus.css'

/**
 * Flight Status Component
 * Shows real-time flight status for flight events
 */
const FlightStatus = ({ flightNumber, date, compact = false }) => {
    const { t } = useTranslation()
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchStatus = async () => {
            if (!flightNumber || !date) {
                setLoading(false)
                return
            }

            if (!isFlightTrackingEnabled()) {
                setLoading(false)
                setError('api_not_configured')
                return
            }

            try {
                setLoading(true)
                setError(null)
                const data = await getFlightStatus(flightNumber, date)
                setStatus(data)
            } catch (err) {
                console.error('Error fetching flight status:', err)
                setError('fetch_failed')
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()
    }, [flightNumber, date])

    // Get status badge config
    const getStatusConfig = () => {
        if (!status) return { color: 'gray', icon: FiClock, label: t('travel.flight.unknown', 'Unknown') }

        switch (status.status) {
            case 'scheduled':
                return {
                    color: 'blue',
                    icon: FiClock,
                    label: t('travel.flight.scheduled', 'Scheduled')
                }
            case 'departed':
                return {
                    color: 'green',
                    icon: RiFlightTakeoffLine,
                    label: t('travel.flight.departed', 'Departed')
                }
            case 'arrived':
                return {
                    color: 'green',
                    icon: FiCheckCircle,
                    label: t('travel.flight.arrived', 'Arrived')
                }
            case 'cancelled':
                return {
                    color: 'red',
                    icon: FiXCircle,
                    label: t('travel.flight.cancelled', 'Cancelled')
                }
            default:
                return {
                    color: 'gray',
                    icon: FiClock,
                    label: status.rawStatus || t('travel.flight.unknown', 'Unknown')
                }
        }
    }

    // Format time (HH:MM)
    const formatTime = (isoTime) => {
        if (!isoTime) return '--:--'
        try {
            const date = new Date(isoTime)
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        } catch {
            return isoTime.split('T')[1]?.slice(0, 5) || '--:--'
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className={`flight-status-loading ${compact ? 'compact' : ''}`}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                >
                    <FiRefreshCw size={14} />
                </motion.div>
            </div>
        )
    }

    // Error or no API key
    if (error === 'api_not_configured') {
        // No API key - show hint in non-compact mode
        if (compact) return null
        return (
            <div className="flight-status-hint">
                <FiClock size={12} />
                <span>{t('travel.flightStatus.addApiKey', 'Add API key for live tracking')}</span>
            </div>
        )
    }

    // No status data but API is configured
    if (!status) {
        if (compact) {
            return (
                <div className="flight-status-compact status-gray">
                    <FiClock size={12} />
                    <span className="status-label">{t('travel.flightStatus.tracking', 'Tracking')}</span>
                </div>
            )
        }
        return null
    }

    const statusConfig = getStatusConfig()
    const StatusIcon = statusConfig.icon

    // Compact view for event cards
    if (compact) {
        return (
            <div className={`flight-status-compact status-${statusConfig.color}`}>
                <StatusIcon size={12} />
                <span className="status-label">{statusConfig.label}</span>
                {status.isDelayed && status.delayMinutes > 0 && (
                    <span className="delay-badge">
                        +{status.delayMinutes}min
                    </span>
                )}
            </div>
        )
    }

    // Full view
    return (
        <motion.div
            className={`flight-status-card status-${statusConfig.color}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Status Header */}
            <div className="flight-status-header">
                <div className="status-badge">
                    <StatusIcon size={16} />
                    <span>{statusConfig.label}</span>
                </div>
                {status.isDelayed && (
                    <div className="delay-indicator">
                        <FiAlertCircle size={14} />
                        <span>{t('travel.flight.delayed', 'Delayed')} +{status.delayMinutes}min</span>
                    </div>
                )}
            </div>

            {/* Flight Route */}
            <div className="flight-route">
                {/* Departure */}
                <div className="route-point departure">
                    <span className="airport-code">{status.departure.airport}</span>
                    <span className="airport-name">{status.departure.airportName}</span>
                    <div className="time-info">
                        <span className="scheduled-time">
                            {formatTime(status.departure.scheduledTime)}
                        </span>
                        {status.departure.actualTime && status.departure.actualTime !== status.departure.scheduledTime && (
                            <span className="actual-time">
                                → {formatTime(status.departure.actualTime)}
                            </span>
                        )}
                    </div>
                    {status.departure.gate && (
                        <span className="gate-info">
                            {t('travel.flight.gate', 'Gate')}: {status.departure.gate}
                        </span>
                    )}
                    {status.departure.terminal && (
                        <span className="terminal-info">
                            {t('travel.flight.terminal', 'Terminal')}: {status.departure.terminal}
                        </span>
                    )}
                </div>

                {/* Route Arrow */}
                <div className="route-arrow">
                    <FiNavigation size={16} />
                </div>

                {/* Arrival */}
                <div className="route-point arrival">
                    <span className="airport-code">{status.arrival.airport}</span>
                    <span className="airport-name">{status.arrival.airportName}</span>
                    <div className="time-info">
                        <span className="scheduled-time">
                            {formatTime(status.arrival.scheduledTime)}
                        </span>
                        {status.arrival.actualTime && status.arrival.actualTime !== status.arrival.scheduledTime && (
                            <span className="actual-time">
                                → {formatTime(status.arrival.actualTime)}
                            </span>
                        )}
                    </div>
                    {status.arrival.terminal && (
                        <span className="terminal-info">
                            {t('travel.flight.terminal', 'Terminal')}: {status.arrival.terminal}
                        </span>
                    )}
                </div>
            </div>

            {/* Additional Info */}
            {(status.airline.name || status.aircraft.model) && (
                <div className="flight-details">
                    {status.airline.name && (
                        <span className="airline">{status.airline.name}</span>
                    )}
                    {status.aircraft.model && (
                        <span className="aircraft">{status.aircraft.model}</span>
                    )}
                </div>
            )}
        </motion.div>
    )
}

export default FlightStatus
