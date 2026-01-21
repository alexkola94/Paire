import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useModalRegistration } from '../../context/ModalContext'
import {
  FiPlus,
  FiFile,
  FiFileText,
  FiCreditCard,
  FiShield,
  FiX,
  FiTrash2,
  FiEdit2,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiHash,
  FiPaperclip,
  FiGlobe,
  FiMessageCircle,
  FiLoader
} from 'react-icons/fi'
import { documentService, uploadTravelFile, tripCityService } from '../services/travelApi'
import { getCountryFromPlaceName } from '../services/discoveryService'
import { getAdvisories } from '../services/travelAdvisoryService'
import TravelAdvisoryCard from '../components/TravelAdvisoryCard'
import { DOCUMENT_TYPES } from '../utils/travelConstants'
import DatePicker from '../components/DatePicker'
import '../styles/Documents.css'

// Document type icons mapping
const documentIcons = {
  passport: FiCreditCard,
  visa: FiFileText,
  booking: FiFile,
  insurance: FiShield,
  ticket: FiCreditCard,
  other: FiFile
}

// Simple AI provider configuration – URLs are templates that receive the encoded prompt.
// The first provider in this list is treated as the “most popular” default in the dropdown.
// NOTE: You can safely extend/replace these with your real AI chat destinations.
const AI_PROVIDERS = [
  {
    id: 'chatgpt',
    // ChatGPT is surfaced first as the most popular public assistant.
    urlTemplate: 'https://chat.openai.com/?q=',
    supportsUrlPrefill: true
  },
  {
    id: 'claude',
    // Anthropic Claude – doesn't support URL-based prefilling, will use clipboard fallback.
    urlTemplate: 'https://claude.ai/chat',
    supportsUrlPrefill: false
  },
  {
    id: 'gemini',
    // Google Gemini – doesn't support URL-based prefilling, will use clipboard fallback.
    urlTemplate: 'https://gemini.google.com/app',
    supportsUrlPrefill: false
  },
  {
    id: 'perplexity',
    // Perplexity AI – uses search-style query parameter.
    urlTemplate: 'https://www.perplexity.ai/search?q=',
    supportsUrlPrefill: true
  },
  {
    id: 'copilot',
    // Microsoft Copilot – doesn't support URL-based prefilling, will use clipboard fallback.
    urlTemplate: 'https://copilot.microsoft.com/',
    supportsUrlPrefill: false
  }
]

/**
 * Build a clear travel documents prompt for AI.
 * Keeps logic pure & easily testable.
 * Supports both single and multi-country destinations.
 */
const buildTravelDocsPrompt = ({
  originCountry,
  destinationCountry,
  destinationCountries, // Array of countries for multi-city trips
  tripName,
  startDate,
  endDate,
  t
}) => {
  // Fallback-safe values so the template always reads naturally.
  const origin =
    originCountry?.trim() ||
    t('travel.documents.aiHelper.originFallback', 'my home country')
  
  // Determine destination text - use multiple countries if provided, otherwise single
  let destination = ''
  const isMultiCountry = Array.isArray(destinationCountries) && destinationCountries.length > 0
  
  if (isMultiCountry) {
    // Filter out empty/null countries and get unique values
    const uniqueCountries = [...new Set(destinationCountries.filter(c => c?.trim()))]
    if (uniqueCountries.length > 0) {
      if (uniqueCountries.length === 1) {
        destination = uniqueCountries[0]
      } else if (uniqueCountries.length === 2) {
        destination = t('travel.documents.aiHelper.prompt.destinationsTwo', {
          country1: uniqueCountries[0],
          country2: uniqueCountries[1],
          defaultValue: `${uniqueCountries[0]} and ${uniqueCountries[1]}`
        })
      } else {
        // For 3+ countries, list them with proper formatting
        const lastCountry = uniqueCountries[uniqueCountries.length - 1]
        const otherCountries = uniqueCountries.slice(0, -1).join(', ')
        destination = t('travel.documents.aiHelper.prompt.destinationsMultiple', {
          countries: otherCountries,
          lastCountry,
          defaultValue: `${otherCountries}, and ${lastCountry}`
        })
      }
    } else {
      // Fallback if all countries are empty
      destination = destinationCountry?.trim() ||
        t('travel.documents.aiHelper.destinationFallback', 'my destination country')
    }
  } else {
    destination = destinationCountry?.trim() ||
      t('travel.documents.aiHelper.destinationFallback', 'my destination country')
  }

  const hasStart = !!startDate
  const hasEnd = !!endDate

  // Localized date strings – rely on browser locale but content comes from i18n.
  let startStr = ''
  let endStr = ''
  if (hasStart) {
    const start = new Date(startDate)
    startStr = start.toLocaleDateString()
  }
  if (hasEnd) {
    const end = new Date(endDate)
    endStr = end.toLocaleDateString()
  }

  const tripNameSentence = tripName ? t(
    'travel.documents.aiHelper.prompt.tripNameSentence',
    { tripName, defaultValue: ` for a trip called "${tripName}"` }
  ) : ''

  let line1
  if (hasStart && hasEnd) {
    line1 = t('travel.documents.aiHelper.prompt.line1WithRange', {
      origin,
      destination,
      startDate: startStr,
      endDate: endStr,
      tripNameSentence
    })
  } else if (hasStart) {
    line1 = t('travel.documents.aiHelper.prompt.line1WithStart', {
      origin,
      destination,
      startDate: startStr,
      tripNameSentence
    })
  } else {
    line1 = t('travel.documents.aiHelper.prompt.line1Basic', {
      origin,
      destination,
      tripNameSentence
    })
  }

  const line2 = t(
    'travel.documents.aiHelper.prompt.line2',
    'Please tell me which travel documents, visas, entry requirements, and health documents I may need.'
  )
  const line3 = t(
    'travel.documents.aiHelper.prompt.line3',
    'Split the answer into:'
  )
  const line4 = t(
    'travel.documents.aiHelper.prompt.line4',
    '- Essential documents required for entry'
  )
  const line5 = t(
    'travel.documents.aiHelper.prompt.line5',
    '- Recommended / nice-to-have documents'
  )
  
  // For multi-country trips, add a note about transit requirements
  const line6 = isMultiCountry && destinationCountries.length > 1
    ? t(
        'travel.documents.aiHelper.prompt.line6MultiCountry',
        '- Any country-specific visa rules, transit rules, passport validity rules, and cross-border travel requirements I should know for traveling between these countries.'
      )
    : t(
        'travel.documents.aiHelper.prompt.line6',
        '- Any country-specific visa rules, transit rules, or passport validity rules I should know.'
      )
  
  const line7 = t(
    'travel.documents.aiHelper.prompt.line7',
    'Answer in a concise, traveler-friendly checklist.'
  )

  return [line1, line2, line3, line4, line5, line6, line7].join('\n')
}

