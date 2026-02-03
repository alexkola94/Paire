/**
 * Locale parity check: compare en.json with el, es, fr.
 * Reports keys that exist in en but are missing in each other locale.
 * Run from frontend: node scripts/check-i18n-parity.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const BASE_LOCALE = 'en';
const OTHER_LOCALES = ['el', 'es', 'fr'];

/**
 * Recursively collect all key paths from a nested object (e.g. "common.save", "auth.errors.generic").
 * @param {object} obj - Nested translation object
 * @param {string} prefix - Current key path prefix
 * @returns {Set<string>} Set of full key paths
 */
function collectKeys(obj, prefix = '') {
  const keys = new Set();
  if (!obj || typeof obj !== 'object') return keys;
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectKeys(value, fullKey).forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function main() {
  const basePath = path.join(LOCALES_DIR, `${BASE_LOCALE}.json`);
  if (!fs.existsSync(basePath)) {
    console.error('Base locale not found:', basePath);
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const baseKeys = collectKeys(base);
  console.log(`Base locale "${BASE_LOCALE}" has ${baseKeys.size} keys.\n`);

  for (const locale of OTHER_LOCALES) {
    const localePath = path.join(LOCALES_DIR, `${locale}.json`);
    if (!fs.existsSync(localePath)) {
      console.error(`Locale file not found: ${localePath}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    const localeKeys = collectKeys(data);
    const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
    if (missing.length === 0) {
      console.log(`${locale}.json: OK (all keys present).`);
    } else {
      console.log(`${locale}.json: ${missing.length} key(s) missing from base:`);
      missing.sort().forEach((k) => console.log(`  - ${k}`));
    }
    console.log('');
  }
}

main();
