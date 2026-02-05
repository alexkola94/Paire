# Free Transport Booking / Search API Options

Reference for **free** (or generous free-tier) APIs you could use to search for flights, buses, or ferries. All options below have a free tier or test environment; no credit card required for the ones marked ✅.

## Current behaviour

Transport booking in this app uses **external links only** (Skyscanner, Kiwi.com, FlixBus, Omio, Ferryhopper, Direct Ferries). No backend transport API or API keys are required. The app builds deep-link URLs with route and date query parameters and opens them in the browser.

---

## Flights (reference – not integrated)

### 1. **Amadeus for Developers** ✅ (free test + production quota)

- **Site:** [developers.amadeus.com](https://developers.amadeus.com)
- **What you get:** Flight Offers Search, Flight Inspiration Search, Cheapest Date Search, Flight Offers Price, plus booking/order APIs.
- **Free tier:**
  - **Test environment:** Free monthly quota, cached data for most major cities/airports (no credit card required to start).
  - **Production:** Monthly free request quota, then pay per extra call (e.g. Flight Order Management has a free tier of ~10k calls/month).
- **Auth:** API key (register for free).
- **Docs:** [Flight Offers Search](https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search), [Pricing](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/pricing/).

### 2. **Skyscanner (RapidAPI / Partner)** ✅

- **Site:** [developers.skyscanner.net](https://developers.skyscanner.net) (Partner) or Skyscanner via RapidAPI.
- **What you get:** Live flight prices for a route and dates; multi-city (up to 6 legs); cabin class, carriers, currencies.
- **How it works:** Two-step flow: `POST /create` to start search (quick cached results), then `GET /poll` with session token for full results.
- **Free tier:** Partner program and/or RapidAPI free tier (limited requests/month). Check [Flights Live Prices overview](https://developers.skyscanner.net/docs/flights-live-prices/overview) and RapidAPI for current limits.
- **Auth:** API key.
- **Docs:** [Flights Live Prices](https://developers.skyscanner.net/docs/flights-live-prices/overview), [Quick start](https://developers.skyscanner.net/docs/flights-live-prices/quick-start).

### 3. **Kiwi Tequila API** ✅ (free, no credit card)

- **Site:** [tequila.kiwi.com](https://tequila.kiwi.com) (Kiwi.com B2B platform).
- **What you get:** Search (one-way, return), Locations (cities/airports), Multicity, NOMAD (multi-city any order), Booking (validate price, availability, book), Webhooks, Visa API.
- **Free tier:** Free to register and use; API key only, no credit card required.
- **Auth:** API key (register at tequila.kiwi.com).
- **Docs:** [Tequila API (Margarita docs)](https://kiwicom.github.io/margarita/docs/tequila-api), [Kiwi Tequila integration](https://www.travelportalsolution.com/kiwi-tequila-api-integration/).

### 4. **FlightAPI.io**

- **Site:** [flightapi.io](https://www.flightapi.io) / [docs](https://docs.flightapi.io/flight-price-api/round-trip-api).
- **What you get:** Round-trip, one-way, multi-trip flight search; multiple airlines, cabin classes, currencies.
- **Free tier:** Credit-based (e.g. round-trip = 2 credits/request); check site for free credits or trial.
- **Auth:** API key.

### 5. **CitizenPlane**

- **Site:** [docs.citizenplane.com](https://docs.citizenplane.com/api/v3/).
- **What you get:** Flight search, fare verification, booking request, payment processing (REST, Bearer token).
- **Free tier:** Request credentials from them; no public “self-serve” free tier documented.
- **Auth:** Bearer token (obtain by contacting CitizenPlane).

---

## Buses / multimodal

### 6. **TripGo (SkedGo)** ✅ (free tier, no credit card)

- **Site:** [developer.tripgo.com](https://developer.tripgo.com) (SkedGo).
- **What you get:** Multimodal routing (public transit + other modes), 500+ cities, 4000+ providers; door-to-door itineraries, live times and fares; Swift/Kotlin/React SDKs.
- **Free tier:** Free tier available, no credit card required.
- **Auth:** API key (developer signup).
- **Docs:** [TripGo](https://developer.tripgo.com).

### 7. **Distribusion**

- **Site:** [api.distribusion.com](https://api.distribusion.com/doc/).
- **What you get:** Intercity bus, rail, ferry, airport transfers; trip search and booking; retailer API.
- **Free tier:** Demo environment; production typically requires partnership. Check docs for trial/developer access.
- **Auth:** Per their docs (retailer/API credentials).

### 8. **RedBus API**

- **Site:** [redbusapi.com](https://redbusapi.com).
- **What you get:** Bus trip search, ticket booking, cancellation.
- **Free tier:** Sign up for documentation and API access; terms/limits on their site.
- **Auth:** Per RedBus API signup.

---

## Ferries

### 9. **Direct Ferries API**

- **Site:** [directferriesconnect.com](https://www.directferriesconnect.com/news/direct-ferries-launches-ferry-tickets-api-for-otas-amp-travel-companies).
- **What you get:** Ferry tickets from 280+ operators, 3000+ routes; integration for OTAs and travel companies.
- **Free tier:** B2B/partner; not a public “free for everyone” API. Contact for partnership and pricing.
- **Auth:** Partner/API credentials.

### 10. **Ferryhopper (Partner / MCP)**

- **Site:** [partners.ferryhopper.com](https://partners.ferryhopper.com), [Ferryhopper MCP](https://ferryhopper.github.io/fh-mcp/).
- **What you get:** 160+ ferry companies, 4000+ routes, 33 countries; MCP server for AI/LLM: port search, trip search, booking redirects.
- **Free tier:** Partner/affiliate program; MCP server may be usable in dev/AI flows. No generic “free public REST API” documented.
- **Auth:** Partner/MCP as per their docs.

---

## Summary: best free starting points

| Use case        | Recommended free option        | Notes                                      |
|----------------|----------------------------------|--------------------------------------------|
| **Flights**    | **Amadeus** (test) or **Kiwi Tequila** | Amadeus: test env free, cached data. Kiwi: full search/booking, no credit card. |
| **Flights**    | **Skyscanner** (RapidAPI/Partner)     | Live prices; check RapidAPI or Partner free tier. |
| **Buses/multi**| **TripGo (SkedGo)**             | Free tier, multimodal, many cities.        |
| **Ferries**    | No fully free public API       | Use current deep-links; consider Direct Ferries / Ferryhopper if you become a partner. |

---

## Integration idea for your app

- **Flights:** Add a “Search with API” path using **Amadeus test** or **Kiwi Tequila**: same origin/destination/dates from your transport step → call API → show results (and optionally deep-link to book on provider site).
- **Buses:** Use **TripGo** for multimodal search and show options alongside your existing FlixBus/Omio links.
- **Ferries:** Keep deep-links for now; if you need in-app ferry search later, contact Ferryhopper or Direct Ferries for partner API access.

If you tell me which transport type you want first (flights vs buses), I can outline concrete endpoints and request/response shapes for one of these APIs (e.g. Amadeus Flight Offers Search or Kiwi Tequila Search).

---

## Transport APIs setup (in-app search)

The app supports **in-app search** for flights (Kiwi Tequila, Skyscanner) and buses (TripGo). When these API keys are set, the Transport booking step shows a **"Search prices"** button that fetches results inside the app; otherwise only **"Open in new tab"** deep-links are shown.

### Environment variables (frontend)

In the **frontend** project, create or edit `.env` (see `frontend/.env.example` for a template). Add:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `VITE_KIWI_TEQUILA_API_KEY` | Kiwi Tequila API key for flight search | [tequila.kiwi.com](https://tequila.kiwi.com) → sign up → My applications → create app → copy API key |
| `VITE_SKYSCANNER_API_KEY` | Skyscanner Partner API key, or RapidAPI key for Skyscanner | [developers.skyscanner.net](https://developers.skyscanner.net) (Partner) or [rapidapi.com](https://rapidapi.com) (Skyscanner API) |
| `VITE_TRIPGO_API_KEY` | TripGo (SkedGo) API key for bus/multimodal routing | [tripgo.3scale.net/signup](https://tripgo.3scale.net/signup) → register → copy API key from dashboard |

Restart the frontend dev server after changing `.env`.

### Mobile app

For the React Native / Expo mobile app, add the same keys to the app’s environment (e.g. `mobile-app/.env` with `EXPO_PUBLIC_KIWI_TEQUILA_API_KEY` and equivalent, or your app’s config) so the transport step can call the same APIs. The mobile services read these via `process.env.EXPO_PUBLIC_*` or your config; no `import.meta.env` in RN.
