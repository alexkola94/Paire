import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { MdCalculate } from 'react-icons/md'
import { useCalculator } from '../context/CalculatorContext'
import '../styles/AddToCalculator.css'
import './AddToCalculatorButton.css'

/**
 * AddToCalculatorButton
 * Renders icon-only "Add to calculator" button; on click shows operation picker (+, -, *, /).
 * User chooses how the value should be applied, then value is added to the calculator.
 * Picker is portaled to body so it is not clipped by card overflow:hidden.
 */
function AddToCalculatorButton({ value, isPrivate, className = '', size = 18 }) {
  const { t } = useTranslation()
  const { addToCalculator } = useCalculator()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerRect, setPickerRect] = useState(null)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  // Position picker from button rect; keep inside viewport (mobile-first)
  useEffect(() => {
    if (!pickerOpen || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const padding = 12
    const pickerWidth = 240  // 4 buttons (44px) + gaps + padding
    const pickerHeight = 100 // compact height for horizontal layout
    // Center picker horizontally above button, clamped to viewport
    let left = rect.left + rect.width / 2 - pickerWidth / 2
    left = Math.max(padding, Math.min(left, window.innerWidth - pickerWidth - padding))
    let top = rect.top - 8 - pickerHeight
    if (top < padding) top = rect.bottom + 8
    top = Math.max(padding, Math.min(top, window.innerHeight - pickerHeight - padding))
    setPickerRect({ top, left })
  }, [pickerOpen])

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handleClickOutside = (e) => {
      if (
        popoverRef.current?.contains(e.target) ||
        buttonRef.current?.contains(e.target)
      ) return
      setPickerOpen(false)
    }
    const tid = setTimeout(() => document.addEventListener('click', handleClickOutside), 0)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [pickerOpen])

  const handleOperatorClick = (operator) => {
    addToCalculator(value, operator)
    setPickerOpen(false)
  }

  const operators = [
    { op: '+', labelKey: 'calculator.add', symbol: '+' },
    { op: '-', labelKey: 'calculator.subtract', symbol: '−' },
    { op: '*', labelKey: 'calculator.multiply', symbol: '×' },
    { op: '/', labelKey: 'calculator.divide', symbol: '÷' }
  ]

  if (isPrivate) return null

  const pickerContent = pickerOpen && pickerRect && (
    <>
      {/* Backdrop scrim: closes picker when tapped */}
      <div
        className="add-to-calc-backdrop"
        onClick={() => setPickerOpen(false)}
        aria-hidden="true"
      />
      {/* Picker card */}
      <div
        ref={popoverRef}
        className="add-to-calc-picker add-to-calc-picker--portal"
        role="dialog"
        aria-label={t('calculator.addAs')}
        style={{
          position: 'fixed',
          left: pickerRect.left,
          top: pickerRect.top,
          zIndex: 10000
        }}
      >
        <span className="add-to-calc-picker-title">{t('calculator.addAs')}</span>
        <div className="add-to-calc-picker-ops">
          {operators.map(({ op, labelKey, symbol }) => (
            <button
              key={op}
              type="button"
              className="add-to-calc-op-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleOperatorClick(op)
              }}
              title={t(labelKey)}
              aria-label={t(labelKey)}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="add-to-calc-button-wrapper">
      <button
        ref={buttonRef}
        type="button"
        className={`add-to-calc-btn ${className}`.trim()}
        onClick={(e) => {
          e.stopPropagation()
          setPickerOpen((prev) => !prev)
        }}
        aria-label={t('calculator.addToCalculator')}
        title={t('calculator.addToCalculator')}
        aria-expanded={pickerOpen}
        aria-haspopup="true"
      >
        <MdCalculate size={size} />
      </button>

      {pickerContent && createPortal(pickerContent, document.body)}
    </div>
  )
}

export default AddToCalculatorButton
