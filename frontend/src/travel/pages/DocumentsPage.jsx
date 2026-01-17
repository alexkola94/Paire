import { useState, useEffect } from 'react'
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
  FiHash
} from 'react-icons/fi'
import { documentService } from '../services/travelApi'
import { DOCUMENT_TYPES } from '../utils/travelConstants'
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

/**
 * Documents Page Component
 * Document vault for storing travel document info
 */
const DocumentsPage = ({ trip }) => {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)

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

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {})

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

  // Add document
  const handleAddDocument = async (docData) => {
    try {
      const newDoc = await documentService.create(trip.id, docData)
      setDocuments(prev => [...prev, newDoc])
      setShowAddModal(false)
      setEditingDocument(null)
    } catch (error) {
      console.error('Error adding document:', error)
    }
  }

  // Update document
  const handleUpdateDocument = async (docData) => {
    try {
      await documentService.update(trip.id, editingDocument.id, docData)
      setDocuments(prev => prev.map(d => d.id === editingDocument.id ? { ...d, ...docData } : d))
      setShowAddModal(false)
      setEditingDocument(null)
    } catch (error) {
      console.error('Error updating document:', error)
    }
  }

  // Delete document
  const handleDeleteDocument = async (docId) => {
    try {
      await documentService.delete(trip.id, docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
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

  return (
    <div className="documents-page">
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
        </div>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          <FiPlus size={20} />
        </button>
      </div>

      {/* Document sections by type */}
      <div className="documents-sections">
        {Object.entries(DOCUMENT_TYPES).map(([key, type]) => {
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

      {/* Add/Edit Document Modal */}
      <AnimatePresence>
        {showAddModal && (
          <DocumentFormModal
            document={editingDocument}
            onClose={() => {
              setShowAddModal(false)
              setEditingDocument(null)
            }}
            onSave={editingDocument?.id ? handleUpdateDocument : handleAddDocument}
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
const DocumentFormModal = ({ document, onClose, onSave }) => {
  const { t } = useTranslation()
  
  // Register modal to hide bottom navigation
  useModalRegistration(true)
  
  const [formData, setFormData] = useState({
    type: document?.type || 'passport',
    name: document?.name || '',
    documentNumber: document?.documentNumber || '',
    expiryDate: document?.expiryDate || '',
    notes: document?.notes || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    onSave(formData)
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

          {/* Document Number */}
          <div className="form-group">
            <label>{t('travel.documents.documentNumber', 'Document/Reference Number')}</label>
            <input
              type="text"
              value={formData.documentNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
              placeholder={t('travel.documents.numberPlaceholder', 'Optional')}
            />
          </div>

          {/* Expiry Date */}
          <div className="form-group">
            <label>{t('travel.documents.expiryDate', 'Expiry Date')}</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
            />
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

export default DocumentsPage
