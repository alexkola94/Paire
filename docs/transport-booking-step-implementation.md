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
| Flight | Skyscanner | `skyscanner.com/transport/flights/{origin}/{dest}/{YYMMDD}/` (city slugs; IATA/entity lookup may improve pre-fill for some cities) |
| Flight | Kiwi.com | `kiwi.com/en/search/tiles/{origin}/{dest}/{YYYY-MM-DD}/` |
| Bus | FlixBus | `shop.flixbus.com/search?departureCity=...&arrivalCity=...&rideDate={DD.MM.YYYY}` (city names; some regions may require city ID for full pre-fill) |
| Bus | Omio | `omio.com/search/{origin}/{dest}/{YYYY-MM-DD}/` |
| Ferry | Ferryhopper | Route pre-fill: `ferryhopper.com/en/ferry-routes/direct/{origin}-{dest}?date={YYYY-MM-DD}`. When both origin and destination match a known port code and a date is set: `ferryhopper.com/en/booking/results?itinerary=ORIGIN_CODE,DEST_CODE&dates=YYYYMMDD` for route + date pre-fill. |
| Ferry | Direct Ferries | `directferries.com/routes/{origin}_{dest}.htm` |

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
