import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMic, FiMicOff, FiCheck, FiX, FiEdit3, FiDollarSign } from 'react-icons/fi'
import { voiceService, transactionService } from '../../services/api'
import { CATEGORIES } from '../../constants/categories'
import './VoiceExpenseEntry.css'

function VoiceExpenseEntry() {
  const { t } = useTranslation()
  const [isListening, setIsListening] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [success])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError(t('voiceExpense.notSupported', 'Voice recognition is not supported in this browser.'))
      return
    }

    setError(null)
    setParsed(null)

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    const langMap = { en: 'en-US', el: 'el-GR', es: 'es-ES', fr: 'fr-FR' }
    const lang = localStorage.getItem('language') || 'en'
    recognition.lang = langMap[lang] || 'en-US'

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      await parseVoiceText(transcript, lang)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'aborted') {
        setError(t('voiceExpense.error', 'Could not recognize speech. Please try again.'))
      }
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const parseVoiceText = async (text, language) => {
    setIsParsing(true)
    setError(null)
    try {
      const result = await voiceService.parseVoice(text, language)
      setParsed({
        amount: result.amount || 0,
        category: result.category || 'other',
        description: result.description || text,
        confidence: result.confidence || 0,
        originalText: text,
        type: result.type || 'expense'
      })
    } catch {
      setError(t('voiceExpense.parseFailed', 'Could not parse the expense. Please try again.'))
    } finally {
      setIsParsing(false)
    }
  }

  const updateField = (field, value) => {
    setParsed(prev => prev ? { ...prev, [field]: value } : null)
  }

  const confirmTransaction = async () => {
    if (!parsed || !parsed.amount) return
    setSaving(true)
    try {
      await transactionService.create({
        amount: parseFloat(parsed.amount),
        category: parsed.category,
        description: parsed.description,
        type: parsed.type,
        date: new Date().toISOString()
      })
      setParsed(null)
      setSuccess(true)
    } catch {
      setError(t('voiceExpense.saveFailed', 'Could not save transaction. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const dismiss = () => {
    setParsed(null)
    setError(null)
  }

  const confidenceColor = (c) => {
    if (c >= 0.8) return 'var(--success, #10B981)'
    if (c >= 0.5) return 'var(--warning, #F59E0B)'
    return 'var(--danger, #EF4444)'
  }

  return (
    <div className="voice-expense-container">
      {/* Floating Mic Button */}
      <button
        className={`voice-expense-fab ${isListening ? 'listening' : ''} ${success ? 'success' : ''}`}
        onClick={isListening ? stopListening : startListening}
        disabled={isParsing || saving}
        aria-label={isListening ? t('voiceExpense.stopListening', 'Stop listening') : t('voiceExpense.startListening', 'Add expense by voice')}
        title={isListening ? t('voiceExpense.listening', 'Listening...') : t('voiceExpense.startListening', 'Add expense by voice')}
      >
        {success ? (
          <FiCheck size={22} />
        ) : isListening ? (
          <FiMicOff size={22} />
        ) : (
          <FiMic size={22} />
        )}
        {isListening && <span className="voice-expense-pulse-ring" />}
      </button>

      {/* Parsing indicator */}
      {isParsing && (
        <div className="voice-expense-card">
          <div className="voice-expense-parsing">
            <div className="voice-expense-spinner" />
            <span>{t('voiceExpense.parsing', 'Parsing your expense...')}</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !parsed && (
        <div className="voice-expense-card voice-expense-error-card">
          <p className="voice-expense-error-text">{error}</p>
          <button className="voice-expense-dismiss" onClick={dismiss}>
            <FiX size={16} />
          </button>
        </div>
      )}

      {/* Preview Card */}
      {parsed && (
        <div className="voice-expense-card">
          <div className="voice-expense-card-header">
            <FiEdit3 size={16} />
            <span>{t('voiceExpense.preview', 'Preview')}</span>
            <button className="voice-expense-dismiss" onClick={dismiss} aria-label={t('voiceExpense.cancel', 'Cancel')}>
              <FiX size={16} />
            </button>
          </div>

          {parsed.originalText && (
            <p className="voice-expense-transcript">"{parsed.originalText}"</p>
          )}

          <div className="voice-expense-fields">
            <div className="voice-expense-field">
              <label>{t('voiceExpense.amount', 'Amount')}</label>
              <div className="voice-expense-amount-input">
                <FiDollarSign size={14} />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={parsed.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                />
              </div>
            </div>

            <div className="voice-expense-field">
              <label>{t('voiceExpense.category', 'Category')}</label>
              <select
                value={parsed.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                {(parsed.type === 'income' ? CATEGORIES.INCOME : CATEGORIES.EXPENSE).map(cat => (
                  <option key={cat} value={cat}>
                    {t(`categories.${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1))}
                  </option>
                ))}
              </select>
            </div>

            <div className="voice-expense-field">
              <label>{t('voiceExpense.description', 'Description')}</label>
              <input
                type="text"
                value={parsed.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <div className="voice-expense-field">
              <label>{t('voiceExpense.type', 'Type')}</label>
              <select
                value={parsed.type}
                onChange={(e) => updateField('type', e.target.value)}
              >
                <option value="expense">{t('voiceExpense.expense', 'Expense')}</option>
                <option value="income">{t('voiceExpense.income', 'Income')}</option>
              </select>
            </div>
          </div>

          {parsed.confidence > 0 && (
            <div className="voice-expense-confidence">
              <span>{t('voiceExpense.confidence', 'Confidence')}</span>
              <div className="voice-expense-confidence-bar">
                <div
                  className="voice-expense-confidence-fill"
                  style={{
                    width: `${Math.round(parsed.confidence * 100)}%`,
                    background: confidenceColor(parsed.confidence)
                  }}
                />
              </div>
              <span className="voice-expense-confidence-pct">{Math.round(parsed.confidence * 100)}%</span>
            </div>
          )}

          {error && <p className="voice-expense-error-text">{error}</p>}

          <div className="voice-expense-actions">
            <button
              className="voice-expense-btn voice-expense-btn-cancel"
              onClick={dismiss}
            >
              {t('voiceExpense.cancel', 'Cancel')}
            </button>
            <button
              className="voice-expense-btn voice-expense-btn-confirm"
              onClick={confirmTransaction}
              disabled={saving || !parsed.amount}
            >
              {saving ? t('voiceExpense.saving', 'Saving...') : t('voiceExpense.confirm', 'Confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceExpenseEntry
