/**
 * En vs El locale parity only.
 * Reports keys that exist in en.json but are missing in el.json.
 * Run from frontend: node scripts/check-i18n-parity-en-el.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const BASE_LOCALE = 'en';
const TARGET_LOCALE = 'el';

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
  const targetPath = path.join(LOCALES_DIR, `${TARGET_LOCALE}.json`);
  if (!fs.existsSync(basePath)) {
    console.error('Base locale not found:', basePath);
    process.exit(1);
  }
  if (!fs.existsSync(targetPath)) {
    console.error('Target locale not found:', targetPath);
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(basePath, 'utf8'));
  const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const baseKeys = collectKeys(base);
  const targetKeys = collectKeys(target);
  const missing = [...baseKeys].filter((k) => !targetKeys.has(k));
  console.log(`Base "${BASE_LOCALE}" has ${baseKeys.size} keys. Target "${TARGET_LOCALE}" has ${targetKeys.size} keys.\n`);
  if (missing.length === 0) {
    console.log(`${TARGET_LOCALE}.json: OK (all keys present).`);
  } else {
    console.log(`${TARGET_LOCALE}.json: ${missing.length} key(s) missing from base:`);
    missing.sort().forEach((k) => console.log(`  - ${k}`));
  }
}

main();
