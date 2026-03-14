/**
 * TransportSearchResults – list of transport options (flights/bus) with price, duration, and Book link.
 * Used by TransportBookingStep when "Search prices" returns API results.
 */

import { useTranslation } from 'react-i18next'
import { FiExternalLink } from 'react-icons/fi'
import '../styles/TransportBookingStep.css'

/**
 * Format duration minutes to "Xh Ym" or "Xm"
 */
const formatDuration = (minutes) => {
  if (minutes == null || minutes < 0) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/**
 * @param {{ results: Array<{ id: string, price?: number, currency?: string, durationMinutes?: number, bookUrl?: string, provider?: string }>, onBook: (url: string) => void, loading?: boolean, error?: string }} props
 */
export default function TransportSearchResults ({ results = [], onBook, loading = false, error = '' }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="transport-results transport-results-loading">
        <span className="transport-origin-spinner" />
        <span>{t('travel.transportBooking.searching', 'Searching...')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="transport-results transport-results-error">
        <span>{t('travel.transportBooking.searchUnavailable', 'Search unavailable; open in new tab instead.')}</span>
        {error && <span className="transport-results-error-detail">{error}</span>}
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="transport-results transport-results-empty">
        {t('travel.transportBooking.noResults', 'No results. Try different dates or open in new tab.')}
      </div>
    )
  }

  return (
    <ul className="transport-results-list">
      {results.map((item) => (
        <li key={item.id} className="transport-results-item">
          <div className="transport-results-item-info">
            <span className="transport-results-price">
              {item.price != null && item.price > 0
                ? `${item.currency || 'EUR'} ${Number(item.price).toFixed(0)}`
                : '—'}
            </span>
            <span className="transport-results-duration">
              {formatDuration(item.durationMinutes ?? item.duration?.total)}
            </span>
            {item.provider && (
              <span className="transport-results-provider">{item.provider}</span>
            )}
          </div>
          {item.bookUrl && (
            <button
              type="button"
              className="transport-cta-link transport-results-book"
              onClick={() => onBook(item.bookUrl)}
            >
              {t('travel.transportBooking.book', 'Book')}
              <FiExternalLink size={12} />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
