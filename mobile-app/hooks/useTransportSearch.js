/**
 * Hook that orchestrates transport price search per leg.
 * Calls Amadeus for flights, FlixBus/RapidAPI for buses.
 * Ferries skip API (deep links only). Silent fallback on any error.
 */

import { useState, useEffect, useRef } from 'react';
import { searchFlights } from '../services/amadeusService';
import { searchBusRoutes } from '../services/flixbusService';
import { buildCacheKey, getCached, setCached } from '../services/transportSearchCache';

/**
 * Normalize a date value to YYYY-MM-DD.
 */
function toYMD(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {{ from?: string, to?: string, startDate?: string, transportMode?: string }} leg
 * @returns {{ offers: Array, loading: boolean, error: null }}
 */
export default function useTransportSearch(leg) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(false);

  const mode = (leg?.transportMode && String(leg.transportMode).toLowerCase()) || '';
  const from = leg?.from || '';
  const to = leg?.to || '';
  const date = toYMD(leg?.startDate);

  useEffect(() => {
    abortRef.current = false;

    // Only search for flight or bus modes
    if (mode !== 'flight' && mode !== 'bus') {
      setOffers([]);
      setLoading(false);
      return;
    }

    // Need all three fields
    if (!from || !to || !date) {
      setOffers([]);
      setLoading(false);
      return;
    }

    const cacheKey = buildCacheKey(mode, from, to, date);
    const cached = getCached(cacheKey);
    if (cached) {
      setOffers(cached);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const doSearch = async () => {
      try {
        let results = [];
        if (mode === 'flight') {
          results = await searchFlights(from, to, date);
        } else if (mode === 'bus') {
          results = await searchBusRoutes(from, to, date);
        }
        if (active && !abortRef.current) {
          setCached(cacheKey, results);
          setOffers(results);
        }
      } catch {
        // Silent fallback
      } finally {
        if (active && !abortRef.current) {
          setLoading(false);
        }
      }
    };

    doSearch();

    return () => {
      active = false;
      abortRef.current = true;
    };
  }, [mode, from, to, date]);

  return { offers, loading, error: null };
}
