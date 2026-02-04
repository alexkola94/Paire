/**
 * Kiwi Tequila API – flight search (mobile).
 * Env: EXPO_PUBLIC_KIWI_TEQUILA_API_KEY
 */

const TEQUILA_BASE = 'https://api.tequila.kiwi.com';
const API_KEY = process.env.EXPO_PUBLIC_KIWI_TEQUILA_API_KEY || '';

export const isKiwiTequilaEnabled = () => Boolean(API_KEY);

const toTequilaDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const searchLocations = async (term) => {
  if (!API_KEY || !term?.trim()) return [];
  const params = new URLSearchParams({ term: String(term).trim(), locale: 'en', limit: '10' });
  try {
    const res = await fetch(`${TEQUILA_BASE}/locations/query?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json', apikey: API_KEY },
    });
    if (!res.ok) throw new Error(`Kiwi locations: ${res.status}`);
    const data = await res.json();
    const locations = Array.isArray(data.locations) ? data.locations : [];
    return locations.map((loc) => ({
      id: loc.id || loc.code || '',
      code: loc.code || loc.id || '',
      name: loc.name || '',
      type: loc.type || 'unknown',
    }));
  } catch (err) {
    console.error('Kiwi Tequila searchLocations error:', err);
    return [];
  }
};

export const resolveToCode = async (name) => {
  if (!name) return '';
  const s = String(name).trim();
  if (s.length <= 4 && /^[A-Za-z]{3}$/.test(s)) return s.toUpperCase();
  const locations = await searchLocations(s);
  const airport = locations.find((l) => l.type === 'airport' || l.type === 'city');
  return airport ? (airport.code || airport.id) : (locations[0]?.code || locations[0]?.id || '');
};

export const searchFlights = async (params) => {
  if (!API_KEY) return [];
  const { flyFrom, flyTo, dateFrom, dateTo, returnFrom, returnTo, adults = 1 } = params || {};
  if (!flyFrom || !flyTo || !dateFrom) return [];

  const fromCode = await resolveToCode(flyFrom);
  const toCode = await resolveToCode(flyTo);
  if (!fromCode || !toCode) return [];

  const searchParams = new URLSearchParams({
    fly_from: fromCode,
    fly_to: toCode,
    date_from: toTequilaDate(dateFrom),
    date_to: toTequilaDate(dateTo || dateFrom),
    adults: String(adults),
    limit: '20',
    curr: 'EUR',
    sort: 'price',
  });
  if (returnFrom && returnTo) {
    searchParams.set('return_from', toTequilaDate(returnFrom));
    searchParams.set('return_to', toTequilaDate(returnTo));
    searchParams.set('flight_type', 'round');
  } else {
    searchParams.set('flight_type', 'oneway');
  }

  try {
    const res = await fetch(`${TEQUILA_BASE}/v2/search?${searchParams}`, {
      method: 'GET',
      headers: { Accept: 'application/json', apikey: API_KEY },
    });
    if (!res.ok) throw new Error(`Kiwi search: ${res.status}`);
    const data = await res.json();
    const raw = data.data || [];
    return raw.map((it) => ({
      id: it.id || `${it.price}-${it.duration?.total}-${Math.random().toString(36).slice(2)}`,
      price: Number(it.price) || 0,
      currency: data.currency || 'EUR',
      duration: { total: it.duration?.total || 0 },
      durationMinutes: it.duration?.total || 0,
      segments: it.route || [],
      bookUrl: it.deep_link || it.link || '',
      provider: 'kiwi',
    }));
  } catch (err) {
    console.error('Kiwi Tequila searchFlights error:', err);
    throw err;
  }
};