/**
 * Documents Page Component
 * Document vault for storing travel document info
 */
const DocumentsPage = ({ trip }) => {
  const { t, i18n } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [showAiHelper, setShowAiHelper] = useState(false)
  // Inline notes form state (light-theme helper, local only)
  const [notesTitle, setNotesTitle] = useState('')
  const [notesBody, setNotesBody] = useState('')
  const [savedNotes, setSavedNotes] = useState([])

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      if (!trip?.id) {
        setLoading(false)
        return
      }

      try {
        const data = await documentService.getByTrip(trip.id)
        setDocuments(data || [])
      } catch (error) {
        console.error('Error loading documents:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDocuments()
  }, [trip?.id])

  // Derive a best-effort destination country string from the trip destination.
  // This stays very simple on purpose and is refined asynchronously via Mapbox when possible.
  const inferredDestinationCountry = useMemo(() => {
    if (!trip?.destination) return ''

    let destinationText = String(trip.destination).trim()
    if (!destinationText) return ''

    // Normalise common separators like "Milan - Lombardy - Italy" into comma-based segments.
    destinationText = destinationText.replace(/\s+-\s+/g, ', ')

    // If destination has a comma (e.g. "Paris, France" or "Milan, Italy"),
    // assume the last segment is the country. When there is no comma, we fall
    // back to the raw destination text so the input is always prefilled based
    // on the current trip and can be refined by the user if needed.
    if (destinationText.includes(',')) {
      const parts = destinationText.split(',')
      const last = parts[parts.length - 1].trim()
      return last || destinationText
    }

    // No comma present (likely just a city); use the destination string so the
    // field is still auto-filled from the trip configuration.
    return destinationText
  }, [trip?.destination])

  // Resolved destination country/countries – handles both single and multi-city trips
  const [resolvedDestinationCountry, setResolvedDestinationCountry] = useState(inferredDestinationCountry)
  const [resolvedDestinationCountries, setResolvedDestinationCountries] = useState([])
  const [isMultiCityTrip, setIsMultiCityTrip] = useState(false)
  const [advisories, setAdvisories] = useState([])

  // Check if trip is multi-city and fetch cities
  useEffect(() => {
    const checkMultiCity = async () => {
      if (!trip?.id) {
        setIsMultiCityTrip(false)
        setResolvedDestinationCountries([])
        return
      }

      try {
        // Check trip type first
        const isMultiCity = trip.tripType === 'multi-city'
        
        if (isMultiCity) {
          // Fetch cities for multi-city trips
          const cities = await tripCityService.getByTrip(trip.id)
          if (cities && cities.length > 1) {
            setIsMultiCityTrip(true)
            
            // Extract countries from cities and resolve them
            const countryPromises = cities
              .filter(city => city.country || city.name)
              .map(async (city) => {
                // If city already has a country, use it
                if (city.country?.trim()) {
                  return city.country.trim()
                }
                
                // Otherwise, try to resolve from city name
                try {
                  const result = await getCountryFromPlaceName(city.name)
                  if (result?.countryName) {
                    // Prefer localized country name
                    let localizedName = result.countryName
                    if (result.countryCode && typeof Intl !== 'undefined' && Intl.DisplayNames) {
                      try {
                        const displayNames = new Intl.DisplayNames([i18n.language], { type: 'region' })
                        localizedName = displayNames.of(result.countryCode) || localizedName
                      } catch {
                        // Fallback to the name provided by Mapbox
                      }
                    }
                    return localizedName
                  }
                } catch (error) {
                  console.error(`Could not resolve country for city ${city.name}:`, error)
                }
                return null
              })
            
            const resolvedCountries = (await Promise.all(countryPromises))
              .filter(c => c) // Remove nulls
              .filter((c, index, arr) => arr.indexOf(c) === index) // Get unique countries
            
            setResolvedDestinationCountries(resolvedCountries)

            // Load advisories for the resolved destination countries.
            if (resolvedCountries.length > 0) {
              try {
                const advisoryResults = await getAdvisories(resolvedCountries)
                setAdvisories(advisoryResults || [])
              } catch (advisoryError) {
                console.error('Error loading advisories for multi-city destinations:', advisoryError)
                setAdvisories([])
              }
            } else {
              setAdvisories([])
            }
            
            // For backward compatibility, set the first country as single destination
            if (resolvedCountries.length > 0) {
              setResolvedDestinationCountry(resolvedCountries[0])
            }
          } else {
            setIsMultiCityTrip(false)
            setResolvedDestinationCountries([])
          }
        } else {
          setIsMultiCityTrip(false)
          setResolvedDestinationCountries([])
          setAdvisories([])
        }
      } catch (error) {
        console.error('Error checking multi-city trip:', error)
        setIsMultiCityTrip(false)
        setResolvedDestinationCountries([])
        setAdvisories([])
      }
    }

    checkMultiCity()
  }, [trip?.id, trip?.tripType, i18n.language])

  // Resolve single destination country for non-multi-city trips
  useEffect(() => {
    if (isMultiCityTrip) return // Skip for multi-city trips
    
    let cancelled = false

    // Always reset to the synchronous inference first for snappy UI.
    setResolvedDestinationCountry(inferredDestinationCountry)

    const resolveCountry = async () => {
      if (!trip?.destination) return

      try {
        const result = await getCountryFromPlaceName(trip.destination)
        if (!cancelled && result?.countryName) {
          // Prefer localized country name based on current UI language when ISO code is available.
          let localizedName = result.countryName
          if (result.countryCode && typeof Intl !== 'undefined' && Intl.DisplayNames) {
            try {
              const displayNames = new Intl.DisplayNames([i18n.language], { type: 'region' })
              localizedName = displayNames.of(result.countryCode) || localizedName
            } catch {
              // Fallback to the name provided by Mapbox if Intl.DisplayNames fails
            }
          }

          setResolvedDestinationCountry(localizedName)

          // Also refresh advisories for single-destination trips.
          try {
            const advisoryResults = await getAdvisories([localizedName])
            setAdvisories(advisoryResults || [])
          } catch (advisoryError) {
            console.error('Error loading advisory for destination country:', advisoryError)
            setAdvisories([])
          }
        }
      } catch (error) {
        console.error('Could not resolve destination country from trip destination:', error)
      }
    }

    resolveCountry()

    return () => {
      cancelled = true
    }
  }, [trip?.destination, inferredDestinationCountry, i18n.language, isMultiCityTrip])

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {})

  // Order document types so the most critical ones surface first in the list.
  // Passports / visas -> insurance -> tickets / bookings -> other.
  const orderedDocumentTypeEntries = Object.entries(DOCUMENT_TYPES).sort(
    ([keyA], [keyB]) => {
      const priority = {
        passport: 0,
        visa: 0,
        insurance: 1,
        ticket: 2,
        booking: 2,
        other: 3
      }
      const a = priority[keyA] ?? 10
      const b = priority[keyB] ?? 10
      return a - b
    }
  )

  // Check expiry status
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) return { status: 'expired', days: Math.abs(daysUntilExpiry) }
    if (daysUntilExpiry <= 30) return { status: 'expiring', days: daysUntilExpiry }
    if (daysUntilExpiry <= 90) return { status: 'warning', days: daysUntilExpiry }
    return { status: 'valid', days: daysUntilExpiry }
  }

  // Count documents with expiry issues
  const expiryIssues = documents.filter(doc => {
    const status = getExpiryStatus(doc.expiryDate)
    return status && (status.status === 'expired' || status.status === 'expiring')
  }).length

  // Add document with optimistic updates
  const handleAddDocument = async (docData) => {
    // Close modal immediately for optimistic UX
    setShowAddModal(false)
    setEditingDocument(null)

    // Create optimistic document with temporary ID
    const tempId = `temp-${Date.now()}`
    const optimisticDoc = {
      id: tempId,
      tripId: trip.id,
      ...docData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _optimistic: true
    }

    // Add optimistic document to list immediately
    setDocuments(prev => [...prev, optimisticDoc])
    setSaving(true)

    try {
      // Call API in background
      await documentService.create(trip.id, docData)
      
      // Refresh documents list to get real document from server
      const refreshedDocs = await documentService.getByTrip(trip.id)
      setDocuments(refreshedDocs || [])
      
      // Dispatch event to invalidate cache in TravelHome
      window.dispatchEvent(new CustomEvent('travel:item-added', { detail: { type: 'document', tripId: trip.id } }))
    } catch (error) {
      console.error('Error adding document:', error)
      // Remove optimistic document on error
      setDocuments(prev => prev.filter(d => d.id !== tempId))
      // TODO: Show error message to user (toast or inline)
    } finally {
      setSaving(false)
    }
  }

  // Update document
  const handleUpdateDocument = async (docData) => {
    try {
      await documentService.update(trip.id, editingDocument.id, docData)
      setDocuments(prev => prev.map(d => d.id === editingDocument.id ? { ...d, ...docData } : d))
      setShowAddModal(false)
      setEditingDocument(null)
      
      // Dispatch event to invalidate cache in TravelHome
      window.dispatchEvent(new CustomEvent('travel:item-updated', { detail: { type: 'document', tripId: trip.id } }))
    } catch (error) {
      console.error('Error updating document:', error)
    }
  }

  // Delete document
  const handleDeleteDocument = async (docId) => {
    try {
      await documentService.delete(trip.id, docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
      
      // Dispatch event to invalidate cache in TravelHome
      window.dispatchEvent(new CustomEvent('travel:item-deleted', { detail: { type: 'document', tripId: trip.id } }))
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  if (!trip) {
    return (
      <div className="documents-page empty-state">
        <FiFile size={48} />
        <h3>{t('travel.documents.noTrip', 'No Trip Selected')}</h3>
        <p>{t('travel.documents.createTripFirst', 'Create a trip to store your documents')}</p>
      </div>
    )
  }

  // Lazy-load the documents view while records are being fetched
  if (trip && loading) {
    return (
      <div className="travel-page-loading">
        <div className="travel-glass-card travel-page-loading-card">
          <FiLoader size={22} className="travel-spinner travel-page-loading-icon" />
          <p className="travel-page-loading-text">
            {t('travel.common.loadingTripView', 'Loading your trip view...')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="documents-page">
      {/* Compact travel advisory context above documents.
          For multi-country trips this card now supports left/right navigation
          between countries. */}
      {advisories && advisories.length > 0 && (
        <div className="documents-advisory-strip">
          <TravelAdvisoryCard advisory={advisories[0]} advisories={advisories} compact />
        </div>
      )}
      {/* Header */}
      <div className="documents-header">
        <div className="header-info">
          <h2 className="section-title">{t('travel.documents.title', 'Documents')}</h2>
          {expiryIssues > 0 && (
            <span className="expiry-alert">
              <FiAlertTriangle size={14} />
              {expiryIssues} {t('travel.documents.expiryAlert', 'need attention')}
            </span>
          )}
          {saving && (
            <span className="saving-indicator">
              <FiLoader size={14} className="spinning" />
              {t('travel.documents.adding', 'Adding document...')}
            </span>
          )}
        </div>

        <div className="header-actions">
          {/* AI helper trigger – asks what documents you need for this destination */}
          <button
            type="button"
            className="ai-helper-btn"
            onClick={() => setShowAiHelper(true)}
          >
            <FiGlobe size={16} />
            <span>
              {t(
                'travel.documents.aiHelper.askAiCta',
                'Ask AI: required documents'
              )}
            </span>
          </button>

          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <FiPlus size={20} />
          </button>
        </div>
      </div>

      {/* Compact issues strip – summarises documents that are expired or
          expiring soon so the most urgent items are visible above the fold. */}
      {expiryIssues > 0 && (
        <div className="documents-issues-strip">
          <FiAlertTriangle size={14} />
          <span className="documents-issues-text">
            {expiryIssues} {t('travel.documents.expiryAlert', 'need attention')}
          </span>
        </div>
      )}

      {/* Document sections by type */}
      <div className="documents-sections">
        {orderedDocumentTypeEntries.map(([key, type]) => {
          const typeDocs = groupedDocuments[key] || []
          if (typeDocs.length === 0) return null

          return (
            <motion.div
              key={key}
              className="document-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="section-label" style={{ color: type.color }}>
                {t(type.label)}
              </h3>
              <div className="document-cards">
                {typeDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    typeConfig={type}
                    getExpiryStatus={getExpiryStatus}
                    onEdit={() => {
                      setEditingDocument(doc)
                      setShowAddModal(true)
                    }}
                    onDelete={() => handleDeleteDocument(doc.id)}
                  />
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {documents.length === 0 && !loading && (
        <div className="documents-empty">
          <FiFile size={48} />
          <h3>{t('travel.documents.emptyTitle', 'No documents yet')}</h3>
          <p>{t('travel.documents.emptyDescription', 'Store passport, visa, and booking details securely')}</p>
          <button className="travel-btn" onClick={() => setShowAddModal(true)}>
            <FiPlus size={18} />
            {t('travel.documents.addDocument', 'Add Document')}
          </button>
        </div>
      )}

      {/* Quick Add Buttons when empty */}
      {documents.length === 0 && !loading && (
        <div className="quick-add-section">
          <h4>{t('travel.documents.quickAdd', 'Quick Add')}</h4>
          <div className="quick-add-grid">
            {Object.entries(DOCUMENT_TYPES).slice(0, 4).map(([key, type]) => {
              const Icon = documentIcons[key] || FiFile
              return (
                <button
                  key={key}
                  className="quick-add-btn"
                  onClick={() => {
                    setEditingDocument({ type: key })
                    setShowAddModal(true)
                  }}
                  style={{ '--doc-color': type.color }}
                >
                  <Icon size={24} />
                  <span>{t(type.label)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Inline helper notes form (local only, intentionally placed
          lower in the hierarchy so real documents stay the main focus). */}
      <div className="documents-notes-card">
        <h3 className="documents-notes-title">
          {t('travel.documents.notesHelper.title', 'Travel notes for your documents')}
        </h3>
        <p className="documents-notes-subtitle">
          {t(
            'travel.documents.notesHelper.subtitle',
            'Use this space to jot down questions for embassies, airlines, or your future self.'
          )}
        </p>
        <form
          className="documents-notes-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!notesTitle.trim() && !notesBody.trim()) return
            const entry = {
              id: Date.now(),
              title: notesTitle.trim() || t('travel.documents.notesHelper.untitled', 'Untitled note'),
              body: notesBody.trim()
            }
            setSavedNotes(prev => [entry, ...prev].slice(0, 5))
            setNotesTitle('')
            setNotesBody('')
          }}
        >
          <div className="documents-notes-row">
            <input
              type="text"
              className="documents-notes-input"
              value={notesTitle}
              onChange={(e) => setNotesTitle(e.target.value)}
              placeholder={t('travel.documents.notesHelper.titlePlaceholder', 'e.g., Visa questions for Japan')}
            />
          </div>
          <div className="documents-notes-row">
            <textarea
              className="documents-notes-textarea"
              rows={3}
              value={notesBody}
              onChange={(e) => setNotesBody(e.target.value)}
              placeholder={t(
                'travel.documents.notesHelper.bodyPlaceholder',
                'Add any reminders or talking points you want to keep next to your documents.'
              )}
            />
          </div>
          <div className="documents-notes-footer">
            <button type="submit" className="travel-btn">
              {t('travel.documents.notesHelper.save', 'Save note')}
            </button>
          </div>
        </form>
        {savedNotes.length > 0 && (
          <div className="documents-notes-list">
            {savedNotes.map(note => (
              <div key={note.id} className="documents-note-chip">
                <h4>{note.title}</h4>
                {note.body && <p>{note.body}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Document Modal */}
      <AnimatePresence>
        {showAddModal && (
          <DocumentFormModal
            tripId={trip.id}
            document={editingDocument}
            onClose={() => {
              setShowAddModal(false)
              setEditingDocument(null)
            }}
            onSave={editingDocument?.id ? handleUpdateDocument : handleAddDocument}
          />
        )}
        {showAiHelper && (
          <TravelDocsAiDialog
            trip={trip}
            inferredDestination={resolvedDestinationCountry}
            inferredDestinations={isMultiCityTrip ? resolvedDestinationCountries : []}
            isMultiCity={isMultiCityTrip}
            providers={AI_PROVIDERS}
            onClose={() => setShowAiHelper(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Document Card Component
const DocumentCard = ({ document, typeConfig, getExpiryStatus, onEdit, onDelete }) => {
  const { t } = useTranslation()
  const Icon = documentIcons[document.type] || FiFile
  const expiryStatus = getExpiryStatus(document.expiryDate)

  return (
    <motion.div
      className={`document-card ${expiryStatus?.status || ''}`}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="document-icon" style={{ color: typeConfig.color }}>
        <Icon size={24} />
      </div>

      <div className="document-content">
        <h4 className="document-name">{document.name}</h4>

        {document.documentNumber && (
          <div className="document-detail">
            <FiHash size={12} />
            <span className="document-number">{document.documentNumber}</span>
          </div>
        )}

        {document.expiryDate && (
          <div className={`document-expiry ${expiryStatus?.status || ''}`}>
            <FiCalendar size={12} />
            <span>
              {expiryStatus?.status === 'expired'
                ? t('travel.documents.expired', 'Expired')
                : t('travel.documents.expires', 'Expires')}: {new Date(document.expiryDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {expiryStatus && (
          <div className={`expiry-badge ${expiryStatus.status}`}>
            {expiryStatus.status === 'expired' && (
              <>
                <FiAlertTriangle size={12} />
                <span>{t('travel.documents.expiredDays', 'Expired {{days}}d ago', { days: expiryStatus.days })}</span>
              </>
            )}
            {expiryStatus.status === 'expiring' && (
              <>
                <FiClock size={12} />
                <span>{t('travel.documents.expiringDays', 'Expires in {{days}}d', { days: expiryStatus.days })}</span>
              </>
            )}
            {expiryStatus.status === 'warning' && (
              <>
                <FiClock size={12} />
                <span>{t('travel.documents.expiresIn', '{{days}}d remaining', { days: expiryStatus.days })}</span>
              </>
            )}
            {expiryStatus.status === 'valid' && (
              <>
                <FiCheckCircle size={12} />
                <span>{t('travel.documents.valid', 'Valid')}</span>
              </>
            )}
          </div>
        )}

        {document.notes && (
          <p className="document-notes">{document.notes}</p>
        )}
      </div>

      <div className="document-actions">
        <button className="document-action-btn" onClick={onEdit}>
          <FiEdit2 size={14} />
        </button>
        <button className="document-action-btn delete" onClick={onDelete}>
          <FiTrash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// Document Form Modal Component
const DocumentFormModal = ({ tripId, document, onClose, onSave }) => {
  const { t } = useTranslation()
  
  // Register modal to hide bottom navigation
  useModalRegistration(true)
  
  const [formData, setFormData] = useState({
    type: document?.type || 'passport',
    name: document?.name || '',
    documentNumber: document?.documentNumber || '',
    expiryDate: document?.expiryDate || '',
    notes: document?.notes || '',
    // Attachment metadata – maps to backend TravelDocument.FileUrl & friends
    fileUrl: document?.fileUrl || null,
    fileName: document?.fileName || '',
    fileType: document?.fileType || '',
    fileSize: document?.fileSize || null
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Handle attachment upload with basic validation
  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !tripId) return

    // Reset previous error
    setUploadError('')

    // 5MB max to keep uploads mobile friendly
    const maxSizeBytes = 5 * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setUploadError(t('fileUpload.sizeError', { max: 5 }))
      return
    }

    setUploading(true)
    try {
      const result = await uploadTravelFile(tripId, file)

      if (result?.url) {
        setFormData(prev => ({
          ...prev,
          fileUrl: result.url,
          fileName: result.name || file.name,
          fileType: result.type || file.type,
          fileSize: result.size ?? file.size
        }))
      }
    } catch (error) {
      console.error('Error uploading document attachment:', error)
      setUploadError(
        t('fileUpload.uploadError', { error: error.message || 'Error' })
      )
    } finally {
      setUploading(false)
      // Clear the file input so selecting the same file again retriggers change
      event.target.value = ''
    }
  }

  const handleRemoveAttachment = () => {
    setFormData(prev => ({
      ...prev,
      fileUrl: null,
      fileName: '',
      fileType: '',
      fileSize: null
    }))
    setUploadError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    // Keep payload lean – the backend knows how to map fileUrl into its model.
    const payload = {
      type: formData.type,
      name: formData.name,
      documentNumber: formData.documentNumber,
      expiryDate: formData.expiryDate,
      notes: formData.notes,
      fileUrl: formData.fileUrl
    }
    // Close modal immediately for optimistic UX
    onClose()
    // Call onSave which will handle optimistic update
    onSave(payload)
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="document-form-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{document?.id ? t('travel.documents.editDocument', 'Edit Document') : t('travel.documents.addDocument', 'Add Document')}</h3>
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Document Type Selector */}
          <div className="form-group">
            <label>{t('travel.documents.documentType', 'Document Type')}</label>
            <div className="type-selector">
              {Object.entries(DOCUMENT_TYPES).map(([key, type]) => {
                const Icon = documentIcons[key] || FiFile
                return (
                  <button
                    key={key}
                    type="button"
                    className={`type-option ${formData.type === key ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, type: key }))}
                    style={{ '--type-color': type.color }}
                  >
                    <Icon size={20} />
                    <span>{t(type.label)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Core document identity */}
          <div className="document-form-row">
            {/* Name */}
            <div className="form-group">
              <label>{t('travel.documents.documentName', 'Name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('travel.documents.namePlaceholder', 'e.g., US Passport, Hotel Booking')}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Number + Expiry side‑by‑side on larger screens */}
          <div className="document-form-row">
            <div className="form-group">
              <label>{t('travel.documents.documentNumber', 'Document/Reference Number')}</label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                placeholder={t('travel.documents.numberPlaceholder', 'Optional')}
              />
            </div>

            <div className="form-group">
              <DatePicker
                label={t('travel.documents.expiryDate', 'Expiry Date')}
                value={formData.expiryDate}
                onChange={(value) => setFormData(prev => ({ ...prev, expiryDate: value }))}
                placeholder={t('travel.documents.selectExpiryDate', 'Select expiry date')}
              />
            </div>
          </div>

          {/* Attachment */}
          <div className="form-group">
            <label>{t('travel.documents.attachment', 'Attachment')}</label>
            <div className="attachment-upload">
              <label className="attachment-upload-btn">
                <FiPaperclip size={16} />
                <span>
                  {uploading
                    ? t('common.uploading', 'Uploading...')
                    : t(
                        'fileUpload.selectFile',
                        'Select file'
                      )}
                </span>
                <input
                  type="file"
                  onChange={handleAttachmentChange}
                  disabled={uploading}
                  accept=".pdf,image/*"
                />
              </label>

              {formData.fileUrl && (
                <div className="attachment-chip">
                  <button
                    type="button"
                    className="attachment-view"
                    onClick={() => window.open(formData.fileUrl, '_blank')}
                  >
                    <FiPaperclip size={14} />
                    <span>
                      {formData.fileName ||
                        t('travel.documents.viewAttachment', 'View attachment')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={handleRemoveAttachment}
                  >
                    {t('travel.documents.removeAttachment', 'Remove')}
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="attachment-error">
                  {uploadError}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>{t('travel.documents.notes', 'Notes')}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t('travel.documents.notesPlaceholder', 'Additional details...')}
              rows={3}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="travel-btn">
              {document?.id ? t('common.save', 'Save') : t('common.add', 'Add')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

/**
 * TravelDocsAiDialog
 * Lightweight helper dialog that:
 * - Shows origin & destination countries (supports multiple for multi-city trips)
 * - Lets the user pick which AI to use
 * - Builds a clear prompt and redirects to the selected AI chat page
 */
const TravelDocsAiDialog = ({ trip, inferredDestination, inferredDestinations, isMultiCity, providers, onClose }) => {
  const { t } = useTranslation()

  // Register modal to hide bottom navigation for mobile
  useModalRegistration(true)

  // Try to infer a sensible default origin country from the browser locale (e.g. "en-US" -> "United States").
  const detectDefaultOriginCountry = () => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return ''
    }

    try {
      const nav = window.navigator
      const lang = (nav.languages && nav.languages[0]) || nav.language || ''
      const parts = lang.split('-')
      if (parts.length < 2) {
        return ''
      }

      const regionCode = parts[1].toUpperCase()

      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        const displayNames = new Intl.DisplayNames([parts[0]], { type: 'region' })
        return displayNames.of(regionCode) || ''
      }

      return regionCode
    } catch (error) {
      console.warn('Could not detect default origin country from navigator:', error)
      return ''
    }
  }

  // Origin country – best effort auto-fill from current locale, still editable by the user.
  // This can later be wired to a real profile/location service.
  const [originCountry, setOriginCountry] = useState('')
  
  // For multi-city trips, use the array of countries; otherwise use single destination
  const [destinationCountries, setDestinationCountries] = useState(
    isMultiCity && inferredDestinations?.length > 0 
      ? inferredDestinations 
      : inferredDestination ? [inferredDestination] : []
  )
  const [selectedProviderId, setSelectedProviderId] = useState(
    providers?.[0]?.id || ''
  )

  // Prompt text – initial value is auto-generated from trip data and fully localized,
  // but the user can freely edit it before sending.
  const [promptText, setPromptText] = useState('')
  const hasEditedPromptRef = useRef(false)

  // Auto-fill origin country the first time the dialog opens, if we can infer it.
  useEffect(() => {
    if (!originCountry) {
      const inferred = detectDefaultOriginCountry()
      if (inferred) {
        setOriginCountry(inferred)
      }
    }
  }, [originCountry])

  useEffect(() => {
    const autoPrompt = buildTravelDocsPrompt({
      originCountry,
      destinationCountry: destinationCountries.length > 0 ? destinationCountries[0] : '',
      destinationCountries: isMultiCity ? destinationCountries : undefined,
      tripName: trip?.name,
      startDate: trip?.startDate,
      endDate: trip?.endDate,
      t
    })

    // Only override the prompt while the user has not started editing.
    if (!hasEditedPromptRef.current) {
      setPromptText(autoPrompt)
    }
  }, [originCountry, destinationCountries, isMultiCity, trip?.name, trip?.startDate, trip?.endDate, t])

  const handlePromptChange = (event) => {
    if (!hasEditedPromptRef.current) {
      hasEditedPromptRef.current = true
    }
    setPromptText(event.target.value)
  }

  const [clipboardNotification, setClipboardNotification] = useState('')

  const handleRedirect = async () => {
    const provider = providers.find((p) => p.id === selectedProviderId)
    if (!provider) return

    const finalPrompt =
      (promptText && promptText.trim()) ||
      buildTravelDocsPrompt({
        originCountry,
        destinationCountry: destinationCountries.length > 0 ? destinationCountries[0] : '',
        destinationCountries: isMultiCity ? destinationCountries : undefined,
        tripName: trip?.name,
        startDate: trip?.startDate,
        endDate: trip?.endDate,
        t
      })

    // If provider supports URL-based prefilling, use that approach.
    if (provider.supportsUrlPrefill && provider.urlTemplate) {
      const encodedPrompt = encodeURIComponent(finalPrompt)
      const targetUrl = `${provider.urlTemplate}${encodedPrompt}`
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    } else {
      // For providers that don't support URL prefilling, copy to clipboard and open base URL.
      try {
        await navigator.clipboard.writeText(finalPrompt)
        setClipboardNotification(
          t(
            'travel.documents.aiHelper.promptCopied',
            'Prompt copied to clipboard! Paste it into the AI chat.'
          )
        )
        // Clear notification after 5 seconds
        setTimeout(() => setClipboardNotification(''), 5000)
      } catch (err) {
        console.error('Failed to copy to clipboard:', err)
        // Fallback: show prompt in alert if clipboard API fails
        alert(
          t(
            'travel.documents.aiHelper.copyFailed',
            'Could not copy to clipboard. Please copy the prompt manually from the preview above.'
          )
        )
      }

      // Open the provider's base URL
      if (provider.urlTemplate) {
        window.open(provider.urlTemplate, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const isConfirmDisabled =
    !selectedProviderId || 
    !originCountry.trim() || 
    destinationCountries.length === 0 || 
    (!isMultiCity && !destinationCountries[0]?.trim())

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="ai-helper-modal"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="ai-helper-title">
            <FiMessageCircle size={20} />
            <div className="ai-helper-heading">
              <h3>
                {t(
                  'travel.documents.aiHelper.title',
                  'Ask AI which documents you need'
                )}
              </h3>
              <p>
                {t(
                  'travel.documents.aiHelper.subtitle',
                  'We will compose a clear question for your chosen AI based on your route.'
                )}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="ai-helper-body">
          {/* Trip route summary row */}
          <div className="ai-helper-row">
            {/* Origin country */}
            <div className="form-group">
              <label>
                {t(
                  'travel.documents.aiHelper.originCountry',
                  'Origin country'
                )}
              </label>
              <input
                type="text"
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                placeholder={t(
                  'travel.documents.aiHelper.originPlaceholder',
                  'e.g., Greece'
                )}
              />
            </div>

            {/* Destination countries – supports both single and multi-city trips */}
            {isMultiCity && destinationCountries.length > 0 ? (
              <div className="form-group">
                <label>
                  {t(
                    'travel.documents.aiHelper.destinationCountries',
                    'Destination countries'
                  )}
                </label>
                <div className="destination-countries-list">
                  {destinationCountries.map((country, index) => (
                    <div key={index} className="destination-country-chip">
                      <span>{country}</span>
                      <button
                        type="button"
                        className="remove-country-btn"
                        onClick={() => {
                          const newCountries = destinationCountries.filter((_, i) => i !== index)
                          setDestinationCountries(newCountries)
                        }}
                        aria-label={t('common.remove', 'Remove')}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-country-btn"
                    onClick={() => {
                      const newCountry = prompt(t('travel.documents.aiHelper.addCountryPrompt', 'Enter country name:'))
                      if (newCountry?.trim()) {
                        setDestinationCountries([...destinationCountries, newCountry.trim()])
                      }
                    }}
                  >
                    <FiPlus size={14} />
                    <span>{t('travel.documents.aiHelper.addCountry', 'Add country')}</span>
                  </button>
                </div>
                <p className="form-hint">
                  {t(
                    'travel.documents.aiHelper.multiCityHint',
                    'This is a multi-city trip. Add or remove countries as needed.'
                  )}
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label>
                  {t(
                    'travel.documents.aiHelper.destinationCountry',
                    'Destination country'
                  )}
                </label>
                <input
                  type="text"
                  value={destinationCountries[0] || ''}
                  onChange={(e) => setDestinationCountries([e.target.value])}
                  placeholder={t(
                    'travel.documents.aiHelper.destinationPlaceholder',
                    'e.g., Japan'
                  )}
                />
              </div>
            )}
          </div>

          {/* AI provider selection – dropdown keeps the most popular provider first */}
          <div className="form-group">
            <label>
              {t(
                'travel.documents.aiHelper.providerLabel',
                'Send this question to'
              )}
            </label>
            <div className="ai-provider-select-wrapper">
              <select
                className="ai-provider-select"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {t(
                      `travel.documents.aiHelper.provider.${provider.id}`,
                      provider.id === 'chatgpt'
                        ? 'ChatGPT'
                        : provider.id === 'claude'
                        ? 'Claude'
                        : provider.id === 'gemini'
                        ? 'Gemini'
                        : provider.id === 'perplexity'
                        ? 'Perplexity'
                        : provider.id === 'copilot'
                        ? 'Copilot'
                        : provider.id
                    )}
                  </option>
                ))}
              </select>
              <p className="ai-provider-hint">
                {t(
                  'travel.documents.aiHelper.providerHint',
                  'Opens in a new tab with your question prefilled.'
                )}
              </p>

              {/* Visual provider cards with soft-tech logos.
                 These mirror the select value for accessibility but give a richer UI. */}
              <div className="ai-provider-choices">
                {providers.map((provider) => {
                  const isSelected = provider.id === selectedProviderId
                  const label = t(
                    `travel.documents.aiHelper.provider.${provider.id}`,
                    provider.id === 'chatgpt'
                      ? 'ChatGPT'
                      : provider.id === 'claude'
                      ? 'Claude'
                      : provider.id === 'gemini'
                      ? 'Gemini'
                      : provider.id === 'perplexity'
                      ? 'Perplexity'
                      : provider.id === 'copilot'
                      ? 'Copilot'
                      : provider.id
                  )

                  // Simple 2–3 letter monogram for logo circle
                  const initial =
                    provider.id === 'chatgpt'
                      ? 'GPT'
                      : provider.id === 'claude'
                      ? 'CL'
                      : provider.id === 'gemini'
                      ? 'GX'
                      : provider.id === 'perplexity'
                      ? 'PX'
                      : provider.id === 'copilot'
                      ? 'CO'
                      : 'AI'

                  return (
                    <button
                      key={provider.id}
                      type="button"
                      className={`ai-provider-card ${
                        isSelected ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedProviderId(provider.id)}
                    >
                      <span
                        className={`ai-provider-logo ai-provider-logo-${provider.id}`}
                        aria-hidden="true"
                      >
                        {initial}
                      </span>
                      <span className="ai-provider-name">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Prompt preview */}
          <div className="form-group">
            <label>
              {t(
                'travel.documents.aiHelper.promptPreview',
                'Preview of the question we will send'
              )}
            </label>
            <textarea
              value={promptText}
              onChange={handlePromptChange}
              rows={6}
              className="ai-helper-prompt-preview"
            />
            {/* Clipboard notification for providers that don't support URL prefilling */}
            {clipboardNotification && (
              <motion.div
                className="clipboard-notification"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <FiCheckCircle size={16} />
                <span>{clipboardNotification}</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="cancel-btn" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="travel-btn"
            disabled={isConfirmDisabled}
            onClick={handleRedirect}
          >
            {t(
              'travel.documents.aiHelper.askButton',
              'Open AI chat with this question'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default DocumentsPage
