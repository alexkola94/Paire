import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { FiCalendar, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import './DatePicker.css'

const DatePicker = ({
    selected,
    onChange,
    label,
    placeholder = 'Select date',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
    const containerRef = useRef(null)
    const { t } = useTranslation()

    // initialize currentMonth to selected date if exists
    useEffect(() => {
        if (selected) {
            setCurrentMonth(new Date(selected))
        }
    }, [selected])

    // Update position when opening
    useLayoutEffect(() => {
        if (isOpen && containerRef.current) {
            const updatePosition = () => {
                const rect = containerRef.current.getBoundingClientRect()
                setCoords({
                    top: rect.bottom + window.scrollY + 8, // Gap
                    left: rect.left + window.scrollX,
                    width: rect.width
                })
            }

            updatePosition()
            window.addEventListener('resize', updatePosition)
            window.addEventListener('scroll', updatePosition, true) // Capture scroll to update

            return () => {
                window.removeEventListener('resize', updatePosition)
                window.removeEventListener('scroll', updatePosition, true)
            }
        }
    }, [isOpen])

    const handleDateClick = (date) => {
        onChange(date)
        setIsOpen(false)
    }

    const handleClear = (e) => {
        e.stopPropagation()
        onChange(null)
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    const renderHeader = () => {
        return (
            <div className="calendar-header">
                <button type="button" onClick={prevMonth} className="calendar-nav-btn">
                    <FiChevronLeft />
                </button>
                <div className="current-month">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button type="button" onClick={nextMonth} className="calendar-nav-btn">
                    <FiChevronRight />
                </button>
            </div>
        )
    }

    const renderDays = () => {
        const days = []
        const date = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="calendar-day-name">
                    {date[i]}
                </div>
            )
        }

        return <div className="calendar-grid">{days}</div>
    }

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        const dateFormat = "d"
        const dayRange = eachDayOfInterval({
            start: startDate,
            end: endDate
        })

        return (
            <div className="calendar-grid">
                {/* Day Headers: use index as key since S/T repeat (Sun/Sat, Tue/Thu) */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={`day-header-${i}`} className="calendar-day-name">{d}</div>
                ))}

                {/* Days */}
                {dayRange.map((dayItem, idx) => {
                    const isSelected = selected && isSameDay(dayItem, new Date(selected))
                    return (
                        <div
                            key={dayItem.toString()}
                            className={`calendar-day 
                               ${!isSameMonth(dayItem, monthStart) ? 'other-month' : ''}
                               ${isSelected ? 'selected' : ''}
                               ${isToday(dayItem) ? 'today' : ''}
                           `}
                            onClick={() => handleDateClick(dayItem)}
                        >
                            {format(dayItem, dateFormat)}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className={`date-picker-container ${className}`} ref={containerRef}>
            {label && <label className="date-picker-label">{label}</label>}
            <div
                className={`date-picker-input-wrapper`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <FiCalendar className="date-picker-icon" />
                <input
                    readOnly
                    type="text"
                    className={`date-picker-input ${isOpen ? 'active' : ''}`}
                    value={selected ? format(new Date(selected), 'PP') : ''}
                    placeholder={placeholder}
                />
                {selected && (
                    <button onClick={handleClear} className="date-picker-clear">
                        <FiX />
                    </button>
                )}
            </div>

            {isOpen && ReactDOM.createPortal(
                <>
                    <div className="date-picker-backdrop" />
                    <div
                        className="calendar-popup"
                        style={{
                            // Desktop uses calculated coords, Mobile overrides via CSS
                            '--desktop-top': `${coords.top}px`,
                            '--desktop-left': `${coords.left}px`
                        }}
                        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
                    >
                        {renderHeader()}
                        {renderCells()}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

export default DatePicker
