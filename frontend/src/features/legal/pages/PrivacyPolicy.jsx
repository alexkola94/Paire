import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    const { t } = useTranslation();

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

    return (
        <motion.div 
            className="privacy-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
            >
                <Link to="/" className="privacy-back-link">
                    <FiArrowLeft style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {t('common.back')}
                </Link>
            </motion.div>

            <motion.header 
                className="privacy-header"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
            >
                <h1>{t('legal.privacyPolicy')}</h1>
                <p className="privacy-date">Last Updated: December 15, 2025</p>
            </motion.header>

            <motion.div 
                className="privacy-content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to Paire. We respect your privacy and are committed to protecting your personal data.
                        This privacy policy will inform you as to how we look after your personal data when you visit our website
                        and use our application, and tell you about your privacy rights and how the law protects you.
                    </p>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>2. The Data We Collect</h2>
                    <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                    <ul>
                        <li><strong>Identity Data:</strong> First name, last name, and display name.</li>
                        <li><strong>Contact Data:</strong> Email address.</li>
                        <li><strong>Financial Data:</strong> Bank account details (via Plaid), transaction history, and budget information.</li>
                        <li><strong>Technical Data:</strong> Internet protocol (IP) address, your login data, browser type and version.</li>
                    </ul>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>3. How We Use Your Data</h2>
                    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul>
                        <li>To provide the expense tracking and financial management services.</li>
                        <li>To verify your identity and enable secure authentication.</li>
                        <li>To manage your relationship with us.</li>
                        <li>To improve our website and services.</li>
                    </ul>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>4. Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
                        All financial data is encrypted at rest and in transit. We use bank-grade security protocols for all connections.
                    </p>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>5. Third-Party Services</h2>
                    <p>We use the following third-party services:</p>
                    <ul>
                        <li><strong>Supabase:</strong> For authentication and database hosting.</li>
                        <li><strong>Plaid:</strong> For secure bank account connectivity.</li>
                        <li><strong>OpenAI:</strong> For providing the financial chatbot assistant.</li>
                    </ul>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>6. Cookies</h2>
                    <p>
                        We use cookies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site.
                        We use both essential cookies (for authentication) and analytical cookies.
                    </p>
                </motion.section>

                <motion.section 
                    className="privacy-section"
                    variants={itemVariants}
                >
                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at: support@paire.app
                    </p>
                </motion.section>
            </motion.div>
        </motion.div>
    );
};

export default PrivacyPolicy;
