import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  FiMessageCircle,
  FiX,
  FiSend,
  FiMinus,
  FiCpu,
  FiSquare,
  FiMaximize2,
  FiMinimize2,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle
} from 'react-icons/fi'
import { TbBrain } from 'react-icons/tb'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { travelChatbotService, aiGatewayService } from '../../services/api'
import { getStaticTravelSuggestions } from '../utils/travelChatbotSuggestions'
import '../styles/TravelChatbot.css'

/**
 * Typewriter effect for bot messages.
 * Calls onUpdate so parent can auto-scroll as text streams in.
 */
const TypewriterText = ({ text = '', onComplete, onUpdate, markdownClass }) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, 15)
      return () => clearTimeout(timeout)
    } else {
      if (onComplete) onComplete()
    }
  }, [currentIndex, text, onComplete])

  useEffect(() => {
    if (onUpdate && displayedText.length > 0) onUpdate()
  }, [displayedText, onUpdate])

  return (
    <div className={markdownClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {displayedText}
      </ReactMarkdown>
      {currentIndex < text.length && <span className="travel-chatbot-cursor" />}
    </div>
  )
}

/**
 * Travel Guide chatbot – same features as main Chatbot but travel context.
 * Theme-aware (travel light/dark palette).
 * When open/onClose are provided (opened from nav), no floating FAB/reveal; controlled by parent.
 */
