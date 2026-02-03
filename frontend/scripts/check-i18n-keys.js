/**
 * Extract translation keys used in source (t('...'), t("..."), t(`...`)).
 * Compares with keys present in en.json and reports used-but-missing-in-en.
 * Run from frontend: node scripts/check-i18n-keys.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'src', 'i18n', 'locales');
const SRC_DIR = path.join(__dirname, '..', 'src');
const EN_JSON = path.join(LOCALES_DIR, 'en.json');

// Match t('key'), t("key"), t(`key`), t('key', 'fallback'), t(`category.${x}`) -> category.*
const T_CALL_REGEX = /t\s*\(\s*['`"]([^'"`]+)['`"]/g;
const T_TEMPLATE_REGEX = /t\s*\(\s*`([^`]*)`/g;

/**
 * Recursively collect all key paths from en.json (same as parity script).
 */
function collectKeysFromObject(obj, prefix = '') {
  const keys = new Set();
  if (!obj || typeof obj !== 'object') return keys;
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectKeysFromObject(value, fullKey).forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

/**
 * Find all JS/JSX files under dir, excluding node_modules and tests.
 */
function findJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name === 'node_modules' || e.name === 'scripts' || e.name === 'tests') continue;
    if (e.isDirectory()) findJsFiles(full, files);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) files.push(full);
  }
  return files;
}

/**
 * Extract literal keys from a string (no interpolation).
 */
function extractKeysFromContent(content) {
  const keys = new Set();
  let m;
  T_CALL_REGEX.lastIndex = 0;
  while ((m = T_CALL_REGEX.exec(content)) !== null) {
    const key = m[1].trim();
    if (!key.includes('${')) keys.add(key);
  }
  // Template literals like t(`category.${x}`) -> treat as category.* (optional)
  T_TEMPLATE_REGEX.lastIndex = 0;
  while ((m = T_TEMPLATE_REGEX.exec(content)) !== null) {
    const key = m[1].trim();
    if (key.includes('${')) {
      const base = key.replace(/\$\{[^}]+\}/g, '*').replace(/\.\*$/, '');
      if (base) keys.add(base);
    } else {
      keys.add(key);
    }
  }
  return keys;
}

/**
 * Check if a key exists in en (exact or as parent path for nested keys).
 */
function keyExistsInEn(key, enKeys) {
  if (enKeys.has(key)) return true;
  let cur = key;
  while (cur.includes('.')) {
    cur = cur.replace(/\.[^.]+$/, '');
    if (enKeys.has(cur)) return true;
  }
  return false;
}

function main() {
  const en = JSON.parse(fs.readFileSync(EN_JSON, 'utf8'));
  const enKeys = collectKeysFromObject(en);

  const jsFiles = findJsFiles(SRC_DIR);
  const usedKeys = new Set();
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    extractKeysFromContent(content).forEach((k) => usedKeys.add(k));
  }

  const missing = [...usedKeys].filter((k) => !keyExistsInEn(k, enKeys));
  if (missing.length === 0) {
    console.log('All keys used in source exist in en.json.');
  } else {
    console.log('Keys used in source but missing (or not leaf) in en.json:');
    missing.sort().forEach((k) => console.log(`  - ${k}`));
  }
}

main();
