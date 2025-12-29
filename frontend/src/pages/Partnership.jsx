import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiUserPlus, FiUserX, FiMail, FiCalendar, FiTrendingUp, FiX } from 'react-icons/fi'
import { partnershipService, profileService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { format } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import LogoLoader from '../components/LogoLoader'

import './Partnership.css'

/**
 * Partnership Management Page Component
 * Allows users to create, view, and manage partnerships
 */
function Partnership() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [partnerships, setPartnerships] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [disconnectModal, setDisconnectModal] = useState({ isOpen: false, partnershipId: null })

  /**
   * Load partnership data on mount
   */
  useEffect(() => {
    loadPartnership()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetch current user and partnership
   */
  const loadPartnership = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })

      // Get current user
      const user = getStoredUser()
      setCurrentUser(user)

      // Get user's profile
      const profile = await profileService.getProfile(user.id)
      if (!profile || !profile.display_name) {
        setMessage({
          type: 'warning',
          text: t('partnership.needDisplayName')
        })
      }

      // Get partnerships
      const partnershipsData = await partnershipService.getMyPartnerships()

      const processedPartnerships = (partnershipsData || []).map(p => {
        const isUser1 = p.user1_id === user.id
        return {
          ...p,
          partner: isUser1 ? p.user2 : p.user1
        }
      })

      setPartnerships(processedPartnerships)

      // Get pending invitations
      try {
        const invitations = await partnershipService.getPendingInvitations()
        setPendingInvitations(invitations || [])
      } catch (error) {
        console.error('Error loading pending invitations:', error)
        // Don't show error - just no invitations
        setPendingInvitations([])
      }
    } catch (error) {
      console.error('Error loading partnership:', error)
      setMessage({ type: 'error', text: t('partnership.loadError') })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Handle partner invitation
   */
  const handleInvitePartner = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Validate email format
      const trimmedEmail = partnerEmail.trim().toLowerCase()
      if (!trimmedEmail || !validateEmail(trimmedEmail)) {
        setMessage({ type: 'error', text: t('partnership.invalidEmail') })
        return
      }

      // Check if user is trying to invite themselves
      if (trimmedEmail === currentUser.email?.toLowerCase()) {
        setMessage({
          type: 'error',
          text: t('partnership.cannotInviteSelf')
        })
        return
      }

      // Check if user has set display name
      const currentProfile = await profileService.getProfile(currentUser.id)
      if (!currentProfile || !currentProfile.display_name) {
        setMessage({
          type: 'error',
          text: t('partnership.setDisplayNameFirst')
        })
        return
      }

      // Send invitation email
      await partnershipService.sendInvitation(trimmedEmail)

      setMessage({
        type: 'success',
        text: 'Invitation sent successfully!'
      })
      setShowInviteForm(false)
      setPartnerEmail('')
      // Reload pending invitations in case it appears there? (Usually outgoing invitations are not shown in this list, only incoming, but good practice if we change that)

    } catch (error) {
      console.error('Error inviting partner:', error)
      let errorMessage = t('partnership.inviteError')

      // Parse error message if available
      try {
        const errorData = JSON.parse(error.message)
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = error.message || errorMessage
      }

      setMessage({
        type: 'error',
        text: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle accepting a pending invitation
   */
  const handleAcceptInvitation = async (token) => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      await partnershipService.acceptInvitation(token)

      setMessage({
        type: 'success',
        text: t('partnership.inviteAccepted') || 'Partnership invitation accepted successfully!'
      })

      // Reload partnership to show the new partnership
      await loadPartnership()
    } catch (error) {
      console.error('Error accepting invitation:', error)
      let errorMessage = t('partnership.inviteAcceptError') || 'Failed to accept invitation'

      try {
        const errorData = JSON.parse(error.message)
        errorMessage = errorData.message || errorMessage
      } catch {
        errorMessage = error.message || errorMessage
      }

      setMessage({
        type: 'error',
        text: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Open disconnect confirmation modal
   */
  const openDisconnectModal = (partnershipId) => {
    setDisconnectModal({ isOpen: true, partnershipId })
  }

  /**
   * Close disconnect confirmation modal
   */
  const closeDisconnectModal = () => {
    setDisconnectModal({ isOpen: false, partnershipId: null })
  }

  /**
   * Handle disconnecting partnership
   */
  const handleDisconnect = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      if (disconnectModal.partnershipId) {
        await partnershipService.endPartnership(disconnectModal.partnershipId)

        setMessage({
          type: 'success',
          text: t('partnership.disconnectSuccess')
        })

        // Reload partnership
        await loadPartnership()
      }

      closeDisconnectModal()
    } catch (error) {
      console.error('Error disconnecting partnership:', error)
      setMessage({
        type: 'error',
        text: t('partnership.disconnectError')
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <LogoLoader size="medium" />
      </div>
    )
  }

  return (
    <div className="partnership-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>
          <FiUsers size={32} />
          {t('partnership.title')}
        </h1>
        <p className="page-subtitle">{t('partnership.subtitle')}</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Current Partnerships List */}
      <div className="partnerships-list">
        {partnerships.map(partnership => (
          <div key={partnership.id} className="card partnership-card">
            <div className="partnership-header">
              <h2>{t('partnership.currentPartner')}</h2>
              <span className="partnership-status active">
                {t('partnership.active')}
              </span>
            </div>

            <div className="partner-info">
              {/* Partner Avatar */}
              <div className="partner-avatar">
                {partnership.partner?.avatar_url ? (
                  <img src={partnership.partner.avatar_url} alt={partnership.partner.display_name} />
                ) : (
                  <div className="avatar-placeholder">
                    <FiUsers size={48} />
                  </div>
                )}
              </div>

              {/* Partner Details */}
              <div className="partner-details">
                <h3>{partnership.partner?.display_name || t('partnership.noName')}</h3>

                <div className="partner-meta">
                  <div className="meta-item">
                    <FiMail size={16} />
                    <span>{partnership.partner?.email}</span>
                  </div>

                  {partnership.created_at && (
                    <div className="meta-item">
                      <FiCalendar size={16} />
                      <span>
                        {t('partnership.since')} {format(new Date(partnership.created_at), 'MMM dd, yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                <p className="partner-description">
                  {t('partnership.sharedDataInfo')}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="partnership-actions">
              <button
                onClick={() => openDisconnectModal(partnership.id)}
                className="btn btn-danger"
                disabled={saving}
              >
                <FiUserX size={18} />
                {t('partnership.disconnect')}
              </button>
            </div>
          </div>
        ))}

        {partnerships.length === 0 && !showInviteForm && (
          <div className="card no-partnership-card">
            <div className="no-partnership-content">
              <div className="no-partnership-icon">
                <FiUsers size={64} />
              </div>
              <h2>{t('partnership.noPartnership')}</h2>
              <p>{t('partnership.noPartnershipDescription')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations && pendingInvitations.length > 0 && (
        <div className="card pending-invitations-card">
          <h2>{t('partnership.pendingInvitations') || 'Pending Invitations'}</h2>
          {pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="pending-invitation-item">
              <div className="invitation-info">
                <p>
                  <strong>{invitation.inviterName}</strong> ({invitation.inviterEmail})
                  {' '}{t('partnership.invitedYou') || 'has invited you to become their financial partner.'}
                </p>
                {invitation.expiresAt && (
                  <small className="invitation-expiry">
                    {t('partnership.expiresOn') || 'Expires on'}: {format(new Date(invitation.expiresAt), 'MMM dd, yyyy')}
                  </small>
                )}
              </div>
              <div className="invitation-actions">
                <button
                  onClick={() => handleAcceptInvitation(invitation.token)}
                  className="btn btn-primary"
                  disabled={saving || invitation.isExpired}
                >
                  <FiUserPlus size={18} />
                  {t('partnership.acceptInvitation') || 'Accept Invitation'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Partner Button (if not already showing form) */}
      {!showInviteForm && (
        <div className="actions-bar" style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setShowInviteForm(true)}
            className="btn btn-primary"
          >
            <FiUserPlus size={20} />
            {t('partnership.invitePartner')}
          </button>
        </div>
      )}

      {/* Partnership Benefits */}
      <div className="card benefits-card">
        <h2>
          <FiTrendingUp size={24} />
          {t('partnership.benefits')}
        </h2>
        <ul className="benefits-list">
          <li>{t('partnership.benefit1')}</li>
          <li>{t('partnership.benefit2')}</li>
          <li>{t('partnership.benefit3')}</li>
          <li>{t('partnership.benefit4')}</li>
        </ul>
      </div>
      {/* Invite Form Modal */}
      <Modal
        isOpen={showInviteForm}
        onClose={() => {
          setShowInviteForm(false)
          setPartnerEmail('')
        }}
        title={t('partnership.invitePartner')}
      >
        <form onSubmit={handleInvitePartner} className="invite-form">
          <div className="form-group">
            <label htmlFor="partner-email">
              <FiMail size={18} />
              {t('partnership.partnerEmail')}
            </label>
            <input
              type="email"
              id="partner-email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder={t('partnership.emailPlaceholder')}
              required
              autoComplete="email"
              disabled={saving}
            />
            <small className="form-hint">
              {t('partnership.emailHint')}
            </small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false)
                setPartnerEmail('')
              }}
              className="btn btn-secondary"
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !partnerEmail}
            >
              <FiUserPlus size={18} />
              {saving ? t('common.saving') : t('partnership.sendInvite')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Disconnect Confirmation Modal */}
      <ConfirmationModal
        isOpen={disconnectModal.isOpen}
        onClose={closeDisconnectModal}
        onConfirm={handleDisconnect}
        title={t('partnership.disconnectTitle')}
        message={t('partnership.confirmDisconnect')}
        confirmText={t('partnership.disconnect')}
        loading={saving}
        variant="warning"
      />
    </div>
  )
}

export default Partnership

