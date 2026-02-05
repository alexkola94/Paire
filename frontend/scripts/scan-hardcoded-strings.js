/**
 * Scan source for common hardcoded user-facing string patterns.
 * Outputs file, line number, and matched string for review.
 * Run from frontend: node scripts/scan-hardcoded-strings.js
 * Exclude lines containing // i18n-ignore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'src');

const PATTERNS = [
  { name: 'placeholder literal', regex: /placeholder\s*=\s*["']([^t\(][^"']*)["']/g },
  { name: 'title literal', regex: /title\s*=\s*["']([^t\(][^"']*)["']/g },
  { name: 'label literal', regex: /label\s*=\s*["']([^t\(][^"']*)["']/g },
  { name: 'message literal', regex: /message\s*=\s*["']([^t\(][^"']*)["']/g },
  { name: 'Alert.alert title/message', regex: /Alert\.alert\s*\(\s*["']([^"']+)["']/g },
  { name: 'showToast literal', regex: /showToast\s*\(\s*["']([^"']+)["']/g },
  { name: 'accessibilityLabel literal', regex: /accessibilityLabel\s*=\s*["']([^t\(][^"']*)["']/g },
  { name: 'Text child literal', regex: />\s*["']([A-Za-z][^"']{3,})["']\s*</g },
  { name: 'throw new Error', regex: /throw new Error\s*\(\s*["']([^"']+)["']/g },
];

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

function main() {
  const jsFiles = findJsFiles(SRC_DIR);
  const results = [];
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('// i18n-ignore')) return;
      for (const { name, regex } of PATTERNS) {
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(line)) !== null) {
          results.push({
            file: path.relative(SRC_DIR, file),
            line: i + 1,
            pattern: name,
            match: m[1] || m[0],
          });
        }
      }
    });
  }
  if (results.length === 0) {
    console.log('No hardcoded string hits found.');
    return;
  }
  console.log('Hardcoded string report (file:line pattern match):\n');
  results.forEach(({ file, line, pattern, match }) => {
    console.log(`${file}:${line} [${pattern}] ${match}`);
  });
}

main();
