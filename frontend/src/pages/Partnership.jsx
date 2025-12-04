import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiUsers, FiUserPlus, FiUserX, FiMail, FiCalendar, FiTrendingUp, FiSearch } from 'react-icons/fi'
import { partnershipService, profileService } from '../services/api'
import { supabase } from '../services/supabase'
import { format } from 'date-fns'
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

  /**
   * Load partnership data on mount
   */
  useEffect(() => {
    loadPartnership()
  }, [])

  /**
   * Fetch current user and partnership
   */
  const loadPartnership = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Get user's profile
      const profile = await profileService.getProfile(user.id)
      if (!profile || !profile.display_name) {
        setMessage({ 
          type: 'warning', 
          text: t('partnership.needDisplayName')
        })
      }

      // Get partnership
      const partnershipData = await partnershipService.getMyPartnership()
      setPartnership(partnershipData)

      if (partnershipData) {
        // Determine which user is the partner
        const isUser1 = partnershipData.user1_id === user.id
        const partner = isUser1 ? partnershipData.user2 : partnershipData.user1
        setPartnerProfile(partner)
      }
    } catch (error) {
      console.error('Error loading partnership:', error)
      setMessage({ type: 'error', text: t('partnership.loadError') })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle partner invitation
   */
  const handleInvitePartner = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Validate email
      if (!partnerEmail || !partnerEmail.includes('@')) {
        setMessage({ type: 'error', text: t('partnership.invalidEmail') })
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

      // Find partner by email
      const partnerUser = await partnershipService.findUserByEmail(partnerEmail)
      
      if (!partnerUser) {
        setMessage({ 
          type: 'error', 
          text: t('partnership.userNotFound') 
        })
        return
      }

      if (partnerUser.id === currentUser.id) {
        setMessage({ 
          type: 'error', 
          text: t('partnership.cannotInviteSelf') 
        })
        return
      }

      // Create partnership
      await partnershipService.createPartnership(partnerUser.id)

      setMessage({ 
        type: 'success', 
        text: t('partnership.inviteSuccess') 
      })
      setShowInviteForm(false)
      setPartnerEmail('')
      
      // Reload partnership
      await loadPartnership()
    } catch (error) {
      console.error('Error inviting partner:', error)
      setMessage({ 
        type: 'error', 
        text: error.message || t('partnership.inviteError') 
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Handle disconnecting partnership
   */
  const handleDisconnect = async () => {
    if (!confirm(t('partnership.confirmDisconnect'))) {
      return
    }

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
        <div className="spinner"></div>
        <p>{t('common.loading')}</p>
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
              onClick={handleDisconnect}
              className="btn btn-danger"
              disabled={saving}
            >
              <FiUserX size={18} />
              {t('partnership.disconnect')}
            </button>
          </div>
        </div>
      ) : (
        /* No Partnership - Invite Form */
        <div className="card no-partnership-card">
          <div className="no-partnership-content">
            <div className="no-partnership-icon">
              <FiUsers size={64} />
            </div>
            <h2>{t('partnership.noPartnership')}</h2>
            <p>{t('partnership.noPartnershipDescription')}</p>

            {!showInviteForm ? (
              <button
                onClick={() => setShowInviteForm(true)}
                className="btn btn-primary"
              >
                <FiUserPlus size={20} />
                {t('partnership.invitePartner')}
              </button>
            ) : (
              <form onSubmit={handleInvitePartner} className="invite-form">
                <div className="form-group">
                  <label htmlFor="partner-email">
                    <FiMail size={18} />
                    {t('partnership.partnerEmail')}
                  </label>
                  <div className="input-with-icon">
                    <FiSearch className="input-icon" />
                    <input
                      type="email"
                      id="partner-email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder={t('partnership.emailPlaceholder')}
                      required
                      disabled={saving}
                    />
                  </div>
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
            )}
          </div>
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
    </div>
  )
}

export default Partnership

