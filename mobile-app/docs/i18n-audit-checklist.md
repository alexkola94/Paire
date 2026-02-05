# i18n Audit Checklist

Use this checklist before releases to ensure translations and locale parity are in good shape.

## En & El only (quick audit)

For a focused English/Greek audit, run in this order:

1. **Parity**: `node scripts/check-i18n-parity-en-el.js` (or `check-i18n-parity.js` and fix only `el.json`). Fix until el has zero missing keys vs en.
2. **Keys from code**: `node scripts/check-i18n-keys.js`. Add any reported keys to `en.json`, then to `el.json`.
3. **Hardcoded strings**: `node scripts/scan-hardcoded-strings.js`. Replace user-facing literals with `t('namespace.key')` or add `// i18n-ignore` on the same line for intentional exceptions (numeric placeholders, dev-only errors).
4. **Config**: Confirm `i18n/config.js` has `lng: 'en'`, `fallbackLng: 'en'`, and `resources` including `en` and `el`. Language picker in Profile uses `settings.language`, `settings.languageUpdated`, `settings.languages.en` / `settings.languages.el`.
5. **Quality**: Spot-check interpolation (`{{count}}`, `{{field}}`, etc.) and plurals (`_plural`) in `el.json` match `en.json` variable names.

**Scripts:** `check-i18n-parity-en-el.js` (en vs el only), `check-i18n-parity.js`, `check-i18n-keys.js`, `scan-hardcoded-strings.js`.

---

## 1. Pattern scan

- [ ] Run `node scripts/scan-hardcoded-strings.js` from `mobile-app`
- [ ] Review all hits; fix or document each (e.g. numeric placeholders, technical IDs)
- [ ] Add `// i18n-ignore` only where a string is intentionally not translated

## 2. Locale parity

- [ ] Run `node scripts/check-i18n-parity.js` from `mobile-app`
- [ ] Add any missing keys to `el.json`, `es.json`, `fr.json` with proper translations
- [ ] Optionally run `node scripts/check-i18n-keys.js` to find keys used in code but missing in `en.json`

## 3. Services and utils

- [ ] **Notifications**: Channel names and descriptions use `notifications.channels.*` (i18n in `services/notifications.js`)
- [ ] **Validation**: Default error messages use `validation.*` keys; FormField displays via `messageKey` + `t()`
- [ ] **Auth/API**: User-facing `throw new Error(...)` or error messages passed to UI use keys or are translated in the UI layer

## 4. Static option arrays

- [ ] **UNIT_OPTIONS** (ShoppingItemForm): Use `shoppingLists.units.*` and `t(opt.labelKey)` (or `label: t(opt.labelKey)`)
- [ ] **FREQUENCY_OPTIONS** (RecurringBillForm): Use `recurringBills.frequency.*` and `t()`
- [ ] **STATUS_OPTIONS** (LoanForm): Use `loans.status.*` and `t()`
- [ ] **PRIORITY_OPTIONS** / **COLOR_OPTIONS** (SavingsGoalForm): Priority uses `savingsGoals.priority.*`; colors are hex only
- [ ] **PERIOD_OPTIONS** (BudgetForm): Use `budgets.period.*` and `t()`
- [ ] **DATE_RANGE_OPTIONS** (analytics): Use `analytics.*` labelKey and `t(o.labelKey)`

## 5. Screens and layouts

- [ ] Auth screens (reset-password, bank-callback, confirm-email, accept-invitation): No remaining literals in title/label/placeholder/Alert/showToast
- [ ] App layouts: Tab/screen titles use `t()` from locale

## 6. New screens/components

- [ ] Use `useTranslation()` and `t()` for all user-facing strings
- [ ] Add new keys to all four locale files: `en`, `el`, `es`, `fr`

## 7. Empty states

Every empty state (no data, no results, no list items) must use translation keys and exist in **all** locale files (en, el, es, fr). Parity must include these keys.

**Main namespaces for empty states:** `common.noData`, `achievements.emptyTitle` / `emptyDescription`, `partnership.noPartner`, `loans.emptyTitle` / `emptyDescription`, `shoppingLists.emptyTitle` / `emptyDescription`, `receipts.emptyTitle` / `emptyDescription`, `recurringBills.noSearchResults` / `emptyTitle` / `emptyDescription` / `noAttachments`, `budgets.emptyTitle` / `emptyDescription`, `savingsGoals.emptyTitle` / `emptyDescription`, `expenses.emptyTitle` / `emptyDescription`, `income.emptyTitle` / `emptyDescription`, `travel.documents.noDocs`, `travel.budget.noExpenses`, `travel.packing.noItems`, `travel.explore.noPlaces` / `noPlacesHint`, `travel.itinerary.noEvents`, `travel.common.noTrip`, `travel.chatbot.welcomeMessage`, `chatbot.welcomeMessage` / `tryAsking`.

When adding a new empty state in code, add the key to `en.json` first, then to `el.json`, `es.json`, and `fr.json`.

---

**Scripts location:** `You-me-Expenses/mobile-app/scripts/`

- `check-i18n-parity-en-el.js` – keys in en missing in el (en/el-only audit)
- `check-i18n-parity.js` – keys in en missing in el/es/fr
- `check-i18n-keys.js` – keys used in source but missing in en
- `scan-hardcoded-strings.js` – hardcoded string pattern report

Run from `mobile-app`:
`node scripts/check-i18n-parity.js`

### Pre-release gate

Before each release:

1. Run `node scripts/check-i18n-parity.js` (or `check-i18n-parity-en-el.js` for en/el). Fix any missing keys in target locale(s).
2. Run `node scripts/check-i18n-keys.js`. Add any missing keys to `en.json` and to other locale files to keep parity.
3. Run `node scripts/scan-hardcoded-strings.js`. Resolve or add `// i18n-ignore` for each hit.
