import { useState, useRef, useEffect } from 'react'
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
    const containerRef = useRef(null)
    const { t } = useTranslation()

    // initialize currentMonth to selected date if exists
    useEffect(() => {
        if (selected) {
            setCurrentMonth(new Date(selected))
        }
    }, [selected])

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

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
        const rows = []
        let days = []
        let day = startDate
        let formattedDate = ""

        const dayRange = eachDayOfInterval({
            start: startDate,
            end: endDate
        })

        return (
            <div className="calendar-grid">
                {/* Day Headers */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="calendar-day-name">{d}</div>
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

            {isOpen && (
                <div className="calendar-popup">
                    {renderHeader()}
                    {renderCells()}
                </div>
            )}
        </div>
    )
}

export default DatePicker
