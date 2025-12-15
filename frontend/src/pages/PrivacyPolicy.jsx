
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
    const { t } = useTranslation();

    return (
        <div className="privacy-container">
            <Link to="/" className="privacy-back-link">
                <FiArrowLeft style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {t('common.back')}
            </Link>

            <header className="privacy-header">
                <h1>{t('legal.privacyPolicy')}</h1>
                <p className="privacy-date">Last Updated: December 15, 2025</p>
            </header>

            <div className="privacy-content">
                <section className="privacy-section">
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to Paire. We respect your privacy and are committed to protecting your personal data.
                        This privacy policy will inform you as to how we look after your personal data when you visit our website
                        and use our application, and tell you about your privacy rights and how the law protects you.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>2. The Data We Collect</h2>
                    <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:</p>
                    <ul>
                        <li><strong>Identity Data:</strong> First name, last name, and display name.</li>
                        <li><strong>Contact Data:</strong> Email address.</li>
                        <li><strong>Financial Data:</strong> Bank account details (via Plaid), transaction history, and budget information.</li>
                        <li><strong>Technical Data:</strong> Internet protocol (IP) address, your login data, browser type and version.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2>3. How We Use Your Data</h2>
                    <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                    <ul>
                        <li>To provide the expense tracking and financial management services.</li>
                        <li>To verify your identity and enable secure authentication.</li>
                        <li>To manage your relationship with us.</li>
                        <li>To improve our website and services.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2>4. Data Security</h2>
                    <p>
                        We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
                        All financial data is encrypted at rest and in transit. We use bank-grade security protocols for all connections.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>5. Third-Party Services</h2>
                    <p>We use the following third-party services:</p>
                    <ul>
                        <li><strong>Supabase:</strong> For authentication and database hosting.</li>
                        <li><strong>Plaid:</strong> For secure bank account connectivity.</li>
                        <li><strong>OpenAI:</strong> For providing the financial chatbot assistant.</li>
                    </ul>
                </section>

                <section className="privacy-section">
                    <h2>6. Cookies</h2>
                    <p>
                        We use cookies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site.
                        We use both essential cookies (for authentication) and analytical cookies.
                    </p>
                </section>

                <section className="privacy-section">
                    <h2>7. Contact Us</h2>
                    <p>
                        If you have any questions about this privacy policy or our privacy practices, please contact us at: support@paire.app
                    </p>
                </section>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
