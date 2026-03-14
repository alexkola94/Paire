import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const CookieConsent = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check local storage for consent
        const consent = localStorage.getItem('cookieConsent');
        if (consent === null) {
            // Small delay to prevent flashing on load
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'true');
        setIsVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'false');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="cookie-consent-banner" role="region" aria-label="Cookie Consent">
            <div className="cookie-content">
                <div className="cookie-message">
                    <p>
                        {t('legal.cookieConsent.message')}{' '}
                        <Link to="/privacy" aria-label={t('legal.cookieConsent.moreInfo')}>
                            {t('legal.cookieConsent.moreInfo')}
                        </Link>
                    </p>
                </div>
                <div className="cookie-actions">
                    <button
                        className="cookie-btn cookie-btn-decline"
                        onClick={handleDecline}
                    >
                        {t('legal.cookieConsent.decline')}
                    </button>
                    <button
                        className="cookie-btn cookie-btn-accept"
                        onClick={handleAccept}
                    >
                        {t('legal.cookieConsent.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
