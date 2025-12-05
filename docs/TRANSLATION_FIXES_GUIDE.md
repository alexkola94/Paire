# Translation Fixes - Quick Implementation Guide

## 🎯 Quick Fixes Required

This document provides the exact code changes needed to fix all translation issues.

---

## 1️⃣ Dashboard.jsx

**File:** `frontend/src/pages/Dashboard.jsx`

### Fix: Lines 184-190 (Added by text)

**Current Code (Line 184-190):**
```javascript
<p className="transaction-date">
  {format(new Date(transaction.date), 'MMM dd, yyyy')}
  {transaction.user_profiles && (
    <span className="added-by">
      {' • Added by '}
      {transaction.user_profiles.display_name}
      {transaction.user_profiles.email && (
        <span className="added-by-email"> ({transaction.user_profiles.email})</span>
      )}
    </span>
  )}
</p>
```

**Fixed Code:**
```javascript
<p className="transaction-date">
  {format(new Date(transaction.date), 'MMM dd, yyyy')}
  {transaction.user_profiles && (
    <span className="added-by">
      {' • ' + t('dashboard.addedBy') + ' '}
      {transaction.user_profiles.display_name}
      {transaction.user_profiles.email && (
        <span className="added-by-email"> ({transaction.user_profiles.email})</span>
      )}
    </span>
  )}
</p>
```

---

## 2️⃣ Income.jsx

**File:** `frontend/src/pages/Income.jsx`

### Fix 1: Line 139 (Total count)

**Current Code:**
```javascript
<p className="page-subtitle">
  Total: {incomes.length} {incomes.length === 1 ? 'entry' : 'entries'}
</p>
```

**Fixed Code:**
```javascript
<p className="page-subtitle">
  {t('income.totalCount', { count: incomes.length })}
</p>
```

### Fix 2: Lines 207-217 (Added by text)

**Current Code:**
```javascript
<div className="income-date">
  {format(new Date(income.date), 'MMMM dd, yyyy')}
  {income.user_profiles && (
    <span className="added-by">
      {' • Added by '}
      {income.user_profiles.display_name}
      {income.user_profiles.email && (
        <span className="added-by-email"> ({income.user_profiles.email})</span>
      )}
    </span>
  )}
</div>
```

**Fixed Code:**
```javascript
<div className="income-date">
  {format(new Date(income.date), 'MMMM dd, yyyy')}
  {income.user_profiles && (
    <span className="added-by">
      {' • ' + t('dashboard.addedBy') + ' '}
      {income.user_profiles.display_name}
      {income.user_profiles.email && (
        <span className="added-by-email"> ({income.user_profiles.email})</span>
      )}
    </span>
  )}
</div>
```

### Fix 3: Line 228 (View Attachment)

**Current Code:**
```javascript
<a
  href={income.attachment_url}
  target="_blank"
  rel="noopener noreferrer"
  className="attachment-link"
>
  <FiFileText size={16} />
  View Attachment
</a>
```

**Fixed Code:**
```javascript
<a
  href={income.attachment_url}
  target="_blank"
  rel="noopener noreferrer"
  className="attachment-link"
>
  <FiFileText size={16} />
  {t('transaction.viewAttachment')}
</a>
```

---

## 3️⃣ Expenses.jsx

**File:** `frontend/src/pages/Expenses.jsx`

### Fix: Lines 207-218 (Added by text)

**Current Code:**
```javascript
<div className="expense-date">
  {format(new Date(expense.date), 'MMMM dd, yyyy')}
  {expense.user_profiles && (
    <span className="added-by">
      {' • Added by '}
      {expense.user_profiles.display_name}
      {expense.user_profiles.email && (
        <span className="added-by-email"> ({expense.user_profiles.email})</span>
      )}
    </span>
  )}
</div>
```

**Fixed Code:**
```javascript
<div className="expense-date">
  {format(new Date(expense.date), 'MMMM dd, yyyy')}
  {expense.user_profiles && (
    <span className="added-by">
      {' • ' + t('dashboard.addedBy') + ' '}
      {expense.user_profiles.display_name}
      {expense.user_profiles.email && (
        <span className="added-by-email"> ({expense.user_profiles.email})</span>
      )}
    </span>
  )}
</div>
```

---

## 4️⃣ TransactionForm.jsx

**File:** `frontend/src/components/TransactionForm.jsx`

### Fix 1: Line 59 (File size error)

**Current Code:**
```javascript
if (selectedFile.size > 5 * 1024 * 1024) {
  setError('File size must be less than 5MB')
  return
}
```

**Fixed Code:**
```javascript
if (selectedFile.size > 5 * 1024 * 1024) {
  setError(t('transaction.fileSizeError'))
  return
}
```

### Fix 2: Line 88 (Invalid amount error)

**Current Code:**
```javascript
if (!formData.amount || parseFloat(formData.amount) <= 0) {
  setError('Please enter a valid amount')
  return
}
```

