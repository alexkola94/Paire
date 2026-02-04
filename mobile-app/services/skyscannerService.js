/**
 * Skyscanner Flights Live Prices API – mobile.
 * Env: EXPO_PUBLIC_SKYSCANNER_API_KEY or EXPO_PUBLIC_RAPIDAPI_KEY + EXPO_PUBLIC_RAPIDAPI_SKYSCANNER_HOST
 */

const PARTNER_BASE = 'https://partners.api.skyscanner.net/apiservices/v3/flights/live/search';
const API_KEY = process.env.EXPO_PUBLIC_SKYSCANNER_API_KEY || '';
const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';
const RAPIDAPI_SKY_HOST = process.env.EXPO_PUBLIC_RAPIDAPI_SKYSCANNER_HOST || '';
const useRapidAPI = Boolean(RAPIDAPI_KEY && RAPIDAPI_SKY_HOST);

const CITY_TO_IATA = {
  athens: 'ATH', piraeus: 'ATH', kallithea: 'ATH', thessaloniki: 'SKG',
  santorini: 'JTR', thira: 'JTR', mykonos: 'JMK', naxos: 'NAX', paros: 'PAS',
  london: 'LON', paris: 'PAR', rome: 'FCO', milan: 'MIL', napoli: 'NAP', naples: 'NAP',
  newyork: 'NYC', berlin: 'BER', amsterdam: 'AMS', madrid: 'MAD', barcelona: 'BCN',
};
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');

export const resolveToIata = (name) => {
  if (!name) return '';
  const t = String(name).trim().toUpperCase();
  if (t.length === 3) return t;
  const key = slug(name).split('-')[0];
  return CITY_TO_IATA[key] || '';
};

export const isSkyscannerEnabled = () => Boolean(API_KEY || (useRapidAPI && RAPIDAPI_KEY));

export const createSearch = async (params) => {
  const key = useRapidAPI ? RAPIDAPI_KEY : API_KEY;
  if (!key) throw new Error('Skyscanner API key not configured');
  const { originIata, destinationIata, outboundDate, returnDate, adults = 1 } = params || {};
  if (!originIata || !destinationIata || !outboundDate) throw new Error('Missing origin, destination or outbound date');

  const [outY, outM, outD] = outboundDate.split('-').map(Number);
  const queryLegs = [
    {
      originPlaceId: { iata: originIata.toUpperCase() },
      destinationPlaceId: { iata: destinationIata.toUpperCase() },
      date: { year: outY, month: outM, day: outD },
    },
  ];
  if (returnDate) {
    const [retY, retM, retD] = returnDate.split('-').map(Number);
    queryLegs.push({
      originPlaceId: { iata: destinationIata.toUpperCase() },
      destinationPlaceId: { iata: originIata.toUpperCase() },
      date: { year: retY, month: retM, day: retD },
    });
  }

  const body = {
    query: {
      market: 'UK',
      locale: 'en-GB',
      currency: 'EUR',
      queryLegs,
      adults: Number(adults) || 1,
      cabinClass: 'CABIN_CLASS_ECONOMY',
    },
  };

  const url = useRapidAPI ? `https://${RAPIDAPI_SKY_HOST}/flights/live/search/create` : `${PARTNER_BASE}/create`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (useRapidAPI) {
    headers['x-rapidapi-host'] = RAPIDAPI_SKY_HOST;
    headers['x-rapidapi-key'] = RAPIDAPI_KEY;
  } else {
    headers['x-api-key'] = API_KEY;
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Skyscanner create: ${res.status}`);
  const data = await res.json();
  const sessionToken = data.sessionToken || data.session_token;
  if (!sessionToken) throw new Error('Skyscanner create: no sessionToken');
  return { sessionToken };
};

export const pollResults = async (sessionToken) => {
  const key = useRapidAPI ? RAPIDAPI_KEY : API_KEY;
  if (!key || !sessionToken) throw new Error('Missing sessionToken or API key');
  const url = useRapidAPI ? `https://${RAPIDAPI_SKY_HOST}/flights/live/search/poll/${sessionToken}` : `${PARTNER_BASE}/poll/${sessionToken}`;
  const headers = { Accept: 'application/json' };
  if (useRapidAPI) {
    headers['x-rapidapi-host'] = RAPIDAPI_SKY_HOST;
    headers['x-rapidapi-key'] = RAPIDAPI_KEY;
  } else {
    headers['x-api-key'] = API_KEY;
  }
  const res = await fetch(url, { method: 'POST', headers });
  if (!res.ok) throw new Error(`Skyscanner poll: ${res.status}`);
  return res.json();
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

export const searchFlights = async (params) => {
  const { sessionToken } = await createSearch(params);
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const data = await pollResults(sessionToken);
    const status = data.status || data.content?.results?.status;
    if (status === 'RESULT_STATUS_COMPLETE') {
      const content = data.content || data;
      const results = content.results || {};
      const itineraries = results.itineraries || results.Itineraries || [];
      const legs = results.legs || results.Legs || {};
      const list = Array.isArray(itineraries) ? itineraries : Object.values(itineraries);
      return list.slice(0, 20).map((it, idx) => {
        const pricing = it.pricingOptions?.[0] || it.PricingOptions?.[0] || {};
        const price = pricing.price || pricing.Price || 0;
        const deepLink = pricing.itemId?.deepLink || pricing.DeepLink || pricing.bookingUrl || '';
        const legIds = it.legIds || it.LegIds || [];
        let totalMinutes = 0;
        try {
          legIds.forEach((lid) => {
            const leg = legs[lid] || legs[lid?.toLowerCase?.()];
            if (leg?.durationInMinutes != null) totalMinutes += leg.durationInMinutes;
            else if (leg?.Duration != null) totalMinutes += leg.Duration;
          });
        } catch (_) {}
        return {
          id: it.id || `sk-${idx}-${price}`,
          price: Number(price) || 0,
          currency: content.query?.currency || 'EUR',
          duration: { total: totalMinutes },
          durationMinutes: totalMinutes,
          segments: [],
          bookUrl: deepLink,
          provider: 'skyscanner',
        };
      });
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Skyscanner search timed out');
};
