import { useState, useMemo } from 'react'
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    isToday
} from 'date-fns'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

import './CalendarView.css'

export default function CalendarView({ bills, formatCurrency }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart)
        const endDate = endOfWeek(monthEnd)

        return eachDayOfInterval({ start: startDate, end: endDate })
    }, [currentMonth])

    // Get bills for selected date
    const selectedDateBills = useMemo(() => {
        return bills.filter(bill => {
            if (!bill.nextDueDate && !bill.next_due_date) return false
            const dueDate = new Date(bill.nextDueDate || bill.next_due_date)
            return isSameDay(dueDate, selectedDate)
        })
    }, [bills, selectedDate])

    // Get bills for a specific date (for markers)
    const getBillsForDate = (date) => {
        return bills.filter(bill => {
            if (!bill.nextDueDate && !bill.next_due_date) return false
            const dueDate = new Date(bill.nextDueDate || bill.next_due_date)
            return isSameDay(dueDate, date)
        })
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    return (
        <div className="calendar-view-container">
            {/* Calendar Header */}
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={prevMonth}>
                    <FiChevronLeft />
                </button>
                <h2 className="current-month-display">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button className="calendar-nav-btn" onClick={nextMonth}>
                    <FiChevronRight />
                </button>
            </div>

            {/* Week days header */}
            <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="weekday-label">{day}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {calendarDays.map((day) => {
                    const dayBills = getBillsForDate(day)
                    const isSelected = isSameDay(day, selectedDate)
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const dayIsToday = isToday(day)

                    return (
                        <div
                            key={day.toISOString()}
                            className={`calendar-day 
                ${!isCurrentMonth ? 'different-month' : ''} 
                ${isSelected ? 'selected' : ''}
                ${dayIsToday ? 'today' : ''}
              `}
                            onClick={() => setSelectedDate(day)}
                        >
                            <span className="day-number">{format(day, 'd')}</span>

                            {/* Bill Markers */}
                            <div className="day-markers">
                                {dayBills.slice(0, 3).map((bill) => (
                                    <span
                                        key={bill.id}
                                        className={`bill-dot category-${bill.category}`}
                                        title={`${bill.name} - ${formatCurrency(bill.amount)}`}
                                    />
                                ))}
                                {dayBills.length > 3 && (
                                    <span className="more-dots">+</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Selected Date Details */}
            <div className="selected-date-details">
                <h3>{format(selectedDate, 'EEEE, MMMM do, yyyy')}</h3>

                {selectedDateBills.length > 0 ? (
                    <div className="bills-list-compact">
                        {selectedDateBills.map(bill => (
                            <div key={bill.id} className="bill-item-compact glass-card">
                                <div className={`category-indicator category-${bill.category}`}></div>
                                <div className="bill-info">
                                    <span className="bill-name">{bill.name}</span>
                                    <span className="bill-amount">{formatCurrency(bill.amount)}</span>
                                </div>
                                {/* Actions could go here, simplifed for now */}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="no-bills-message">No bills due on this date.</p>
                )}
            </div>
        </div>
    )
}
