# Transport Booking Step - Implementation Record

**Date:** 2026-02-04
**Feature:** Transport Selection Step for Trip Wizards
**Status:** Implemented

---

## Summary

Added a "Transport Selection" step to both `TripSetupWizard` and `MultiCityTripWizard` that lets users select a transport type (Flight, Bus, Ferry) and deep-link to external booking providers. In the single-destination wizard, origin city is auto-detected via browser geolocation + Mapbox reverse geocoding.

---

## Files Created

### 1. `frontend/src/travel/utils/transportLinks.js`
- URL utility that exports `generateTransportLink(type, data)`
- Returns array of provider objects `[{ provider, label, url }]`
- Supports Flight (Skyscanner, Kiwi.com), Bus (FlixBus, Omio), Ferry (Ferryhopper, Direct Ferries)
- Internal helpers: `slugify()`, `formatDateYYMMDD()`, `formatDateDDMMYYYY()`
- Handles missing origin gracefully (destination-only URLs)

### 2. `frontend/src/travel/styles/TransportBookingStep.css`
- `.transport-type-selector` mirrors `.budget-mode-toggle` pattern
- `.transport-type-btn` / `.transport-type-btn.active` mirrors `.mode-btn` pattern
- `.transport-cta-card` glassmorphism card for provider CTAs
- `.transport-cta-link` gradient button for booking links
- Light theme overrides via `.travel-layout:not([data-theme='dark'])` pattern
- Mobile responsive: stacks type buttons vertically at 480px breakpoint

### 3. `frontend/src/travel/components/TransportBookingStep.jsx`
- Shared component used by both wizards
- **Single-destination mode** (no `legs` prop): Shows 3 selectable cards (Flight/Bus/Ferry), selecting one reveals 2 provider CTA buttons
- **Multi-city mode** (`legs` prop): Shows per-leg booking cards with CTAs for flight/bus/ferry legs only
- All CTA links open `target="_blank"` with `rel="noopener noreferrer"`

---

## Files Modified

### 4. `frontend/src/travel/components/TripSetupWizard.jsx`
**Changes:**
- Added imports: `TransportBookingStep`, `reverseGeocode` from discoveryService
- Added state: `originCity` (string|null), `originLoading` (boolean)
- Added `useEffect`: On mount, calls `navigator.geolocation.getCurrentPosition` -> `reverseGeocode(lat, lon)` -> `setOriginCity(result.name)`. Fails silently if denied.
- Filled step 3: Replaced `default: return null` with `case 3:` rendering `<TransportBookingStep>` with origin, destination, dates, and loading state
- Fixed `validateStep`: Moved budget validation from `case 3` to `case 2` (budget UI was already rendered in step 2). Made `case 3` a no-op (transport is optional).

**Step flow (unchanged 3-step structure):**
- Step 1: Destination (unchanged)
- Step 2: Dates + Budget (unchanged UI, now includes budget validation)
- Step 3: Transport Selection (NEW content) + Save button

### 5. `frontend/src/travel/components/MultiCityTripWizard.jsx`
**Changes:**
- Added import: `TransportBookingStep`
- Incremented `MAX_STEPS`: Desktop 3->4, Mobile 4->5
- Updated shared step detection:
  - `isDateStep`: unchanged
  - `isTransportStep`: (mobile step 4) || (desktop step 3) -- NEW
  - `isBudgetStep`: shifted +1 (mobile 4->5, desktop 3->4)
- Added transport step rendering: Builds `legs[]` from `orderedCities`, renders `<TransportBookingStep legs={legs} />`
- Shifted `validateStep` cases: Desktop budget 3->4, Mobile budget 4->5. Added transport as no-op case.

**Step flow (Desktop):**
- Step 1: Map + List (unchanged)
- Step 2: Dates (unchanged)
- Step 3: Transport Booking (NEW)
- Step 4: Budget + Save (was step 3)

**Step flow (Mobile):**
- Step 1: Map (unchanged)
- Step 2: List (unchanged)
- Step 3: Dates (unchanged)
- Step 4: Transport Booking (NEW)
- Step 5: Budget + Save (was step 4)

### 6. i18n Locale Files
Added `travel.transportBooking` keys to:
- `frontend/src/i18n/locales/en.json` (English)
- `frontend/src/i18n/locales/el.json` (Greek)
- `frontend/src/i18n/locales/es.json` (Spanish)
- `frontend/src/i18n/locales/fr.json` (French)

Keys added: `title`, `description`, `multiCityDescription`, `selectType`, `flight`, `bus`, `ferry`, `findFlights`, `searchBusTickets`, `searchFerryRoutes`, `skyscanner`, `kiwi`, `flixbus`, `omio`, `ferryhopper`, `directFerries`, `originDetecting`, `originUnknown`, `originFrom`, `skipHint`, `openInNewTab`, `noBookingLink`, `legFrom`

---

## External Booking Providers

