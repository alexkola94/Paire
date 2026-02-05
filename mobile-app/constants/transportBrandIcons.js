/**
 * Brand logo URIs for transport booking link buttons.
 * Uses Clearbit logo API (logo.clearbit.com) for consistent brand icons.
 * Keys match provider ids from utils/transportLinks.js: skyscanner, kiwi, flixbus, omio, ferryhopper, directferries.
 */
export const TRANSPORT_BRAND_ICONS = {
  skyscanner: {
    uri: 'https://logo.clearbit.com/skyscanner.com',
    label: 'Skyscanner',
  },
  kiwi: {
    uri: 'https://logo.clearbit.com/kiwi.com',
    label: 'Kiwi.com',
  },
  flixbus: {
    uri: 'https://logo.clearbit.com/flixbus.com',
    label: 'FlixBus',
  },
  omio: {
    uri: 'https://logo.clearbit.com/omio.com',
    label: 'Omio',
  },
  ferryhopper: {
    uri: 'https://logo.clearbit.com/ferryhopper.com',
    label: 'Ferryhopper',
  },
  directferries: {
    uri: 'https://logo.clearbit.com/directferries.com',
    label: 'Direct Ferries',
  },
};

export default TRANSPORT_BRAND_ICONS;
