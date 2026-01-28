import { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isWithinInterval,
    isBefore,
    isAfter,
    startOfDay,
    addDays
} from 'date-fns'
import { enUS, el, es, fr } from 'date-fns/locale'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import '../styles/DateRangePicker.css'

/** Map i18n language to date-fns locale for date formatting */
const getDateFnsLocale = (language) => {
  const lang = (language || '').split('-')[0]
  switch (lang) {
    case 'es': return es
    case 'fr': return fr
    case 'el': return el
    case 'en':
    default: return enUS
  }
}

const DateRangePicker = ({
    startDate,
    endDate,
    onChange,
    minDate,
    disabled = false,
    placeholder
}) => {
    const { t, i18n } = useTranslation()
    const dateLocale = getDateFnsLocale(i18n.language)
    const displayPlaceholder = placeholder ?? t('travel.datePicker.selectDates', 'Select dates')
    const { theme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [hoverDate, setHoverDate] = useState(null)

    // Ref for click outside handling
    const containerRef = useRef(null)
    const dropdownRef = useRef(null)

    // Debug logging

    // Initialize current month view based on selection
    useEffect(() => {
        if (isOpen) {
            if (startDate) {
                setCurrentMonth(new Date(startDate))
            } else if (minDate) {
                setCurrentMonth(new Date(minDate))
            }
        }
    }, [isOpen, startDate, minDate])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside BOTH the trigger container AND the portal dropdown
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleDateClick = (day) => {
        if (disabled) return

        const clickedDate = startOfDay(day)
        const min = minDate ? startOfDay(new Date(minDate)) : null

        if (min && isBefore(clickedDate, min)) return

        // Scenario 1: No dates selected or both selected -> Start fresh
        if ((!startDate && !endDate) || (startDate && endDate)) {
            onChange({ startDate: format(clickedDate, 'yyyy-MM-dd', { locale: dateLocale }), endDate: null })
            return
        }

        // Scenario 2: Start date selected, selecting end date
        if (startDate && !endDate) {
            const start = startOfDay(new Date(startDate))

            if (isBefore(clickedDate, start)) {
                // Clicked before start -> New start date
                onChange({ startDate: format(clickedDate, 'yyyy-MM-dd', { locale: dateLocale }), endDate: null })
            } else {
                // Clicked after start -> Set end date and close
                onChange({ startDate, endDate: format(clickedDate, 'yyyy-MM-dd', { locale: dateLocale }) })
                setIsOpen(false)
            }
        }
    }

    const handleMouseEnter = (day) => {
        if (startDate && !endDate) {
            setHoverDate(day)
        }
    }

    const handleMouseLeave = () => {
        setHoverDate(null)
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    // Render Helpers
    const renderCalendarMonth = (monthDate) => {
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthStart)
        const startDateDay = startOfMonth(monthStart) // Start grid from Sunday/Monday? Let's assume standardized grid
        // Get the start of the week for the calendar grid
        // Simple approach: date-fns `eachDayOfInterval`

        // We need to pad the start and end to fill the week rows
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

        // Fill empty slots at start
        const startPadding = Array.from({ length: monthStart.getDay() }).map((_, i) => null)

        const allDays = [...startPadding, ...daysInMonth]

        // Theme-aware color helpers
        const getDayStyle = (isSelectedStart, isSelectedEnd, isInRange, isDisabled, isToday) => {
            const baseStyle = {
                color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                background: 'transparent'
            }

            if (isDisabled) {
                return {
                    ...baseStyle,
                    color: theme === 'dark' ? '#475569' : '#cbd5e1',
                    textDecoration: 'line-through'
                }
            }

            if (isSelectedStart || isSelectedEnd) {
                return {
                    ...baseStyle,
                    background: '#8B5CF6',
                    color: 'white'
                }
            }

            if (isInRange) {
                return {
                    ...baseStyle,
                    background: theme === 'dark' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.1)',
                    color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                    borderRadius: 0
                }
            }

            if (isToday) {
                return {
                    ...baseStyle,
                    color: theme === 'dark' ? '#a78bfa' : '#8B5CF6',
                    fontWeight: 700
                }
            }

            return baseStyle
        }

        return (
            <div className="picker-month">
                <div className="picker-month-header" style={{
                    color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                }}>
                    {format(monthDate, 'MMMM yyyy', { locale: dateLocale })}
                </div>
                <div className="picker-grid-header">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="picker-weekday" style={{
                            color: theme === 'dark' ? '#64748b' : '#94a3b8'
                        }}>{d}</div>
                    ))}
                </div>
                <div className="picker-grid">
                    {allDays.map((day, idx) => {
                        if (!day) return <div key={`pad-${idx}`} className="picker-day empty" />

                        const dateStr = format(day, 'yyyy-MM-dd', { locale: dateLocale })
                        const isSelectedStart = startDate === dateStr
                        const isSelectedEnd = endDate === dateStr
                        const min = minDate ? startOfDay(new Date(minDate)) : null
                        const isDisabled = min && isBefore(day, min)
                        const isToday = isSameDay(day, new Date())

                        // Range logic
                        let isInRange = false
                        if (startDate && endDate) {
                            isInRange = isWithinInterval(day, {
                                start: new Date(startDate),
                                end: new Date(endDate)
                            })
                        } else if (startDate && hoverDate && !isDisabled) {
                            // Preview range
                            const start = new Date(startDate)
                            if (isAfter(day, start) && (isBefore(day, hoverDate) || isSameDay(day, hoverDate))) {
                                isInRange = true
                            }
                        }

                        const dayStyle = getDayStyle(isSelectedStart, isSelectedEnd, isInRange, isDisabled, isToday)

                        return (
                            <button
                                key={dateStr}
                                className={`picker-day
                  ${isSelectedStart ? 'selected-start' : ''}
                  ${isSelectedEnd ? 'selected-end' : ''}
                  ${isInRange ? 'in-range' : ''}
                  ${isDisabled ? 'disabled' : ''}
                  ${isToday ? 'today' : ''}
                `}
                                style={dayStyle}
                                onClick={() => !isDisabled && handleDateClick(day)}
                                onMouseEnter={() => !isDisabled && handleMouseEnter(day)}
                                onMouseOver={(e) => {
                                    if (!isDisabled && !isSelectedStart && !isSelectedEnd && !isInRange) {
                                        e.currentTarget.style.background = theme === 'dark' ? '#334155' : '#f1f5f9'
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (!isDisabled && !isSelectedStart && !isSelectedEnd && !isInRange) {
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                                type="button"
                                disabled={isDisabled}
                            >
                                {format(day, 'd', { locale: dateLocale })}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Derived display text
    const getDisplayText = () => {
        if (startDate && endDate) {
            return `${format(new Date(startDate), 'MMM d', { locale: dateLocale })} - ${format(new Date(endDate), 'MMM d', { locale: dateLocale })}`
        }
        if (startDate) {
            return `${format(new Date(startDate), 'MMM d', { locale: dateLocale })} - ${t('travel.datePicker.selectReturn', 'Select return date')}`
        }
        return displayPlaceholder
    }

    // Track window width for mobile responsiveness
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Portal logic
    const [position, setPosition] = useState({ top: 0, left: 0, width: 320 })

    // Update position on open
    useEffect(() => {
        if (isOpen && containerRef.current && !isMobile) {
            const rect = containerRef.current.getBoundingClientRect()

            // Fixed positioning: relative to viewport
            const DROPDOWN_WIDTH = 320

            let left = rect.right - DROPDOWN_WIDTH
            if (left < 10) left = rect.left

            const top = rect.bottom + 8

            setPosition({ top, left })
        }
    }, [isOpen, isMobile])

    return (
        <div className="date-range-picker" ref={containerRef} data-theme={theme}>
            {/* Input Trigger */}
            <div
                className={`picker-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={(e) => {
                    if (!disabled) setIsOpen(!isOpen)
                }}
            >
                <FiCalendar className="picker-icon" />
                <span className={`picker-text ${!startDate ? 'placeholder' : ''}`}>
                    {getDisplayText()}
                </span>
                {(startDate || endDate) && !disabled && (
                    <button
                        className="picker-clear"
                        onClick={(e) => {
                            e.stopPropagation()
                            onChange({ startDate: null, endDate: null })
                        }}
                    >
                        <FiX />
                    </button>
                )}
            </div>

            {/* Dropdown Calendar - Portalled */}
            {isOpen && (
                // Portal the dropdown to document.body
                ReactDOM.createPortal(
                    <div data-theme={theme} style={{ isolation: 'isolate', zIndex: 2147483647, position: 'relative' }}>
                        {/* Mobile Backdrop */}
                        {isMobile && (
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
                                    zIndex: 2147483640,
                                    backdropFilter: 'blur(2px)'
                                }}
                                onClick={() => setIsOpen(false)}
                            />
                        )}
                        <div
                            ref={dropdownRef}
                            className="picker-dropdown"
                            style={isMobile ? {
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '90%',
                                maxWidth: '320px',
                                zIndex: 2147483647,
                                margin: 0,
                                boxShadow: theme === 'dark'
                                    ? '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                                    : '0 20px 50px rgba(0,0,0,0.3)',
                                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                                borderRadius: '20px',
                                padding: '1.25rem',
                                pointerEvents: 'auto',
                                color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                            } : {
                                position: 'fixed',
                                top: position.top,
                                left: position.left,
                                width: '320px',
                                zIndex: 2147483647,
                                margin: 0,
                                boxShadow: theme === 'dark'
                                    ? '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                                    : '0 10px 40px rgba(0,0,0,0.3)',
                                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                                borderRadius: '16px',
                                padding: '1rem',
                                pointerEvents: 'auto',
                                color: theme === 'dark' ? '#f1f5f9' : '#1e293b'
                            }}
                        >
                            <div className="picker-controls">
                                <button
                                    onClick={prevMonth}
                                    className="picker-nav-btn"
                                    style={{
                                        background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                                        border: theme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0',
                                        color: theme === 'dark' ? '#94a3b8' : '#64748b'
                                    }}
                                >
                                    <FiChevronLeft />
                                </button>
                                <button
                                    onClick={nextMonth}
                                    className="picker-nav-btn"
                                    style={{
                                        background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                                        border: theme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0',
                                        color: theme === 'dark' ? '#94a3b8' : '#64748b'
                                    }}
                                >
                                    <FiChevronRight />
                                </button>
                            </div>

                            <div className="picker-calendars">
                                {renderCalendarMonth(currentMonth)}
                            </div>

                            <div className="picker-footer" style={{
                                borderTopColor: theme === 'dark' ? '#334155' : '#e2e8f0'
                            }}>
                                {!startDate && (
                                    <div className="picker-hint" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                                        {t('travel.datePicker.selectDepart', 'Select departure date')}
                                    </div>
                                )}
                                {startDate && !endDate && (
                                    <div className="picker-hint" style={{ color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
                                        {t('travel.datePicker.selectReturn', 'Select return date')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </div>
    )
}

export default DateRangePicker