**Fixed Code:**
```javascript
if (!formData.amount || parseFloat(formData.amount) <= 0) {
  setError(t('transaction.invalidAmount'))
  return
}
```

---

## 5️⃣ Loans.jsx

**File:** `frontend/src/pages/Loans.jsx`

### Fix 1: Line 514 (Edit button aria-label)

**Current Code:**
```javascript
<button
  onClick={() => openEditForm(loan)}
  className="btn-icon"
  aria-label="Edit"
>
  <FiEdit size={18} />
</button>
```

**Fixed Code:**
```javascript
<button
  onClick={() => openEditForm(loan)}
  className="btn-icon"
  aria-label={t('common.edit')}
>
  <FiEdit size={18} />
</button>
```

### Fix 2: Line 521 (Delete button aria-label)

**Current Code:**
```javascript
<button
  onClick={() => handleDelete(loan)}
  className="btn-icon delete"
  aria-label="Delete"
>
  <FiTrash2 size={18} />
</button>
```

**Fixed Code:**
```javascript
<button
  onClick={() => handleDelete(loan)}
  className="btn-icon delete"
  aria-label={t('common.delete')}
>
  <FiTrash2 size={18} />
</button>
```

---

## 6️⃣ Translation Files Updates

### Greek Translation (el.json)

**File:** `frontend/src/i18n/locales/el.json`

**Already Fixed:** Added missing keys to common section:
```json
{
  "common": {
    "create": "Δημιουργία",
    "update": "Ενημέρωση"
  }
}
```

---

## 📋 Implementation Checklist

Copy this checklist and mark items as you complete them:

```markdown
## Translation Fixes Checklist

### Files to Update
- [ ] frontend/src/pages/Dashboard.jsx (1 fix)
- [ ] frontend/src/pages/Income.jsx (3 fixes)
- [ ] frontend/src/pages/Expenses.jsx (1 fix)
- [ ] frontend/src/components/TransactionForm.jsx (2 fixes)
- [ ] frontend/src/pages/Loans.jsx (2 fixes)
- [x] frontend/src/i18n/locales/el.json (2 keys added)

### Testing
- [ ] Test Dashboard page in English
- [ ] Test Dashboard page in Greek
- [ ] Test Income page in English
- [ ] Test Income page in Greek
- [ ] Test Expenses page in English
- [ ] Test Expenses page in Greek
- [ ] Test Loans page in English
- [ ] Test Loans page in Greek
- [ ] Test TransactionForm in English
- [ ] Test TransactionForm in Greek
- [ ] Test file upload error messages
- [ ] Test amount validation error messages
- [ ] Verify screen reader accessibility (aria-labels)

### Verification
- [ ] All hardcoded strings removed
- [ ] All texts display correctly in English
- [ ] All texts display correctly in Greek
- [ ] No console errors
- [ ] Accessibility audit passes
```

---

## 🧪 Testing Instructions

### 1. Language Switching Test

```javascript
// In browser console or Profile page:
// Switch to Greek
localStorage.setItem('language', 'el')
window.location.reload()

// Switch to English
localStorage.setItem('language', 'en')
window.location.reload()
```

### 2. Visual Verification

For each page, verify the following are translated:
- ✅ Page titles and subtitles
- ✅ Button labels
- ✅ Form labels and placeholders
- ✅ Error messages
- ✅ Status messages
- ✅ Date formats (locale-aware)
- ✅ "Added by" text in transaction lists
- ✅ Aria-labels for accessibility

### 3. Pluralization Test

Test income page with:
- **1 entry:** Should show "1 entry" (EN) or "1 καταχώριση" (EL)
- **Multiple entries:** Should show "N entries" (EN) or "N καταχωρίσεις" (EL)

---

## 🔧 Common Patterns

### Pattern 1: Simple Translation
```javascript
// ❌ Bad
<h1>Dashboard</h1>

// ✅ Good
<h1>{t('dashboard.title')}</h1>
```

### Pattern 2: With Variables
```javascript
// ❌ Bad
<p>Total: {count} items</p>

// ✅ Good
<p>{t('common.totalItems', { count })}</p>
```

### Pattern 3: Pluralization
```javascript
// ❌ Bad
{count === 1 ? 'entry' : 'entries'}

// ✅ Good
{t('income.totalCount', { count })}
```

### Pattern 4: Concatenation
```javascript
// ❌ Bad
{' • Added by ' + name}

// ✅ Good
{' • ' + t('dashboard.addedBy') + ' ' + name}
```

### Pattern 5: Aria-labels
```javascript
// ❌ Bad
aria-label="Edit"

// ✅ Good
aria-label={t('common.edit')}
```

---

## 📞 Support

If you encounter any issues:
1. Check the translation key exists in both `en.json` and `el.json`
2. Verify the key path is correct (e.g., `dashboard.title` not `dashboardTitle`)
3. Clear browser cache and reload
4. Check browser console for i18n errors
5. Refer to the main audit report: `TRANSLATION_AUDIT_REPORT.md`

---

*Last Updated: December 5, 2025*