| Type | Provider | URL Pattern |
|------|----------|-------------|
| Flight | Skyscanner | `skyscanner.com/transport/flights/{origin}/{dest}/{YYMMDD}/{retYYMMDD}/` — origin/dest use IATA-style codes from a map; when a city has no code we use `anywhere` so the link never 404s and the user can refine the search. |
| Flight | Kiwi.com | `kiwi.com/en/search/results/{origin}/{dest}/{YYYY-MM-DD}/no-return/` — path uses **city-country** format (e.g. `athens-greece`, `naxos-greece`) for pre-fill; unmapped cities use slug only (link opens, may not pre-fill). |
| Bus | FlixBus | `shop.flixbus.com/search?departureCity=...&arrivalCity=...&rideDate={DD.MM.YYYY}` (city names; some regions may require city ID for full pre-fill) |
| Bus | Omio | `omio.com/search/{origin}/{dest}/{YYYY-MM-DD}/` |
| Ferry | Ferryhopper | When both origin and destination match a known port code: `ferryhopper.com/en/booking/results?itinerary=...&dates=...&pax=1`. When a city has no port code we link to the Ferryhopper homepage so the link never 404s. |
| Ferry | Direct Ferries | We link to `directferries.com/` (homepage) so the user can search; `/routes/slug` URLs often 404 for our slugs. |

### Cities without airport or port

- **Skyscanner:** If we have no IATA-style code for origin or destination, we use `anywhere` for that segment so the URL is always valid and the user gets a search page they can edit.
- **Kiwi:** Unmapped cities use slug-only in the path; the link still opens but may not pre-fill. Mapped cities use `city-country` for full pre-fill.
- **Ferryhopper / Direct Ferries:** When we cannot build a valid route/booking URL (e.g. no port codes), we link to the provider homepage so links never 404.

---

## Debugging transport links

When links don’t pre-fill or open the wrong page, use the built-in logs to see what’s being generated and why.

### Enable logging

- **Frontend:** `frontend/src/travel/utils/transportLinks.js` — set `TRANSPORT_LINKS_DEBUG = true` (set to `false` when done).
- **Mobile:** `mobile-app/utils/transportLinks.js` — set `TRANSPORT_LINKS_DEBUG = true`. Call-site logs in `TransportLegCard.jsx` run only in `__DEV__`.

### What appears in the console

1. **`[transportLinks] generateTransportLink`** — Raw input: `type`, `origin`, `destination`, `startDate`, `endDate`. Confirms what the UI passed in.
2. **`[transportLinks] normalized`** — After slugify and date normalization: `originSlug`, `destSlug`, `isoDate`, `isoEndDate`. If dates are empty here, the step isn’t passing dates (e.g. trip start/end or leg dates).
3. **Per-type resolved values:**
   - **Flight:** `flight resolved` (Skyscanner: `originKey`, `destKey`, `skyscannerOrigin`, `skyscannerDest`, `outYYMMDD`, `retYYMMDD`); `flight kiwi` (`kiwiOriginPart`, `kiwiDestPart`, `kiwiDate`). If you see `anywhere` or slug-only, that segment isn’t in our maps.
   - **Ferry:** `ferry resolved` — `originCode` / `destCode` or `(no code – homepage fallback)`, `hasPortCodes`, `startYYYYMMDD`, `endYYYYMMDD`. If either code is missing, we intentionally send the user to the Ferryhopper homepage.
4. **Final URLs:** Each provider logs its final `url`. This is the exact URL that opens in the new tab or in the device browser.

### Call-site logs

- **Frontend:** `TransportBookingStep.jsx` logs `[TransportBookingStep] single-destination` / `multi-city leg` with the same data passed to `generateTransportLink`, and `[TransportBookingStep] opening` when a CTA is clicked (provider + url).
- **Mobile:** `TransportLegCard.jsx` logs `[TransportLegCard] leg data passed to generateTransportLink`, `generated links`, and `[TransportLegCard] opening URL` on tap.

### How to use this

1. Reproduce the issue (e.g. select Flight, click Skyscanner).
2. In the console, find the latest `[transportLinks]` sequence for that type. Check:
   - Are `origin` / `destination` / dates what you expect?
   - For flights: are `skyscannerOrigin` / `skyscannerDest` real codes or `anywhere`? Are Kiwi parts `city-country` or slug-only?
   - For ferry: are both `originCode` and `destCode` set, or do you see “no code – homepage fallback”?
3. Copy the **exact URL** from the log and open it in a desktop browser. If it 404s or redirects there too, the problem is the URL format or provider changes; if it works in the browser but not from the app, the issue is how the link is opened (e.g. target, app intent).
4. If the URL format is wrong: provider sites change over time. Look up the current deep-link or search URL format for that provider and then update the pattern and/or code maps in `transportLinks.js` (and the doc table above).

---

## Verification Checklist

- [ ] **TripSetupWizard**: Create trip -> steps 1, 2, 3 -> transport cards on step 3 -> click type -> CTAs appear -> click CTA -> correct URL in new tab -> Save works
- [ ] **MultiCityTripWizard**: Create multi-city trip -> assign transport modes -> advance to transport step -> per-leg CTAs for flight/bus/ferry -> click CTAs -> correct city pairs in URLs -> budget step -> save
- [ ] **Geolocation**: Test allowed (origin in URLs) and denied (graceful fallback)
- [ ] **Mobile**: Both wizards on mobile -> transport step at correct position -> stacked layout
- [ ] **Dark/Light themes**: Toggle theme -> styling matches wizard theme

---

## Architecture Notes

- Follows Clean Architecture pattern: utility (`transportLinks.js`) has no UI dependencies
- Component (`TransportBookingStep.jsx`) is a shared, reusable step used by both wizards
- Existing CSS patterns (`.budget-mode-toggle`, `.mode-btn`) are mirrored for visual consistency
- Geolocation uses existing `reverseGeocode` from `discoveryService.js` (Mapbox API)
- All translations follow existing `travel.*` namespace convention
- No backend changes required - all URLs are constructed client-side
