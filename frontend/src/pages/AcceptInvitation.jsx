import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  const [status, setStatus] = useState('loading') // loading, success
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      loadInvitation()
    } else {
      // No token - redirect to login
      const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load invitation details
   * Simply redirects to login page - user can accept invitation on Partnership page after login
   */
  const loadInvitation = async () => {
    try {


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
        const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
        window.location.href = `${basename}/partnership`
        return
      }

      // User not logged in - redirect to login page
      // After login, they can go to Partnership page to accept
      const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    } catch (error) {
      console.error('Error loading invitation:', error)
      // On any error, just redirect to login
      const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
      const partnershipPath = '/partnership'
      const loginPath = `/login?redirect=${encodeURIComponent(partnershipPath)}`
      window.location.href = `${basename}${loginPath}`
    }
  }

  /**
   * Accept the invitation (only called if user is logged in and invitation is valid)
   */
  const acceptInvitation = async () => {
    try {

      await partnershipService.acceptInvitation(token)

      setStatus('success')
      setMessage('Partnership created successfully!')

      // Redirect to partnership page after 2 seconds
      setTimeout(() => {
        const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
        window.location.href = `${basename}/partnership`
      }, 2000)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      // On error, redirect to partnership page where user can see pending invitations
      const basename = import.meta.env.MODE === 'production' ? '/Paire' : ''
      window.location.href = `${basename}/partnership`
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  // Show loading state while redirecting
  return (
    <div className="accept-invitation-container">
      <motion.div 
        className="accept-invitation-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {status === 'success' ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <FiCheckCircle className="status-icon success" />
            </motion.div>
            <motion.h1 variants={itemVariants}>Partnership Accepted!</motion.h1>
            <motion.p variants={itemVariants}>{message}</motion.p>
            <motion.p 
              className="redirect-message"
              variants={itemVariants}
            >
              Redirecting to partnership page...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <FiLoader className="loading-spinner" />
            </motion.div>
            <motion.h2 variants={itemVariants}>Redirecting to login...</motion.h2>
            <motion.p variants={itemVariants}>Please log in to accept the partnership invitation.</motion.p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default AcceptInvitation

