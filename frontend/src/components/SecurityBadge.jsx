import { Link } from 'react-router-dom';
import { FiShield, FiAlertCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useCurrentUser from '../hooks/useCurrentUser';
import './SecurityBadge.css';

/**
 * Security Badge Component
 * Small inline security indicator for the dashboard header
 * Uses useCurrentUser hook to reactively update when 2FA status changes
 */
const SecurityBadge = () => {
  const { t } = useTranslation();
  // Use the hook to stay in sync with user updates (including 2FA changes)
  const user = useCurrentUser();
  
  // Check if 2FA is enabled
  const has2FA = user?.twoFactorEnabled || false;

  if (has2FA) {
    // Strong security - 2FA enabled
    return (
      <Link to="/profile" className="security-badge badge-strong" title={t('security.strongDescription')}>
        <FiShield size={16} />
        <span>{t('security.protected')}</span>
      </Link>
    );
  }

  // Weak security - No 2FA
  return (
    <Link to="/profile" className="security-badge badge-weak" title={t('security.weakDescription')}>
      <FiAlertCircle size={16} />
      <span>{t('security.notProtected')}</span>
    </Link>
  );
};

export default SecurityBadge;

