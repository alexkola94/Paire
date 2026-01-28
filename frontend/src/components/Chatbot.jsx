import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FiMessageCircle, FiX, FiSend, FiMinus, FiDownload } from 'react-icons/fi'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { chatbotService } from '../services/api'
import './Chatbot.css'

/**
 * Typewriter effect component
 */
const TypewriterText = ({ text = '', onComplete }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, 15) // Typing speed (smaller = faster)
      return () => clearTimeout(timeout)
    } else {
      if (onComplete) onComplete()
    }
  }, [currentIndex, text, onComplete])

  return (
    <div className="chatbot-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {displayedText}
      </ReactMarkdown>
      {currentIndex < text.length && <span className="chatbot-cursor"></span>}
    </div>
  )
}

/**
 * Mobile-First Floating Chatbot Component
 * Intelligent financial assistant with rule-based responses
 */
function Chatbot() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false) // For mobile reveal state
  const [isMobile, setIsMobile] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(null) // Track which report is downloading
  const messagesEndRef = useRef(null)

  /**
   * Detect mobile viewport
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])


  /**
   * Load initial suggestions on mount
   */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions()
      // Get language from localStorage for welcome message
      const language = localStorage.getItem('language') || 'en'
      const welcomeMessage = language === 'el'
        ? "Γεια σας! 👋 Είμαι ο οικονομικός σας βοηθός. Ρωτήστε με οτιδήποτε για τα έξοδα, τα έσοδα ή τις οικονομικές σας αναλύσεις!"
        : "Hi! 👋 I'm your financial assistant. Ask me anything about your expenses, income, or financial insights!"
      addBotMessage(welcomeMessage)
    }
    // Scroll to bottom when opening chat
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Auto-scroll to bottom when chat is reopened from minimized state
   */
  useEffect(() => {
    if (!isMinimized && isOpen) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [isMinimized]) // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * Load suggested questions
   */
  const loadSuggestions = async () => {
    try {
      const suggestions = await chatbotService.getSuggestions()
      setSuggestions(suggestions)
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  /**
   * Add a bot message to chat
   * @param {string} message - The message text
   * @param {string} type - Message type (text, insight, warning, report_ready, etc.)
   * @param {Object} data - Additional data
   * @param {Array} quickActions - Quick action suggestions
   * @param {string} actionLink - Link to related page
   * @param {boolean} canGenerateReport - Whether a report can be generated
   * @param {string} reportType - Type of report available
   * @param {Object} reportParams - Parameters for report generation
   */
  const addBotMessage = (message, type = 'text', data = null, quickActions = null, actionLink = null, canGenerateReport = false, reportType = null, reportParams = null) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: 'bot',
        message,
        type,
        data,
        quickActions,
        actionLink,
        canGenerateReport,
        reportType,
        reportParams,
        timestamp: new Date(),
        typing: type === 'text' || type === 'report_ready' // Type out text and report messages
      }
    ])

    // Increment unread count if chat is closed or minimized
    if (!isOpen || isMinimized) {
      setUnreadCount(prev => prev + 1)
    }
  }

  /**
   * Handle typing completion
   */
  const handleTypingComplete = (id) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, typing: false } : msg
    ))
  }

  /**
   * Add a user message to chat
   */
  const addUserMessage = (message) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        message,
        timestamp: new Date()
      }
    ])
  }

  /**
   * Send user query to chatbot
   */
  const sendMessage = async (text = input) => {
    if (!text.trim()) return

    const userMessage = text.trim()
    addUserMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role,
        message: m.message,
        timestamp: m.timestamp
      }))

      const response = await chatbotService.sendQuery(userMessage, history)

      addBotMessage(
        response.message,
        response.type,
        response.data,
        response.quickActions,
        response.actionLink,
        response.canGenerateReport,
        response.reportType,
        response.reportParams
      )
    } catch (error) {
      // Get language from localStorage for error message
      const language = localStorage.getItem('language') || 'en'
      const errorMessage = language === 'el'
        ? 'Λυπάμαι, αντιμετώπισα ένα σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
        : 'Sorry, I encountered an error. Please try again.'
      addBotMessage(errorMessage, 'error')
      console.error('Chatbot error:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  /**
   * Build a human-friendly, language-aware filename for reports
   */
  const buildReportFileName = (reportParams, format, language) => {
    const type = reportParams?.reportType || 'financial_report'

    let baseName = 'financial_report'
    if (language === 'el') {
      switch (type) {
        case 'expenses_by_category':
          baseName = 'analysi_exodon_ana_katigoria'
          break
        case 'monthly_summary':
          baseName = 'miniaia_oikonomiki_perilipsi'
          break
        case 'loans_summary':
          baseName = 'synopsi_daneion'
          break
        case 'savings_goals':
          baseName = 'stoxoi_apotamieusis'
          break
        default:
          baseName = 'oikonomiki_anafora'
          break
      }
    } else {
      switch (type) {
        case 'expenses_by_category':
          baseName = 'expenses_by_category'
          break
        case 'monthly_summary':
          baseName = 'monthly_financial_summary'
          break
        case 'loans_summary':
          baseName = 'loans_summary'
          break
        case 'savings_goals':
          baseName = 'savings_goals'
          break
        default:
          baseName = 'financial_report'
          break
      }
    }

    const start = new Date(reportParams.startDate)
    const end = new Date(reportParams.endDate)
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]

    return `${baseName}_${startStr}_to_${endStr}.${format}`
  }

  /**
   * Handle quick action click
   * Detects if action is a download request and handles accordingly
   */
  const handleQuickAction = (action, msgReportParams = null) => {
    const actionLower = action.toLowerCase()
    
    // Check if this is a download action
    if (actionLower.includes('download') || actionLower.includes('κατέβασε')) {
      const format = actionLower.includes('pdf') ? 'pdf' : 'csv'
      
      // If we have report params from the message, use them
      if (msgReportParams) {
        handleReportDownload(msgReportParams, format)
        return
      }
    }
    
    // Otherwise, send as a regular message
    sendMessage(action)
  }

  /**
   * Handle report download
   * @param {Object} reportParams - Report parameters from the message
   * @param {string} format - File format (csv or pdf)
   */
  const handleReportDownload = async (reportParams, format = 'csv') => {
    if (!reportParams) return
    
    const language = localStorage.getItem('language') || 'en'
    const downloadId = `${reportParams.reportType}-${format}`
    setDownloadingReport(downloadId)
    
    // Add a status message
    const statusMessage = language === 'el'
      ? `⏳ Δημιουργία αρχείου ${format.toUpperCase()}...`
      : `⏳ Generating ${format.toUpperCase()} file...`
    
    addBotMessage(statusMessage, 'info')
    
    try {
      const blob = await chatbotService.generateReport({
        reportType: reportParams.reportType,
        format: format,
        startDate: reportParams.startDate,
        endDate: reportParams.endDate,
        category: reportParams.category,
        groupBy: reportParams.groupBy
      })
      
      // Generate human-friendly, language-aware filename
      const filename = buildReportFileName(reportParams, format, language)
      
      // Trigger download
      chatbotService.downloadFile(blob, filename)
      
      // Success message
      const successMessage = language === 'el'
        ? `✅ Η αναφορά κατέβηκε με επιτυχία! Ελέγξτε τον φάκελο λήψεων σας.`
        : `✅ Report downloaded successfully! Check your downloads folder.`
      
      addBotMessage(successMessage, 'insight')
      
    } catch (error) {
      console.error('Error downloading report:', error)
      const errorMessage = language === 'el'
        ? `❌ Σφάλμα κατά τη δημιουργία της αναφοράς. Παρακαλώ δοκιμάστε ξανά.`
        : `❌ Error generating report. Please try again.`
      
      addBotMessage(errorMessage, 'error')
    } finally {
      setDownloadingReport(null)
    }
  }

  /**
   * Toggle chat window
   */
  const toggleChat = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
    // When closing, reset revealed state
    if (isOpen) {
      setIsRevealed(false)
    }
    // Clear unread count when opening chat
    if (!isOpen) {
      setUnreadCount(0)
    }
  }
  
  /**
   * Hide calculator when chatbot is revealed or open
   */
  useEffect(() => {
    if (isRevealed || (isOpen && !isMinimized)) {
      document.body.classList.add('chatbot-open')
    } else {
      document.body.classList.remove('chatbot-open')
    }
    
    return () => {
      document.body.classList.remove('chatbot-open')
    }
  }, [isRevealed, isOpen, isMinimized])

  /**
   * Minimize chat window
   */
  const minimizeChat = () => {
    const willBeMinimized = !isMinimized
    setIsMinimized(willBeMinimized)
    // Reset revealed state when minimized so reveal button appears again
    if (willBeMinimized) {
      setIsRevealed(false)
      setIsOpen(false) // Also close the chat when minimized
    }
    // Clear unread count when maximizing
    if (isMinimized) {
      setUnreadCount(0)
    }
  }

  /**
   * Reveal chatbot (first tap - shows FAB)
   */
  const revealChatbot = () => {
    setIsRevealed(true)
    // If chatbot is minimized, maximize it when revealed
    if (isMinimized) {
      setIsMinimized(false)
    }
    // Clear unread count when revealing
    setUnreadCount(0)
  }

  /**
   * Handle chatbot FAB click
   */
  const handleFabClick = () => {
    if (isMobile && !isRevealed) {
      revealChatbot()
    } else {
      toggleChat()
    }
  }

  /**
   * Clear chat history
   */
  const clearChat = () => {
    setMessages([])
    addBotMessage("Chat cleared! How can I help you?")
    loadSuggestions()
  }

  return (
    <div className="chatbot-container">
      {/* Reveal Button - Shows when chatbot is not revealed (first tap) */}
      {!isRevealed && (
        <button
          className="chatbot-reveal-btn"
          onClick={revealChatbot}
          aria-label={t('chatbot.reveal', 'Reveal chatbot')}
        >
          <FiMessageCircle style={{ width: '20px', height: '20px' }} />
          {unreadCount > 0 && (
            <span className="chatbot-badge chatbot-badge-reveal">{unreadCount}</span>
          )}
        </button>
      )}

      {/* Floating Action Button - Shows when revealed but not open (second tap opens) */}
      {isRevealed && !isOpen && (
        <button
          className={`chatbot-fab ${isMobile && isRevealed ? 'chatbot-fab-revealed' : ''}`}
          onClick={toggleChat}
          aria-label={t('chatbot.open')}
        >
          <FiMessageCircle style={{ width: '24px', height: '24px' }} />
          {unreadCount > 0 && (
            <span className="chatbot-badge">{unreadCount}</span>
          )}
        </button>
      )}

      {/* Chat Window - On mobile, only show if revealed */}
      {isOpen && (!isMobile || isRevealed) && (
        <div className={`chatbot-window ${isMinimized ? 'minimized' : ''} ${isMobile ? 'chatbot-mobile' : ''} ${isMobile && isRevealed ? 'chatbot-revealed' : ''}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                💰
                {isMinimized && unreadCount > 0 && (
                  <span className="chatbot-badge chatbot-badge-minimized">{unreadCount}</span>
                )}
              </div>
              <div>
                <h3>{t('chatbot.title', 'Financial Assistant')}</h3>
                <p className="chatbot-status">
                  <span className="chatbot-status-dot"></span>
                  {t('chatbot.online', 'Online')}
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <span
                onClick={minimizeChat}
                className="chatbot-header-btn"
                aria-label={t('chatbot.minimize')}
                role="button"
                tabIndex={0}
              >
                <FiMinus size={20} />
              </span>
              <span
                onClick={toggleChat}
                className="chatbot-header-btn"
                aria-label={t('chatbot.close')}
                role="button"
                tabIndex={0}
              >
                <FiX size={22} />
              </span>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="chatbot-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chatbot-message ${msg.role === 'user' ? 'user' : 'bot'} ${msg.type || 'text'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="chatbot-message-avatar">💰</div>
                    )}
                    <div className="chatbot-message-content">
                      <div className="chatbot-message-text">
                        {msg.typing && msg.role === 'bot' ? (
                          <TypewriterText
                            text={msg.message}
                            onComplete={() => handleTypingComplete(msg.id)}
                          />
                        ) : (
                          <div className="chatbot-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {msg.message}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions - Only show after typing is done */}
                      {!msg.typing && msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="chatbot-quick-actions">
                          {msg.quickActions.map((action, i) => {
                            const actionLower = action.toLowerCase()
                            const isDownload = actionLower.includes('download') || actionLower.includes('κατέβασε')
                            const isDownloading = downloadingReport && (
                              (actionLower.includes('csv') && downloadingReport.includes('csv')) ||
                              (actionLower.includes('pdf') && downloadingReport.includes('pdf'))
                            )
                            
                            return (
                              <button
                                key={i}
                                className={`chatbot-quick-action-btn ${isDownload ? 'download-btn' : ''} ${isDownloading ? 'downloading' : ''}`}
                                onClick={() => handleQuickAction(action, msg.reportParams)}
                                disabled={isDownloading}
                              >
                                {isDownload && <FiDownload size={14} style={{ marginRight: '6px' }} />}
                                {isDownloading ? (t('chatbot.downloading', 'Downloading...')) : action}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Action Link - Only show after typing is done */}
                      {!msg.typing && msg.actionLink && (
                        <Link
                          to={msg.actionLink}
                          className="chatbot-action-link"
                        >
                          {t('chatbot.viewDetails', 'View Details')} →
                        </Link>
                      )}

                      <span className="chatbot-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chatbot-message bot">
                    <div className="chatbot-message-avatar">💰</div>
                    <div className="chatbot-message-content">
                      <div className="chatbot-thinking">
                        <div className="chatbot-thinking-spinner"></div>
                        <span>{t('chatbot.thinking', 'Thinking...')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions */}
              {messages.length === 1 && suggestions.length > 0 && (
                <div className="chatbot-suggestions">
                  <p className="chatbot-suggestions-title">
                    {t('chatbot.tryAsking', 'Try asking:')}
                  </p>
                  <div className="chatbot-suggestions-list">
                    {suggestions.slice(0, 4).map((suggestion, i) => (
                      <button
                        key={i}
                        className="chatbot-suggestion-btn"
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="chatbot-input-container">
                <input
                  type="text"
                  className="chatbot-input"
                  placeholder={t('chatbot.placeholder', 'Ask me anything...')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
                <span
                  className="chatbot-send-btn"
                  onClick={() => !loading && input.trim() && sendMessage()}
                  aria-label={t('chatbot.send')}
                  role="button"
                  tabIndex={0}
                  style={{
                    opacity: loading || !input.trim() ? 0.5 : 1,
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  <FiSend size={20} />
                </span>
              </div>

              {/* Footer */}
              <div className="chatbot-footer">
                <button
                  onClick={clearChat}
                  className="chatbot-footer-btn"
                >
                  {t('chatbot.clearChat', 'Clear chat')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Chatbot

