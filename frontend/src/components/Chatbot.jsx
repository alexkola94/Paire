import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { 
  FiMessageCircle, 
  FiX, 
  FiSend, 
  FiMinus, 
  FiDownload, 
  FiCpu, 
  FiSquare,
  FiMaximize2,
  FiMinimize2,
  FiAlertCircle,
  FiAlertTriangle,
  FiInfo,
  FiCheckCircle,
  FiFileText,
  FiChevronDown,
  FiCopy,
  FiPaperclip,
  FiImage
} from 'react-icons/fi'
import { TbBrain } from 'react-icons/tb' // Brain icon for thinking mode toggle
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { chatbotService, aiGatewayService } from '../services/api'
import { buildAttachmentsPayload } from '../utils/chatAttachments'
import './Chatbot.css'

/**
 * Typewriter effect component.
 * Calls onUpdate as text grows so the parent can auto-scroll to bottom.
 */
const TypewriterText = ({ text = '', onComplete, onUpdate }) => {
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

  // Notify parent when displayed text changes so chat can auto-scroll as response streams in
  useEffect(() => {
    if (onUpdate && displayedText.length > 0) {
      onUpdate()
    }
  }, [displayedText, onUpdate])

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
  const [isAiMode, setIsAiMode] = useState(false) // Toggle between rule-based and AI mode
  const [aiSubMode, setAiSubMode] = useState('normal') // When AI mode: 'thinking' = RAG enhanced, 'normal' = normal chat
  const [abortController, setAbortController] = useState(null) // AbortController for cancelling AI requests
  const [isFullscreen, setIsFullscreen] = useState(false) // Fullscreen mode for desktop
  const [attachments, setAttachments] = useState([]) // { file, preview?, type: 'image'|'document' }
  const fileInputRef = useRef(null)
  const MAX_ATTACHMENT_SIZE_MB = 5
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null) // Ref for scrollable messages area
  const inputContainerRef = useRef(null) // Ref for input container to handle keyboard
  const chatWindowRef = useRef(null) // Ref for chat window
  const lastScrollAt = useRef(0)
  const scrollThrottleMs = 80 // Throttle auto-scroll during typewriter to avoid jank
  // When user scrolls up during a response, we stop auto-scrolling and show "scroll to end" button
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true) // Ref so callbacks (e.g. typewriter onUpdate) see current value
  const SCROLL_THRESHOLD_PX = 80 // Pixels from bottom to consider "at bottom"

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
   * Handle mobile keyboard visibility using visualViewport API
   * Adjusts the chat window height when keyboard opens/closes
   */
  useEffect(() => {
    if (!isMobile || !isOpen) return

    const handleViewportResize = () => {
      if (window.visualViewport && chatWindowRef.current) {
        const viewportHeight = window.visualViewport.height
        const windowHeight = window.innerHeight
        const keyboardHeight = windowHeight - viewportHeight
        
        // Set CSS variable for available height when keyboard is open
        if (keyboardHeight > 100) {
          // Keyboard is likely open
          chatWindowRef.current.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
          chatWindowRef.current.style.height = `${viewportHeight}px`
          // Scroll to bottom to keep input visible
          setTimeout(() => scrollToBottom(true), 100)
        } else {
          // Keyboard is closed
          chatWindowRef.current.style.removeProperty('--keyboard-height')
          chatWindowRef.current.style.height = ''
        }
      }
    }

    // Use visualViewport API if available (better mobile support)
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
  }, [isMobile, isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle input focus on mobile - scroll into view
   */
  const handleInputFocus = useCallback(() => {
    if (isMobile && inputContainerRef.current) {
      // Small delay to let keyboard animation start
      setTimeout(() => {
        inputContainerRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        })
        // Also scroll messages to bottom
        scrollToBottom(true)
      }, 300)
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps


  /**
   * Get the appropriate welcome message based on mode and language
   */
  const getWelcomeMessage = (aiMode) => {
    const language = localStorage.getItem('language') || 'en'
    if (aiMode) {
      return language === 'el'
        ? "Γεια σας! 🤖 Είμαι ο AI οικονομικός σας βοηθός. Μπορώ να βοηθήσω με πιο σύνθετες ερωτήσεις και να έχω φυσικές συνομιλίες!"
        : "Hi! 🤖 I'm your AI-powered financial assistant. I can help with more complex questions and have natural conversations!"
    }
    return language === 'el'
      ? "Γεια σας! 👋 Είμαι ο οικονομικός σας βοηθός. Ρωτήστε με οτιδήποτε για τα έξοδα, τα έσοδα ή τις οικονομικές σας αναλύσεις!"
      : "Hi! 👋 I'm your financial assistant. Ask me anything about your expenses, income, or financial insights!"
  }

  /**
   * Load initial suggestions on mount
   */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSuggestions()
      addBotMessage(getWelcomeMessage(isAiMode))
    }
    // Scroll to bottom when opening chat and resume auto-following
    if (isOpen) {
      setIsAtBottom(true)
      isAtBottomRef.current = true
      setTimeout(() => scrollToBottom(true), 100)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Auto-scroll to bottom when new messages arrive only if user is at bottom
   */
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  /**
   * Auto-scroll to bottom when chat is reopened from minimized state
   */
  useEffect(() => {
    if (!isMinimized && isOpen) {
      setIsAtBottom(true)
      isAtBottomRef.current = true
      setTimeout(() => scrollToBottom(true), 100)
    }
  }, [isMinimized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref in sync so callbacks (e.g. typewriter onUpdate) see current value
  useEffect(() => {
    isAtBottomRef.current = isAtBottom
  }, [isAtBottom])

  /**
   * Detect when user scrolls; if they scroll up, stop auto-scrolling and show "scroll to end" button.
   */
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom <= SCROLL_THRESHOLD_PX
    setIsAtBottom(atBottom)
    isAtBottomRef.current = atBottom
  }, [])

  /**
   * Scroll to bottom only if user is already at bottom (so we don't override manual scroll-up).
   * Pass force=true when we explicitly want to scroll (e.g. open chat, user sent message).
   */
  const scrollToBottom = useCallback((force = false) => {
    if (!force && !isAtBottomRef.current) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /**
   * Throttled scroll during typewriter; only scrolls when user is at bottom.
   * Also checks actual scroll position so we never override if user has scrolled up
   * (e.g. while response is still generating).
   */
  const scrollToBottomIfNeeded = useCallback(() => {
    if (!isAtBottomRef.current) return
    const el = messagesContainerRef.current
    if (el) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      if (distanceFromBottom > SCROLL_THRESHOLD_PX) return // User scrolled up, don't override
    }
    const now = Date.now()
    if (now - lastScrollAt.current >= scrollThrottleMs) {
      lastScrollAt.current = now
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  /**
   * User clicked "scroll to end": scroll to bottom and resume auto-following.
   */
  const handleScrollToEnd = useCallback(() => {
    setIsAtBottom(true)
    isAtBottomRef.current = true
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
   * Add a user message to chat (optionally with attachments for display).
   */
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

  /**
   * Handle file selection for attachments (images + PDF, max 5MB).
   */
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

  /**
   * Send user query to chatbot (rule-based or AI mode).
   * Attachments are shown in the user message; fallback text is appended so AI sees them until backend supports attachments.
   */
  const sendMessage = async (text = input) => {
    const trimmed = (text || input).trim()
    if (!trimmed && !attachments.length) return

    const attachmentDisplay = attachments.map(a => ({
      type: a.type,
      name: a.name,
      urlOrData: a.preview || null
    }))
    const fallbackText = attachments.length
      ? attachments.map(a => `[${a.name}]`).join(', ')
      : ''
    const userMessage = trimmed
      ? (fallbackText ? `${trimmed}\n\n${t('chatbot.attachedFiles', 'Attached')}: ${fallbackText}` : trimmed)
      : (t('chatbot.attachedFiles', 'Attached') + ': ' + fallbackText)
    addUserMessage(userMessage, attachmentDisplay.length ? attachmentDisplay : null)
    setInput('')
    setAttachments([])
    // Do not revoke preview URLs here; they are used in the displayed user message

    // Build API attachment payload (images as base64, PDF/txt as extracted text)
    const attachmentsPayload = await buildAttachmentsPayload(attachments)

    // Stick to bottom so incoming response auto-scrolls; user can scroll up to read
    setIsAtBottom(true)
    isAtBottomRef.current = true
    setTimeout(() => scrollToBottom(true), 50)

    // Create AbortController for AI mode BEFORE setting loading
    // This ensures the stop button renders immediately when loading starts
    let controller = null
    if (isAiMode) {
      controller = new AbortController()
      setAbortController(controller)
    }
    setLoading(true)

    try {
      // Build conversation history
      const history = messages.map(m => ({
        role: m.role,
        message: m.message,
        timestamp: m.timestamp
      }))

      if (isAiMode) {
        if (aiSubMode === 'thinking') {
          // Thinking mode: RAG-enhanced query (retrieval + LLM)
          // Pass conversation history to enable follow-up questions and pronoun resolution
          const response = await aiGatewayService.ragQuery(userMessage, { 
            signal: controller?.signal,
            history: history,
            attachments: attachmentsPayload
          })
          const answer = response?.answer ?? response?.message?.content ?? ''
          const sources = response?.sources
          const sourceLabels = Array.isArray(sources)
            ? sources.map(s => (typeof s === 'string' ? s : (s?.title ?? s?.id ?? ''))).filter(Boolean)
            : []
          const displayMessage = sourceLabels.length
            ? `${answer}\n\n---\n*${t('chatbot.sources', 'Sources')}: ${sourceLabels.join(', ')}*`
            : answer
          addBotMessage(displayMessage, 'text')
        } else {
          // Normal chat: standard LLM conversation
          const aiHistory = [...history, { role: 'user', message: userMessage }]
          const response = await aiGatewayService.chat(aiHistory, { signal: controller?.signal, attachments: attachmentsPayload })
          addBotMessage(response.message.content, 'text')
        }
      } else {
        // Rule-based mode - existing chatbot service
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
      }
    } catch (error) {
      // Get language from localStorage for error message
      const language = localStorage.getItem('language') || 'en'
      
      // Handle aborted requests (user clicked stop)
      if (error.name === 'AbortError') {
        const stoppedMessage = language === 'el'
          ? '⏹️ Η απάντηση διακόπηκε.'
          : '⏹️ Response stopped.'
        addBotMessage(stoppedMessage, 'info')
        return // Don't show error for intentional abort
      }
      
      // Handle AI Gateway specific errors
      if (isAiMode && (error.message?.includes('503') || error.message?.includes('not configured'))) {
        const errorMessage = language === 'el'
          ? '🤖 Η υπηρεσία AI δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε τη λειτουργία κανόνων.'
          : '🤖 AI service is not available right now. Try switching to rule-based mode.'
        addBotMessage(errorMessage, 'warning')
      } else {
        const errorMessage = language === 'el'
          ? 'Λυπάμαι, αντιμετώπισα ένα σφάλμα. Παρακαλώ δοκιμάστε ξανά.'
          : 'Sorry, I encountered an error. Please try again.'
        addBotMessage(errorMessage, 'error')
      }
      console.error('Chatbot error:', error)
    } finally {
      setLoading(false)
      setAbortController(null) // Clear abort controller when done
    }
  }

  /**
   * Stop the current AI response
   */
  const stopResponse = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setLoading(false)
    }
  }

  /**
   * Handle key down in input: Enter submits, Shift+Enter inserts new line
   */
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Shift+Enter: allow default (insert newline in textarea)
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
    const language = localStorage.getItem('language') || 'en'
    const clearMessage = language === 'el'
      ? 'Η συνομιλία καθαρίστηκε! Πώς μπορώ να βοηθήσω;'
      : 'Chat cleared! How can I help you?'
    addBotMessage(clearMessage)
    loadSuggestions()
  }

  /**
   * Toggle AI mode on/off.
   * First press: activate AI mode (button shows active state, messages go to AI Gateway).
   * Second press: deactivate and return to rule-based chatbot (button inactive).
   */
  const toggleAiMode = () => {
    const activating = !isAiMode
    setIsAiMode(activating)

    // Notify user of mode change
    const language = localStorage.getItem('language') || 'en'
    const modeMessage = activating
      ? (language === 'el'
          ? '🤖 Λειτουργία AI ενεργοποιήθηκε! Τώρα χρησιμοποιώ τεχνητή νοημοσύνη για πιο φυσικές συνομιλίες.'
          : '🤖 AI mode enabled! I\'m now using artificial intelligence for more natural conversations.')
      : (language === 'el'
          ? '📋 Λειτουργία κανόνων ενεργοποιήθηκε! Χρησιμοποιώ προκαθορισμένες απαντήσεις για γρήγορη βοήθεια.'
          : '📋 Rule-based mode enabled! I\'m using predefined responses for quick assistance.')

    addBotMessage(modeMessage, 'info')
  }

  /**
   * Toggle fullscreen mode for desktop chat view
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  /**
   * Strip markdown to plain text for copy/export (basic: remove **, *, headers, links).
   */
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

  /**
   * Parse markdown table from message text and return CSV string.
   * Returns null if no table found.
   */
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
      line
        .slice(1, -1)
        .split('|')
        .map(cell => cell.trim().replace(/"/g, '""'))
    )
    const hasSeparator = rows.length > 1 && rows[1].every(c => /^[-:]+$/.test(c))
    const dataRows = hasSeparator ? [rows[0], ...rows.slice(2)] : rows
    const header = dataRows[0]
    const data = dataRows.slice(1)
    const csvLines = [header.map(c => `"${c}"`).join(',')]
    data.forEach(row => {
      csvLines.push(row.map(c => `"${c}"`).join(','))
    })
    return csvLines.join('\n')
  }

  /**
   * Copy bot message content to clipboard (plain text).
   */
  const copyMessageToClipboard = async (msg) => {
    const plain = stripMarkdownToPlainText(msg.message)
    try {
      await navigator.clipboard.writeText(plain)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  /**
   * Export a single bot message as file (.txt or .md).
   */
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

  /**
   * Export bot message as CSV if it contains a markdown table.
   */
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

  /**
   * Export full conversation as .md or .txt.
   */
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

  /**
   * Get the icon for a message type
   * @param {string} type - Message type (text, insight, warning, error, info, report_ready)
   * @returns {JSX.Element|null} Icon component or null
   */
  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'insight':
        return <FiCheckCircle className="chatbot-message-type-icon insight" size={16} />
      case 'warning':
        return <FiAlertTriangle className="chatbot-message-type-icon warning" size={16} />
      case 'error':
        return <FiAlertCircle className="chatbot-message-type-icon error" size={16} />
      case 'info':
        return <FiInfo className="chatbot-message-type-icon info" size={16} />
      case 'report_ready':
        return <FiFileText className="chatbot-message-type-icon report" size={16} />
      default:
        return null
    }
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
        <div 
          ref={chatWindowRef}
          className={`chatbot-window ${isMinimized ? 'minimized' : ''} ${isMobile ? 'chatbot-mobile' : ''} ${isMobile && isRevealed ? 'chatbot-revealed' : ''} ${isFullscreen && !isMobile ? 'fullscreen' : ''}`}
        >
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
                  <span className={`chatbot-status-dot ${isAiMode ? 'ai-mode' : ''}`}></span>
                  {isAiMode 
                    ? t('chatbot.aiModeActive', 'AI Mode') 
                    : t('chatbot.online', 'Online')}
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              {/* AI Mode Toggle: active when isAiMode, inactive = rule-based */}
              <button
                type="button"
                onClick={toggleAiMode}
                className={`chatbot-ai-toggle ${isAiMode ? 'active' : ''}`}
                aria-pressed={isAiMode}
                aria-label={isAiMode ? t('chatbot.ruleMode', 'Switch to Rule Mode') : t('chatbot.aiMode', 'Switch to AI Mode')}
                title={isAiMode ? t('chatbot.ruleMode', 'Switch to Rule Mode') : t('chatbot.aiMode', 'Switch to AI Mode')}
              >
                <FiCpu size={14} />
                <span className="chatbot-ai-toggle-label">AI</span>
              </button>
              {/* Fullscreen toggle - only show on desktop */}
              {!isMobile && (
                <span
                  onClick={toggleFullscreen}
                  className="chatbot-header-btn"
                  aria-label={isFullscreen ? t('chatbot.exitFullscreen', 'Exit fullscreen') : t('chatbot.fullscreen', 'Fullscreen')}
                  title={isFullscreen ? t('chatbot.exitFullscreen', 'Exit fullscreen') : t('chatbot.fullscreen', 'Fullscreen')}
                  role="button"
                  tabIndex={0}
                >
                  {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
                </span>
              )}
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
              <div className="chatbot-messages-wrapper">
                <div
                  ref={messagesContainerRef}
                  className="chatbot-messages"
                  onScroll={handleMessagesScroll}
                >
                  {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chatbot-message ${msg.role === 'user' ? 'user' : 'bot'} ${msg.type || 'text'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="chatbot-message-avatar">💰</div>
                    )}
                    <div className="chatbot-message-content">
                      {/* Message type indicator icon */}
                      {msg.role === 'bot' && msg.type && msg.type !== 'text' && (
                        <div className="chatbot-message-type-indicator">
                          {getMessageTypeIcon(msg.type)}
                        </div>
                      )}
                      <div className="chatbot-message-text">
                        {msg.typing && msg.role === 'bot' ? (
                          <TypewriterText
                            text={msg.message}
                            onComplete={() => handleTypingComplete(msg.id)}
                            onUpdate={scrollToBottomIfNeeded}
                          />
                        ) : (
                          <div className="chatbot-markdown">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {msg.message}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {/* User message attachments (images + document names) */}
                      {msg.role === 'user' && msg.attachments?.length > 0 && (
                        <div className="chatbot-message-attachments">
                          {msg.attachments.map((att, i) => (
                            <span key={i} className="chatbot-message-attachment">
                              {att.type === 'image' && att.urlOrData ? (
                                <img src={att.urlOrData} alt={att.name} className="chatbot-message-attachment-img" />
                              ) : (
                                <span className="chatbot-message-attachment-doc">
                                  <FiFileText size={14} /> {att.name}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

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

                      {/* Export actions - only for bot messages, after typing done */}
                      {msg.role === 'bot' && !msg.typing && (
                        <div className="chatbot-message-export-actions">
                          <button
                            type="button"
                            className="chatbot-export-btn"
                            onClick={() => copyMessageToClipboard(msg)}
                            aria-label={t('chatbot.copy', 'Copy')}
                            title={t('chatbot.copy', 'Copy')}
                          >
                            <FiCopy size={14} />
                          </button>
                          <button
                            type="button"
                            className="chatbot-export-btn"
                            onClick={() => exportMessageAsFile(msg, 'md')}
                            aria-label={t('chatbot.exportAsMd', 'Export as Markdown')}
                            title={t('chatbot.exportAsMd', 'Export as Markdown')}
                          >
                            <FiDownload size={14} />
                          </button>
                          {parseMarkdownTableToCsv(msg.message) && (
                            <button
                              type="button"
                              className="chatbot-export-btn"
                              onClick={() => exportMessageAsCsv(msg)}
                              aria-label={t('chatbot.exportAsCsv', 'Export as CSV')}
                              title={t('chatbot.exportAsCsv', 'Export as CSV')}
                            >
                              <FiFileText size={14} />
                            </button>
                          )}
                        </div>
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

                {/* Scroll to end: show when user has scrolled up (e.g. while bot is responding) */}
                {!isAtBottom && messages.length > 0 && (
                  <button
                    type="button"
                    className="chatbot-scroll-to-end"
                    onClick={handleScrollToEnd}
                    aria-label={t('chatbot.scrollToEnd', 'Scroll to end')}
                    title={t('chatbot.scrollToEnd', 'Scroll to end')}
                  >
                    <FiChevronDown size={20} />
                  </button>
                )}
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

              {/* Input: Enter = send, Shift+Enter = new line */}
              <div className="chatbot-input-container" ref={inputContainerRef}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt"
                  multiple
                  className="chatbot-file-input-hidden"
                  aria-label={t('chatbot.attachFile', 'Attach file')}
                  onChange={handleAttachmentSelect}
                />
                {attachments.length > 0 && (
                  <div className="chatbot-attachments-preview">
                    {attachments.map((att, i) => (
                      <span key={i} className="chatbot-attachment-preview-item">
                        {att.type === 'image' && att.preview ? (
                          <img src={att.preview} alt={att.name} className="chatbot-attachment-preview-img" />
                        ) : (
                          <span className="chatbot-attachment-preview-doc">
                            <FiFileText size={14} /> {att.name}
                          </span>
                        )}
                        <button
                          type="button"
                          className="chatbot-attachment-remove"
                          onClick={() => removeAttachment(i)}
                          aria-label={t('chatbot.removeAttachment', 'Remove attachment')}
                        >
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  className="chatbot-input chatbot-input-textarea"
                  placeholder={t('chatbot.placeholder', 'Ask me anything...')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={handleInputFocus}
                  disabled={loading}
                  rows={1}
                  aria-label={t('chatbot.placeholder', 'Ask me anything...')}
                />
                <button
                  type="button"
                  className="chatbot-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label={t('chatbot.attachFile', 'Attach file')}
                  title={t('chatbot.attachFile', 'Attach file')}
                >
                  <FiPaperclip size={18} />
                </button>
                {/* Thinking Mode Toggle - only visible when AI mode is on */}
                {isAiMode && (
                  <button
                    type="button"
                    className={`chatbot-thinking-toggle ${aiSubMode === 'thinking' ? 'active' : ''}`}
                    onClick={() => setAiSubMode(aiSubMode === 'thinking' ? 'normal' : 'thinking')}
                    aria-pressed={aiSubMode === 'thinking'}
                    aria-label={aiSubMode === 'thinking' 
                      ? t('chatbot.normalChatLabel', 'Switch to Normal chat') 
                      : t('chatbot.thinkingModeLabel', 'Switch to Thinking mode')}
                    title={aiSubMode === 'thinking' 
                      ? t('chatbot.thinkingModeLabel', 'Thinking mode') 
                      : t('chatbot.normalChatLabel', 'Normal chat')}
                  >
                    <TbBrain size={20} />
                  </button>
                )}
                
                {/* Stop button - shows when AI is loading */}
                {loading && isAiMode && abortController && (
                  <button
                    className="chatbot-stop-btn"
                    onClick={stopResponse}
                    aria-label={t('chatbot.stopResponse', 'Stop')}
                    title={t('chatbot.stopResponse', 'Stop')}
                  >
                    <FiSquare size={16} />
                  </button>
                )}
                {/* Send button - hidden when stop button is shown */}
                {!(loading && isAiMode && abortController) && (
                  <span
                    className="chatbot-send-btn"
                    onClick={() => !loading && (input.trim() || attachments.length) && sendMessage()}
                    aria-label={t('chatbot.send')}
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

              {/* Footer */}
              <div className="chatbot-footer">
                <button
                  onClick={clearChat}
                  className="chatbot-footer-btn"
                >
                  {t('chatbot.clearChat', 'Clear chat')}
                </button>
                <button
                  onClick={() => exportConversation('md')}
                  className="chatbot-footer-btn chatbot-footer-export"
                  disabled={messages.length === 0}
                >
                  <FiDownload size={14} style={{ marginRight: '6px' }} />
                  {t('chatbot.exportConversation', 'Export chat')}
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

