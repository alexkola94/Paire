import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiUserPlus, FiUserX, FiMail, FiCalendar, FiTrendingUp, FiX } from 'react-icons/fi'
import { partnershipService, profileService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { format } from 'date-fns'
import ConfirmationModal from '../components/ConfirmationModal'
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
  const [partnership, setPartnership] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [partnerProfile, setPartnerProfile] = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [pendingInvitations, setPendingInvitations] = useState([])
  const [disconnectModal, setDisconnectModal] = useState({ isOpen: false })

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

      // Get partnership - null is a valid state (no partnership exists)
      const partnershipData = await partnershipService.getMyPartnership()
      setPartnership(partnershipData)

      if (partnershipData) {
        // Determine which user is the partner
        const isUser1 = partnershipData.user1_id === user.id
        const partner = isUser1 ? partnershipData.user2 : partnershipData.user1
        setPartnerProfile(partner)
      } else {
        // If no partnership, check for pending invitations
        try {
          const invitations = await partnershipService.getPendingInvitations()
          setPendingInvitations(invitations || [])
        } catch (error) {
          console.error('Error loading pending invitations:', error)
          // Don't show error - just no invitations
          setPendingInvitations([])
        }
      }
      // If partnershipData is null, the UI will show the "No Partnership" state or pending invitations
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
        text: t('partnership.inviteSentSuccess') || 'Invitation sent successfully! The recipient will receive an email with instructions to accept.'
      })
      setShowInviteForm(false)
      setPartnerEmail('')

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
  const openDisconnectModal = () => {
    setDisconnectModal({ isOpen: true })
  }

  /**
   * Close disconnect confirmation modal
   */
  const closeDisconnectModal = () => {
    setDisconnectModal({ isOpen: false })
  }

  /**
   * Handle disconnecting partnership
   */
  const handleDisconnect = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      await partnershipService.endPartnership(partnership.id)

      setMessage({
        type: 'success',
        text: t('partnership.disconnectSuccess')
      })

      // Reload partnership
      await loadPartnership()
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

      {/* Current Partnership */}
      {partnership && partnerProfile ? (
        <div className="card partnership-card">
          <div className="partnership-header">
            <h2>{t('partnership.currentPartner')}</h2>
            <span className="partnership-status active">
              {t('partnership.active')}
            </span>
          </div>

          <div className="partner-info">
            {/* Partner Avatar */}
            <div className="partner-avatar">
              {partnerProfile.avatar_url ? (
                <img src={partnerProfile.avatar_url} alt={partnerProfile.display_name} />
              ) : (
                <div className="avatar-placeholder">
                  <FiUsers size={48} />
                </div>
              )}
            </div>

            {/* Partner Details */}
            <div className="partner-details">
              <h3>{partnerProfile.display_name || t('partnership.noName')}</h3>

              <div className="partner-meta">
                <div className="meta-item">
                  <FiMail size={16} />
                  <span>{partnerProfile.email}</span>
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
              onClick={openDisconnectModal}
              className="btn btn-danger"
              disabled={saving}
            >
              <FiUserX size={18} />
              {t('partnership.disconnect')}
            </button>
          </div>
        </div>
      ) : (
        <>
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

          {/* No Partnership - Invite Form */}
          <div className="card no-partnership-card">
            <div className="no-partnership-content">
              <div className="no-partnership-icon">
                <FiUsers size={64} />
              </div>
              <h2>{t('partnership.noPartnership')}</h2>
              <p>{t('partnership.noPartnershipDescription')}</p>

              {!showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="btn btn-primary"
                >
                  <FiUserPlus size={20} />
                  {t('partnership.invitePartner')}
                </button>
              )}
            </div>
          </div>
        </>
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

      {/* Help Section */}
      <div className="card help-card">
        <h3>{t('partnership.helpTitle')}</h3>
        <div className="help-content">
          <div className="help-item">
            <h4>{t('partnership.helpQ1')}</h4>
            <p>{t('partnership.helpA1')}</p>
          </div>
          <div className="help-item">
            <h4>{t('partnership.helpQ2')}</h4>
            <p>{t('partnership.helpA2')}</p>
          </div>
          <div className="help-item">
            <h4>{t('partnership.helpQ3')}</h4>
            <p>{t('partnership.helpA3')}</p>
          </div>
        </div>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="form-modal">
          <div className="card form-card">
            <div className="card-header form-header">
              <h2>{t('partnership.invitePartner')}</h2>
              <button
                className="form-close-btn"
                onClick={() => {
                  setShowInviteForm(false)
                  setPartnerEmail('')
                }}
                aria-label={t('common.close')}
                disabled={saving}
              >
                <FiX size={24} />
              </button>
            </div>

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
          </div>
        </div>
      )}

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

