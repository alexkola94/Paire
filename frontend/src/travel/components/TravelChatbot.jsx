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
  FiCheckCircle,
  FiCopy,
  FiDownload,
  FiFileText,
  FiPaperclip,
  FiChevronDown
} from 'react-icons/fi'
import { TbBrain } from 'react-icons/tb'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { travelChatbotService, aiGatewayService } from '../../services/api'
import { buildAttachmentsPayload } from '../../utils/chatAttachments'
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
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)
  const MAX_ATTACHMENT_SIZE_MB = 5
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputContainerRef = useRef(null)
  const chatWindowRef = useRef(null)
  const lastScrollAt = useRef(0)
  const scrollThrottleMs = 80
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true)
  const SCROLL_THRESHOLD_PX = 80

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
    if (isOpen) {
      setIsAtBottom(true)
      isAtBottomRef.current = true
      setTimeout(() => scrollToBottom(true), 100)
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isMinimized && isOpen) {
      setIsAtBottom(true)
      isAtBottomRef.current = true
      setTimeout(() => scrollToBottom(true), 100)
    }
  }, [isMinimized])

  useEffect(() => {
    isAtBottomRef.current = isAtBottom
  }, [isAtBottom])

  /** Detect when user scrolls; if they scroll up, show "scroll to end" button. */
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom <= SCROLL_THRESHOLD_PX
    setIsAtBottom(atBottom)
    isAtBottomRef.current = atBottom
  }, [])

  /** Scroll to bottom only when user is at bottom (or force=true). */
  const scrollToBottom = useCallback((force = false) => {
    if (!force && !isAtBottomRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /** Throttled scroll during typewriter; only scrolls when user is at bottom. */
  const scrollToBottomIfNeeded = useCallback(() => {
    if (!isAtBottomRef.current) return
    const now = Date.now()
    if (now - lastScrollAt.current >= scrollThrottleMs) {
      lastScrollAt.current = now
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  /** User clicked "scroll to end": scroll to bottom and resume auto-following. */
  const handleScrollToEnd = useCallback(() => {
    setIsAtBottom(true)
    isAtBottomRef.current = true
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

  const addUserMessage = (message, attachmentDisplay = null) => {
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: 'user',
        message,
        attachments: attachmentDisplay || undefined,
        timestamp: new Date()
      }
    ])
  }

  const handleAttachmentSelect = (e) => {
    const files = e.target.files
    if (!files?.length) return
    const next = []
    const maxBytes = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024
    const allowedImage = (f) => f.type.startsWith('image/')
    const allowedDoc = (f) => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.txt')
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > maxBytes) continue
      if (!allowedImage(file) && !allowedDoc(file)) continue
      const type = allowedImage(file) ? 'image' : 'document'
      const preview = type === 'image' ? URL.createObjectURL(file) : null
      next.push({ file, preview, type, name: file.name })
    }
    setAttachments(prev => [...prev, ...next].slice(-5))
    e.target.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments(prev => {
      const next = prev.slice()
      const item = next[index]
      if (item?.preview) URL.revokeObjectURL(item.preview)
      next.splice(index, 1)
      return next
    })
  }

  const sendMessage = async (text = input) => {
    const trimmed = (text || input).trim()
    if (!trimmed && !attachments.length) return
    const attachmentDisplay = attachments.map(a => ({
      type: a.type,
      name: a.name,
      urlOrData: a.preview || null
    }))
    const fallbackText = attachments.length ? attachments.map(a => `[${a.name}]`).join(', ') : ''
    const userMessage = trimmed
      ? (fallbackText ? `${trimmed}\n\n${t('travel.chatbot.attachedFiles', 'Attached')}: ${fallbackText}` : trimmed)
      : (t('travel.chatbot.attachedFiles', 'Attached') + ': ' + fallbackText)
    addUserMessage(userMessage, attachmentDisplay.length ? attachmentDisplay : null)
    // Build API attachment payload (base64 images, extracted PDF/text) before clearing
    const attachmentsPayload = await buildAttachmentsPayload(attachments)
    setInput('')
    setAttachments([])
    setIsAtBottom(true)
    isAtBottomRef.current = true
    setTimeout(() => scrollToBottom(true), 50)
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
            history,
            attachments: attachmentsPayload?.length ? attachmentsPayload : undefined
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
          const response = await aiGatewayService.chat(aiHistory, {
            signal: controller?.signal,
            attachments: attachmentsPayload?.length ? attachmentsPayload : undefined
          })
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

  /** Strip markdown to plain text for copy/export */
  const stripMarkdownToPlainText = (text) => {
    if (!text || typeof text !== 'string') return ''
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .trim()
  }

  /** Parse markdown table to CSV string; returns null if no table */
  const parseMarkdownTableToCsv = (text) => {
    if (!text || typeof text !== 'string') return null
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const tableStart = lines.findIndex(l => l.startsWith('|') && l.endsWith('|'))
    if (tableStart === -1) return null
    const tableLines = []
    for (let i = tableStart; i < lines.length; i++) {
      if (!lines[i].startsWith('|')) break
      tableLines.push(lines[i])
    }
    if (tableLines.length < 2) return null
    const rows = tableLines.map(line =>
      line.slice(1, -1).split('|').map(cell => cell.trim().replace(/"/g, '""'))
    )
    const hasSeparator = rows.length > 1 && rows[1].every(c => /^[-:]+$/.test(c))
    const dataRows = hasSeparator ? [rows[0], ...rows.slice(2)] : rows
    const header = dataRows[0]
    const data = dataRows.slice(1)
    const csvLines = [header.map(c => `"${c}"`).join(',')]
    data.forEach(row => { csvLines.push(row.map(c => `"${c}"`).join(',')) })
    return csvLines.join('\n')
  }

  const copyMessageToClipboard = async (msg) => {
    const plain = stripMarkdownToPlainText(msg.message)
    try { await navigator.clipboard.writeText(plain) } catch (err) { console.error('Copy failed:', err) }
  }

  const exportMessageAsFile = (msg, format = 'md') => {
    const content = format === 'txt' ? stripMarkdownToPlainText(msg.message) : msg.message
    const ext = format === 'txt' ? 'txt' : 'md'
    const name = `chat-message-${new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.${ext}`
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMessageAsCsv = (msg) => {
    const csv = parseMarkdownTableToCsv(msg.message)
    if (!csv) return
    const name = `chat-message-${new Date(msg.timestamp).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportConversation = (format = 'md') => {
    const lines = messages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant'
      const time = new Date(m.timestamp).toLocaleString()
      const content = format === 'txt' ? stripMarkdownToPlainText(m.message) : m.message
      return `### ${role} (${time})\n\n${content}`
    })
    const content = lines.join('\n\n---\n\n')
    const ext = format === 'txt' ? 'txt' : 'md'
    const name = `chat-export-${new Date().toISOString().slice(0, 10)}.${ext}`
    const blob = new Blob([content], { type: format === 'txt' ? 'text/plain' : 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
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
              <div className="travel-chatbot-messages-wrapper">
                <div
                  ref={messagesContainerRef}
                  className="travel-chatbot-messages"
                  onScroll={handleMessagesScroll}
                >
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
                      {msg.role === 'user' && msg.attachments?.length > 0 && (
                        <div className="travel-chatbot-message-attachments">
                          {msg.attachments.map((att, i) => (
                            <span key={i} className="travel-chatbot-message-attachment">
                              {att.type === 'image' && att.urlOrData ? (
                                <img src={att.urlOrData} alt={att.name} className="travel-chatbot-message-attachment-img" />
                              ) : (
                                <span className="travel-chatbot-message-attachment-doc">
                                  <FiFileText size={14} /> {att.name}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
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
                      {msg.role === 'bot' && !msg.typing && (
                        <div className="travel-chatbot-message-export-actions">
                          <button
                            type="button"
                            className="travel-chatbot-export-btn"
                            onClick={() => copyMessageToClipboard(msg)}
                            aria-label={t('travel.chatbot.copy', 'Copy')}
                            title={t('travel.chatbot.copy', 'Copy')}
                          >
                            <FiCopy size={14} />
                          </button>
                          <button
                            type="button"
                            className="travel-chatbot-export-btn"
                            onClick={() => exportMessageAsFile(msg, 'md')}
                            aria-label={t('travel.chatbot.exportAsMd', 'Export as Markdown')}
                            title={t('travel.chatbot.exportAsMd', 'Export as Markdown')}
                          >
                            <FiDownload size={14} />
                          </button>
                          {parseMarkdownTableToCsv(msg.message) && (
                            <button
                              type="button"
                              className="travel-chatbot-export-btn"
                              onClick={() => exportMessageAsCsv(msg)}
                              aria-label={t('travel.chatbot.exportAsCsv', 'Export as CSV')}
                              title={t('travel.chatbot.exportAsCsv', 'Export as CSV')}
                            >
                              <FiFileText size={14} />
                            </button>
                          )}
                        </div>
                      )}
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

                {/* Scroll to end: show when user has scrolled up (e.g. while bot is responding) */}
                {!isAtBottom && messages.length > 0 && (
                  <button
                    type="button"
                    className="travel-chatbot-scroll-to-end"
                    onClick={handleScrollToEnd}
                    aria-label={t('travel.chatbot.scrollToEnd', 'Scroll to end')}
                    title={t('travel.chatbot.scrollToEnd', 'Scroll to end')}
                  >
                    <FiChevronDown size={20} />
                  </button>
                )}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt"
                  multiple
                  className="travel-chatbot-file-input-hidden"
                  aria-label={t('travel.chatbot.attachFile', 'Attach file')}
                  onChange={handleAttachmentSelect}
                />
                {attachments.length > 0 && (
                  <div className="travel-chatbot-attachments-preview">
                    {attachments.map((att, i) => (
                      <span key={i} className="travel-chatbot-attachment-preview-item">
                        {att.type === 'image' && att.preview ? (
                          <img src={att.preview} alt={att.name} className="travel-chatbot-attachment-preview-img" />
                        ) : (
                          <span className="travel-chatbot-attachment-preview-doc">
                            <FiFileText size={14} /> {att.name}
                          </span>
                        )}
                        <button
                          type="button"
                          className="travel-chatbot-attachment-remove"
                          onClick={() => removeAttachment(i)}
                          aria-label={t('travel.chatbot.removeAttachment', 'Remove attachment')}
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                <button
                  type="button"
                  className="travel-chatbot-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label={t('travel.chatbot.attachFile', 'Attach file')}
                  title={t('travel.chatbot.attachFile', 'Attach file')}
                >
                  <FiPaperclip size={18} />
                </button>
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
                    onClick={() => !loading && (input.trim() || attachments.length) && sendMessage()}
                    aria-label={t('travel.chatbot.send', 'Send')}
                    role="button"
                    tabIndex={0}
                    style={{
                      opacity: loading || (!input.trim() && !attachments.length) ? 0.5 : 1,
                      cursor: loading || (!input.trim() && !attachments.length) ? 'not-allowed' : 'pointer'
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
                <button
                  onClick={() => exportConversation('md')}
                  className="travel-chatbot-footer-btn travel-chatbot-footer-export"
                  disabled={messages.length === 0}
                >
                  <FiDownload size={14} style={{ marginRight: '6px' }} />
                  {t('travel.chatbot.exportConversation', 'Export chat')}
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
