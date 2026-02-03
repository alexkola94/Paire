# Frontend i18n Audit Checklist

Use this checklist before releases to ensure translations and locale parity (en & el) are in good shape for the **web app** at `You-me-Expenses/frontend`.

## En & El only (quick audit)

For a focused English/Greek audit, run from the **frontend** root in this order:

1. **Parity**: `node scripts/check-i18n-parity-en-el.js` (or `check-i18n-parity.js` and fix only `el.json`). Fix until el has zero missing keys vs en.
2. **Keys from code**: `node scripts/check-i18n-keys.js`. Add any reported keys to `en.json`, then to `el.json`. (Note: this script may take a minute or more on a large codebase.)
3. **Hardcoded strings**: `node scripts/scan-hardcoded-strings.js`. Replace user-facing literals with `t('namespace.key')` and add the key to both `en.json` and `el.json`, or add `// i18n-ignore` on the same line for intentional exceptions (numeric placeholders, dev-only errors).
4. **Config**: Confirm `src/i18n/config.js` has `lng` from `localStorage.getItem('language')`, `fallbackLng: 'en'`, initial load of `en`, and that `loadLanguage('el')` and `languageChanged` persist to `localStorage`. Language picker (e.g. Profile page) uses `i18n.changeLanguage(lang)` and `t('profile.language')` (or equivalent).
5. **Quality**: Spot-check interpolation (`{{count}}`, `{{field}}`, etc.) and plurals (`_plural`) in `el.json` vs `en.json` so variable names match.

**Scripts:** `check-i18n-parity-en-el.js` (en vs el only), `check-i18n-parity.js`, `check-i18n-keys.js`, `scan-hardcoded-strings.js`.

---

## Scripts location

**Path:** `You-me-Expenses/frontend/scripts/`

| Script | Purpose |
|--------|--------|
| `check-i18n-parity.js` | Compare en with el, es, fr; report keys in en missing in each locale |
| `check-i18n-parity-en-el.js` | En vs el only; report keys in en missing in el |
| `check-i18n-keys.js` | Find keys used in source (e.g. `t('key')`) but missing in en.json |
| `scan-hardcoded-strings.js` | Report placeholder/title/label/Alert/showToast/throw new Error literals |

Run from **frontend** root:

```bash
node scripts/check-i18n-parity-en-el.js
node scripts/check-i18n-keys.js
node scripts/scan-hardcoded-strings.js
```

---

## Pre-release gate

Before each release:

1. Run `node scripts/check-i18n-parity.js` (or `check-i18n-parity-en-el.js` for en/el). Fix any missing keys in target locale(s).
2. Run `node scripts/check-i18n-keys.js`. Add any missing keys to `en.json` and to `el.json` to keep parity.
3. Run `node scripts/scan-hardcoded-strings.js`. Resolve or add `// i18n-ignore` for each hit.

---

## Locale files

- **Path:** `frontend/src/i18n/locales/`
- **Files:** `en.json`, `el.json`, `es.json`, `fr.json`
- **Config:** `frontend/src/i18n/config.js` (react-i18next; en loaded at init; el/es/fr lazy-loaded via `loadLanguage()`; language from `localStorage.getItem('language')`).

Frontend and mobile locale files are **separate** (different key sets and structure). Scripts run against `frontend/src` and `frontend/src/i18n/locales` only.
