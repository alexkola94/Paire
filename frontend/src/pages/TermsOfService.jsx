import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft } from 'react-icons/fi'
import './TermsOfService.css'

/**
 * Terms of Service page.
 * Legal terms users must accept when registering for Paire.
 */
const TermsOfService = () => {
  const { t } = useTranslation()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
    }
  }

  return (
    <motion.div
      className="terms-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Link to="/login?mode=signup" className="terms-back-link">
          <FiArrowLeft style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {t('common.back')}
        </Link>
      </motion.div>

      <motion.header
        className="terms-header"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <h1>{t('legal.termsOfService')}</h1>
        <p className="terms-date">{t('legal.termsLastUpdated', 'Last Updated: December 15, 2025')}</p>
      </motion.header>

      <motion.div
        className="terms-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section className="terms-section" variants={itemVariants}>
          <h2>1. {t('legal.terms.introTitle', 'Acceptance of Terms')}</h2>
          <p>
            {t('legal.terms.introBody', 'By creating an account and using Paire, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service.')}
          </p>
        </motion.section>

        <motion.section className="terms-section" variants={itemVariants}>
          <h2>2. {t('legal.terms.serviceTitle', 'Description of Service')}</h2>
          <p>
            {t('legal.terms.serviceBody', 'Paire is a financial management application for couples and individuals. It allows you to track expenses, income, budgets, loans, savings goals, and related financial data. The service is provided "as is" and we reserve the right to modify or discontinue features at any time.')}
          </p>
        </motion.section>

        <motion.section className="terms-section" variants={itemVariants}>
          <h2>3. {t('legal.terms.accountTitle', 'Account and Security')}</h2>
          <p>
            {t('legal.terms.accountBody', 'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must notify us immediately of any unauthorized use. We are not liable for any loss or damage arising from your failure to protect your account.')}
          </p>
        </motion.section>

        <motion.section className="terms-section" variants={itemVariants}>
          <h2>4. {t('legal.terms.conductTitle', 'Acceptable Use')}</h2>
          <p>
            {t('legal.terms.conductBody', 'You agree to use Paire only for lawful purposes and in accordance with these terms. You must not use the service to violate any laws, infringe others\' rights, or transmit harmful or offensive content. We may suspend or terminate accounts that violate these terms.')}
          </p>
        </motion.section>

        <motion.section className="terms-section" variants={itemVariants}>
          <h2>5. {t('legal.terms.dataTitle', 'Data and Privacy')}</h2>
          <p>
            {t('legal.terms.dataBody', 'Your use of Paire is also governed by our Privacy Policy. By agreeing to these terms, you consent to the collection and use of your data as described in the Privacy Policy. Financial data you enter remains yours; we use it only to provide and improve the service.')}
          </p>
        </motion.section>

        <motion.section className="terms-section" variants={itemVariants}>
          <h2>6. {t('legal.terms.contactTitle', 'Contact')}</h2>
          <p>
            {t('legal.terms.contactBody', 'If you have questions about these Terms of Service, please contact us at: support@paire.app')}
          </p>
        </motion.section>
      </motion.div>
    </motion.div>
  )
}

export default TermsOfService
