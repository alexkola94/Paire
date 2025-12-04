import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMessageCircle, FiX, FiSend, FiMinus } from 'react-icons/fi'
import { chatbotService } from '../services/api'
import './Chatbot.css'

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
  const messagesEndRef = useRef(null)


  /**
   * Load initial suggestions on mount
   */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions()
      addBotMessage("Hi! 👋 I'm your financial assistant. Ask me anything about your expenses, income, or financial insights!")
    }
  }, [isOpen])

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
   */
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
        timestamp: new Date()
      }
    ])
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
        response.actionLink
      )
    } catch (error) {
      addBotMessage(
        'Sorry, I encountered an error. Please try again.',
        'error'
      )
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
   * Handle quick action click
   */
  const handleQuickAction = (action) => {
    sendMessage(action)
  }

  /**
   * Toggle chat window
   */
  const toggleChat = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
  }

  /**
   * Minimize chat window
   */
  const minimizeChat = () => {
    setIsMinimized(!isMinimized)
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
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="chatbot-fab"
          onClick={toggleChat}
          aria-label={t('chatbot.open')}
        >
          <FiMessageCircle style={{ width: '24px', height: '24px' }} />
          {suggestions.length > 0 && (
            <span className="chatbot-badge">{suggestions.length}</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}>
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">💰</div>
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
                        {msg.message.split('\n').map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                      
                      {/* Quick Actions */}
                      {msg.quickActions && msg.quickActions.length > 0 && (
                        <div className="chatbot-quick-actions">
                          {msg.quickActions.map((action, i) => (
                            <button
                              key={i}
                              className="chatbot-quick-action-btn"
                              onClick={() => handleQuickAction(action)}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action Link */}
                      {msg.actionLink && (
                        <a
                          href={msg.actionLink}
                          className="chatbot-action-link"
                        >
                          {t('chatbot.viewDetails', 'View Details')} →
                        </a>
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
                      <div className="chatbot-typing">
                        <span></span>
                        <span></span>
                        <span></span>
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
                <button
                  className="chatbot-send-btn"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  aria-label={t('chatbot.send')}
                >
                  <FiSend style={{ width: '20px', height: '20px' }} />
                </button>
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

