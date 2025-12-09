import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { partnershipService } from '../services/api'
import { getStoredUser } from '../services/auth'
import { FiCheckCircle, FiLoader } from 'react-icons/fi'
import './AcceptInvitation.css'

/**
 * Accept Invitation Landing Page
 * Redirects users to login page - they can accept invitations on Partnership page after login
 */
function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState('loading') // loading, success
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      loadInvitation()
    } else {
      // No token - redirect to login
      const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    }
  }, [token])

  /**
   * Load invitation details
   * Simply redirects to login page - user can accept invitation on Partnership page after login
   */
  const loadInvitation = async () => {
    try {
      setLoading(true)
      
      // Check if user is logged in
      const currentUser = getStoredUser()
      if (currentUser) {
        // User is logged in - try to get invitation details to check if valid
        try {
          const invitationData = await partnershipService.getInvitationDetails(token)
          
          // If invitation is valid and user email matches, accept it immediately
          if (!invitationData.isExpired && 
              invitationData.status === 'pending' &&
              currentUser.email?.toLowerCase() === invitationData.inviteeEmail.toLowerCase()) {
            await acceptInvitation()
            return
          }
        } catch (error) {
          // If invitation is invalid/expired, just redirect to partnership page
          // User can see any valid pending invitations there
          console.log('Invitation check failed, redirecting to partnership page')
        }
        
        // Redirect to partnership page where user can see pending invitations
        const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
        window.location.href = `${basename}/partnership`
        return
      }
      
      // User not logged in - redirect to login page
      // After login, they can go to Partnership page to accept
      const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    } catch (error) {
      console.error('Error loading invitation:', error)
      // On any error, just redirect to login
      const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    } finally {
      setLoading(false)
    }
  }

  /**
   * Accept the invitation (only called if user is logged in and invitation is valid)
   */
  const acceptInvitation = async () => {
    try {
      setProcessing(true)
      await partnershipService.acceptInvitation(token)
      
      setStatus('success')
      setMessage('Partnership created successfully!')
      
      // Redirect to partnership page after 2 seconds
      setTimeout(() => {
        const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
        window.location.href = `${basename}/partnership`
      }, 2000)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      // On error, redirect to partnership page where user can see pending invitations
      const basename = import.meta.env.MODE === 'production' ? '/You-me-Expenses' : ''
      window.location.href = `${basename}/partnership`
    } finally {
      setProcessing(false)
    }
  }

  // Show loading state while redirecting
  return (
    <div className="accept-invitation-container">
      <div className="accept-invitation-card">
        {status === 'success' ? (
          <>
            <FiCheckCircle className="status-icon success" />
            <h1>Partnership Accepted!</h1>
            <p>{message}</p>
            <p className="redirect-message">Redirecting to partnership page...</p>
          </>
        ) : (
          <>
            <FiLoader className="loading-spinner" />
            <h2>Redirecting to login...</h2>
            <p>Please log in to accept the partnership invitation.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default AcceptInvitation