function TravelChatbot({ onNavigate, open: controlledOpen, onClose }) {
  const { t } = useTranslation()
  const isControlled = controlledOpen !== undefined && typeof onClose === 'function'
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? (onClose ? () => onClose() : () => {}) : setInternalOpen
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  // Default to AI mode for travel (plan: AI-only; rule mode uses static fallback if backend unavailable)
  const [isAiMode, setIsAiMode] = useState(true)
  const [aiSubMode, setAiSubMode] = useState('normal')
  const [abortController, setAbortController] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputContainerRef = useRef(null)
  const chatWindowRef = useRef(null)
  const lastScrollAt = useRef(0)
  const scrollThrottleMs = 80

  const language = localStorage.getItem('language') || 'en'

  const getWelcomeMessage = (aiMode) => {
    if (aiMode) {
      return language === 'el'
        ? 'Γεια σας! 🤖 Είμαι ο AI ταξιδιωτικός σας οδηγός. Ρωτήστε με οτιδήποτε για το ταξίδι σας!'
        : "Hi! 🤖 I'm your AI Travel Guide. Ask me anything about your trip!"
    }
    return language === 'el'
      ? 'Γεια σας! ✈️ Είμαι ο ταξιδιωτικός σας οδηγός. Ρωτήστε με για συσκευασία, καιρό, προϋπολογισμό ή αξιοθέατα!'
      : "Hi! ✈️ I'm your Travel Guide. Ask me about packing, weather, budget, or things to do!"
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile || !isOpen) return
    const handleViewportResize = () => {
      if (window.visualViewport && chatWindowRef.current) {
        const viewportHeight = window.visualViewport.height
        const windowHeight = window.innerHeight
        const keyboardHeight = windowHeight - viewportHeight
        if (keyboardHeight > 100) {
          chatWindowRef.current.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
          chatWindowRef.current.style.height = `${viewportHeight}px`
          setTimeout(() => scrollToBottom(), 100)
        } else {
          chatWindowRef.current.style.removeProperty('--keyboard-height')
          chatWindowRef.current.style.height = ''
        }
      }
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize)
      window.visualViewport.addEventListener('scroll', handleViewportResize)
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize)
        window.visualViewport.removeEventListener('scroll', handleViewportResize)
      }
    }
  }, [isMobile, isOpen])

  const handleInputFocus = useCallback(() => {
    if (isMobile && inputContainerRef.current) {
      setTimeout(() => {
        inputContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        scrollToBottom()
      }, 300)
    }
  }, [isMobile])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions()
      addBotMessage(getWelcomeMessage(isAiMode))
    }
    if (isOpen) setTimeout(() => scrollToBottom(), 100)
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isMinimized && isOpen) setTimeout(() => scrollToBottom(), 100)
  }, [isMinimized])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const scrollToBottomIfNeeded = useCallback(() => {
    const now = Date.now()
    if (now - lastScrollAt.current >= scrollThrottleMs) {
      lastScrollAt.current = now
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Load suggestions: try API first, fallback to static list when backend unavailable
  const loadSuggestions = async () => {
    try {
      const list = await travelChatbotService.getSuggestions(language)
      setSuggestions(Array.isArray(list) && list.length > 0 ? list : getStaticTravelSuggestions(language))
    } catch (err) {
      console.warn('Travel chatbot suggestions API unavailable, using static list:', err?.message)
      setSuggestions(getStaticTravelSuggestions(language))
    }
  }

  const addBotMessage = (message, type = 'text', data = null, quickActions = null, actionLink = null) => {
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
        timestamp: new Date(),
        typing: type === 'text'
      }
    ])
    if (!isOpen || isMinimized) setUnreadCount(c => c + 1)
  }

  const handleTypingComplete = (id) => {
    setMessages(prev => prev.map(msg => (msg.id === id ? { ...msg, typing: false } : msg)))
  }

  const addUserMessage = (message) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), role: 'user', message, timestamp: new Date() }
    ])
  }

  const sendMessage = async (text = input) => {
    if (!text.trim()) return
    const userMessage = text.trim()
    addUserMessage(userMessage)
    setInput('')
    let controller = null
    if (isAiMode) {
      controller = new AbortController()
      setAbortController(controller)
    }
    setLoading(true)
    try {
      const history = messages.map(m => ({ role: m.role, message: m.message, timestamp: m.timestamp }))
      if (isAiMode) {
        if (aiSubMode === 'thinking') {
          const response = await aiGatewayService.ragQuery(userMessage, {
            signal: controller?.signal,
            history
          })
          const answer = response?.answer ?? response?.message?.content ?? ''
          const sources = response?.sources
          const sourceLabels = Array.isArray(sources)
            ? sources.map(s => (typeof s === 'string' ? s : (s?.title ?? s?.id ?? ''))).filter(Boolean)
            : []
          const displayMessage = sourceLabels.length
            ? `${answer}\n\n---\n*${t('travel.chatbot.sources', 'Sources')}: ${sourceLabels.join(', ')}*`
            : answer
          addBotMessage(displayMessage, 'text')
        } else {
          const aiHistory = [...history, { role: 'user', message: userMessage }]
          const response = await aiGatewayService.chat(aiHistory, { signal: controller?.signal })
          addBotMessage(response.message.content, 'text')
        }
      } else {
        // Rule-based: backend may not have travel-chatbot; show friendly fallback
        try {
          const response = await travelChatbotService.sendQuery(userMessage, history, language)
          addBotMessage(
            response.message,
            response.type,
            response.data,
            response.quickActions,
            response.actionLink
          )
        } catch (ruleError) {
          const isNotFoundOrUnavailable =
            (ruleError?.message && (String(ruleError.message).includes('404') || String(ruleError.message).includes('not configured'))) ||
            ruleError?.status === 404
          if (isNotFoundOrUnavailable) {
            const fallbackMsg =
              language === 'el'
                ? '✈️ Χρησιμοποιώ AI για να βοηθήσω με το ταξίδι σας. Ενεργοποιήστε τη λειτουργία AI ή δοκιμάστε μια πρόταση παρακάτω.'
                : "✈️ I use AI to help with your trip. Turn on AI mode or try one of the suggestions below."
            addBotMessage(fallbackMsg, 'info')
            setSuggestions(getStaticTravelSuggestions(language))
          } else throw ruleError
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        addBotMessage(language === 'el' ? '⏹️ Η απάντηση διακόπηκε.' : '⏹️ Response stopped.', 'info')
        return
      }
      if (isAiMode && (error.message?.includes('503') || error.message?.includes('not configured'))) {
        addBotMessage(
          language === 'el'
            ? '🤖 Η υπηρεσία AI δεν είναι διαθέσιμη. Δοκιμάστε τη λειτουργία κανόνων.'
            : '🤖 AI service is not available. Try rule-based mode.',
          'warning'
        )
      } else {
        addBotMessage(
          language === 'el' ? 'Λυπάμαι, αντιμετώπισα σφάλμα. Δοκιμάστε ξανά.' : 'Sorry, I encountered an error. Please try again.',
          'error'
        )
      }
      console.error('Travel chatbot error:', error)
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  const stopResponse = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setLoading(false)
    }
  }

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleQuickAction = (action) => {
    sendMessage(action)
  }

  const toggleChat = () => {
    if (isControlled) {
      if (isOpen) onClose()
      return
    }
    setIsOpen(!isOpen)
    setIsMinimized(false)
    if (isOpen) setIsRevealed(false)
    if (!isOpen) setUnreadCount(0)
  }

  useEffect(() => {
    if (isRevealed || (isOpen && !isMinimized)) {
      document.body.classList.add('travel-chatbot-open')
    } else {
      document.body.classList.remove('travel-chatbot-open')
    }
    return () => document.body.classList.remove('travel-chatbot-open')
  }, [isRevealed, isOpen, isMinimized])

  const minimizeChat = () => {
    if (isControlled) {
      onClose()
      return
    }
    const willBeMinimized = !isMinimized
    setIsMinimized(willBeMinimized)
    if (willBeMinimized) {
      setIsRevealed(false)
      setInternalOpen(false)
    }
    if (isMinimized) setUnreadCount(0)
  }

  const revealChatbot = () => {
    setIsRevealed(true)
    if (isMinimized) setIsMinimized(false)
    setUnreadCount(0)
  }

  const handleFabClick = () => {
    if (isMobile && !isRevealed) revealChatbot()
    else toggleChat()
  }

  const clearChat = () => {
    setMessages([])
    addBotMessage(
      language === 'el' ? 'Η συνομιλία καθαρίστηκε! Πώς μπορώ να βοηθήσω;' : 'Chat cleared! How can I help?'
    )
    loadSuggestions()
  }

  const toggleAiMode = () => {
    const activating = !isAiMode
    setIsAiMode(activating)
    const modeMessage = activating
      ? (language === 'el'
          ? '🤖 Λειτουργία AI ενεργοποιήθηκε!'
          : '🤖 AI mode enabled!')
      : (language === 'el'
          ? '📋 Λειτουργία κανόνων ενεργοποιήθηκε!'
          : '📋 Rule-based mode enabled!')
    addBotMessage(modeMessage, 'info')
  }

  const toggleFullscreen = () => setIsFullscreen(f => !f)

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'insight':
        return <FiCheckCircle className="travel-chatbot-message-type-icon insight" size={16} />
      case 'warning':
        return <FiAlertTriangle className="travel-chatbot-message-type-icon warning" size={16} />
      case 'error':
        return <FiAlertCircle className="travel-chatbot-message-type-icon error" size={16} />
      case 'info':
        return <FiInfo className="travel-chatbot-message-type-icon info" size={16} />
      default:
        return null
    }
  }

  const getActionLinkElement = (actionLink) => {
    if (!actionLink) return null
    const pageMatch = actionLink.match(/[?&]page=(\w+)/)
    if (onNavigate && pageMatch) {
      const page = pageMatch[1]
      return (
        <button
          type="button"
          className="travel-chatbot-action-link"
          onClick={() => {
            onNavigate(page)
            toggleChat()
          }}
        >
          {t('travel.chatbot.viewDetails', 'View Details')} →
        </button>
      )
    }
    return (
      <Link to={actionLink} className="travel-chatbot-action-link">
        {t('travel.chatbot.viewDetails', 'View Details')} →
      </Link>
    )
  }

  // When opened from nav (controlled), no floating reveal/FAB; only the chat window
  const showFloatingTrigger = !isControlled

  return (
    <div className="travel-chatbot-container">
      {showFloatingTrigger && !isRevealed && (
        <button
          className="travel-chatbot-reveal-btn"
          onClick={revealChatbot}
          aria-label={t('travel.chatbot.reveal', 'Reveal Travel Guide')}
        >
          <FiMessageCircle style={{ width: '20px', height: '20px' }} />
          {unreadCount > 0 && (
            <span className="travel-chatbot-badge travel-chatbot-badge-reveal">{unreadCount}</span>
          )}
        </button>
      )}

      {showFloatingTrigger && isRevealed && !isOpen && (
        <button
          className={`travel-chatbot-fab ${isMobile && isRevealed ? 'travel-chatbot-fab-revealed' : ''}`}
          onClick={handleFabClick}
          aria-label={t('travel.chatbot.open', 'Open chat')}
        >
          <FiMessageCircle style={{ width: '24px', height: '24px' }} />
          {unreadCount > 0 && <span className="travel-chatbot-badge">{unreadCount}</span>}
        </button>
      )}

      {isOpen && (isControlled || !isMobile || isRevealed) && (
        <div
          ref={chatWindowRef}
          className={`travel-chatbot-window ${isMinimized ? 'minimized' : ''} ${isMobile ? 'travel-chatbot-mobile' : ''} ${isMobile && isRevealed ? 'travel-chatbot-revealed' : ''} ${isFullscreen && !isMobile ? 'fullscreen' : ''}`}
        >
          <div className="travel-chatbot-header">
            <div className="travel-chatbot-header-info">
              <div className="travel-chatbot-avatar">
                ✈️
                {isMinimized && unreadCount > 0 && (
                  <span className="travel-chatbot-badge travel-chatbot-badge-minimized">{unreadCount}</span>
                )}
              </div>
              <div>
                <h3>{t('travel.chatbot.title', 'Travel Guide')}</h3>
                <p className="travel-chatbot-status">
                  <span className={`travel-chatbot-status-dot ${isAiMode ? 'ai-mode' : ''}`} />
                  {isAiMode ? t('travel.chatbot.aiModeActive', 'AI Mode') : t('travel.chatbot.online', 'Online')}
                </p>
              </div>
            </div>
            <div className="travel-chatbot-header-actions">
              <button
                type="button"
                onClick={toggleAiMode}
                className={`travel-chatbot-ai-toggle ${isAiMode ? 'active' : ''}`}
                aria-pressed={isAiMode}
                aria-label={isAiMode ? t('travel.chatbot.ruleMode', 'Rule mode') : t('travel.chatbot.aiMode', 'AI mode')}
                title={isAiMode ? t('travel.chatbot.ruleMode', 'Rule mode') : t('travel.chatbot.aiMode', 'AI mode')}
              >
                <FiCpu size={14} />
                <span className="travel-chatbot-ai-toggle-label">AI</span>
              </button>
              {!isMobile && (
                <span
                  onClick={toggleFullscreen}
                  className="travel-chatbot-header-btn"
                  aria-label={isFullscreen ? t('travel.chatbot.exitFullscreen', 'Exit fullscreen') : t('travel.chatbot.fullscreen', 'Fullscreen')}
                  title={isFullscreen ? t('travel.chatbot.exitFullscreen', 'Exit fullscreen') : t('travel.chatbot.fullscreen', 'Fullscreen')}
                  role="button"
                  tabIndex={0}
                >
                  {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
                </span>
              )}
              <span
                onClick={minimizeChat}
                className="travel-chatbot-header-btn"
                aria-label={t('travel.chatbot.minimize', 'Minimize')}
                role="button"
                tabIndex={0}
              >
                <FiMinus size={20} />
              </span>
              <span
                onClick={toggleChat}
                className="travel-chatbot-header-btn"
                aria-label={t('travel.chatbot.close', 'Close')}
                role="button"
                tabIndex={0}
              >
                <FiX size={22} />
              </span>
            </div>
          </div>

          {!isMinimized && (
            <>
              <div className="travel-chatbot-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`travel-chatbot-message ${msg.role === 'user' ? 'user' : 'bot'} ${msg.type || 'text'}`}
                  >
                    {msg.role === 'bot' && <div className="travel-chatbot-message-avatar">✈️</div>}
                    <div className="travel-chatbot-message-content">
                      {msg.role === 'bot' && msg.type && msg.type !== 'text' && (
                        <div className="travel-chatbot-message-type-indicator">
                          {getMessageTypeIcon(msg.type)}
                        </div>
                      )}
                      <div className="travel-chatbot-message-text">
                        {msg.typing && msg.role === 'bot' ? (
                          <TypewriterText
                            text={msg.message}
                            onComplete={() => handleTypingComplete(msg.id)}
                            onUpdate={scrollToBottomIfNeeded}
                            markdownClass="travel-chatbot-markdown"
                          />
                        ) : (
                          <div className="travel-chatbot-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {msg.message}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!msg.typing && msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="travel-chatbot-quick-actions">
                          {msg.quickActions.map((action, i) => (
                            <button
                              key={i}
                              className="travel-chatbot-quick-action-btn"
                              onClick={() => handleQuickAction(action)}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                      {!msg.typing && msg.actionLink && getActionLinkElement(msg.actionLink)}
                      <span className="travel-chatbot-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="travel-chatbot-message bot">
                    <div className="travel-chatbot-message-avatar">✈️</div>
                    <div className="travel-chatbot-message-content">
                      <div className="travel-chatbot-thinking">
                        <div className="travel-chatbot-thinking-spinner" />
                        <span>{t('travel.chatbot.thinking', 'Thinking...')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {messages.length === 1 && suggestions.length > 0 && (
                <div className="travel-chatbot-suggestions">
                  <p className="travel-chatbot-suggestions-title">
                    {t('travel.chatbot.tryAsking', 'Try asking:')}
                  </p>
                  <div className="travel-chatbot-suggestions-list">
                    {suggestions.slice(0, 4).map((suggestion, i) => (
                      <button
                        key={i}
                        className="travel-chatbot-suggestion-btn"
                        onClick={() => sendMessage(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="travel-chatbot-input-container" ref={inputContainerRef}>
                <textarea
                  className="travel-chatbot-input travel-chatbot-input-textarea"
                  placeholder={t('travel.chatbot.placeholder', 'Ask about your trip...')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={handleInputFocus}
                  disabled={loading}
                  rows={1}
                  aria-label={t('travel.chatbot.placeholder', 'Ask about your trip...')}
                />
                {isAiMode && (
                  <button
                    type="button"
                    className={`travel-chatbot-thinking-toggle ${aiSubMode === 'thinking' ? 'active' : ''}`}
                    onClick={() => setAiSubMode(aiSubMode === 'thinking' ? 'normal' : 'thinking')}
                    aria-pressed={aiSubMode === 'thinking'}
                    aria-label={aiSubMode === 'thinking' ? t('travel.chatbot.normalChatLabel', 'Normal') : t('travel.chatbot.thinkingModeLabel', 'Thinking mode')}
                    title={aiSubMode === 'thinking' ? t('travel.chatbot.thinkingModeLabel', 'Thinking mode') : t('travel.chatbot.normalChatLabel', 'Normal')}
                  >
                    <TbBrain size={20} />
                  </button>
                )}
                {loading && isAiMode && abortController && (
                  <button
                    className="travel-chatbot-stop-btn"
                    onClick={stopResponse}
                    aria-label={t('travel.chatbot.stopResponse', 'Stop')}
                    title={t('travel.chatbot.stopResponse', 'Stop')}
                  >
                    <FiSquare size={16} />
                  </button>
                )}
                {!(loading && isAiMode && abortController) && (
                  <span
                    className="travel-chatbot-send-btn"
                    onClick={() => !loading && input.trim() && sendMessage()}
                    aria-label={t('travel.chatbot.send', 'Send')}
                    role="button"
                    tabIndex={0}
                    style={{
                      opacity: loading || !input.trim() ? 0.5 : 1,
                      cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <FiSend size={20} />
                  </span>
                )}
              </div>

              <div className="travel-chatbot-footer">
                <button onClick={clearChat} className="travel-chatbot-footer-btn">
                  {t('travel.chatbot.clearChat', 'Clear chat')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TravelChatbot
