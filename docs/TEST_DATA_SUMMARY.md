# 🧪 Test Data Summary

## 👥 Test Users

### User 1: Alex
- **ID**: `10f690b8-b8e9-423d-814e-ef6758d5104a`
- **Email**: `kola.alexios@gmail.com`
- **Display Name**: "Alex"

### User 2: Partner
- **ID**: `c609b5ea-1d2b-4574-928e-bcaf4e0b20db`
- **Email**: `alexisdaywalker1994@gmail.com`
- **Display Name**: "Partner"

---

## 🔗 Partnership Status
✅ **Active Partnership** - Both users can see all shared data

---

## 💰 Test Data Overview

### Alex's Data:
- **7 Expenses**: $525.70 total
  - Groceries: $150.50
  - Transport: $70.00
  - Entertainment: $120.00
  - Shopping: $150.00
  - Utilities: $35.20
  
- **3 Income**: $3,700.00 total
  - Salary: $3,500.00
  - Freelance: $150.00
  - Other: $50.00
  
- **2 Loans**:
  - Given to John Smith: $500.00
  - Received from Mike Johnson: $1,000.00 (paid $600, remaining $400)

**Alex's Net Balance**: +$3,174.30

---

### Partner's Data:
- **7 Expenses**: $546.25 total
  - Groceries: $126.25
  - Transport: $50.00
  - Entertainment: $55.00
  - Dining: $75.00
  - Shopping: $200.00
  - Healthcare: $40.00
  
- **3 Income**: $3,475.00 total
  - Salary: $3,200.00
  - Bonus: $200.00
  - Investment: $75.00
  
- **2 Loans**:
  - Given to Sarah Williams: $300.00 (paid $150, remaining $150)
  - Received from David Brown: $750.00

**Partner's Net Balance**: +$2,928.75

---

## 📊 Combined Summary

### Total Household
- **Total Expenses**: $1,071.95
- **Total Income**: $7,175.00
- **Net Household Balance**: +$6,103.05
- **Total Transactions**: 20
- **Total Loans**: 4

### By Category (Combined)
| Category | Amount | Count |
|----------|--------|-------|
| Groceries | $276.75 | 4 |
| Transport | $120.00 | 3 |
| Shopping | $350.00 | 2 |
| Entertainment | $175.00 | 2 |
| Utilities | $35.20 | 1 |
| Dining | $75.00 | 1 |
| Healthcare | $40.00 | 1 |

---

## 🧪 How to Test

### Step 1: Run the Seed Script
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/seed_test_data.sql
```

### Step 2: Login as User 1 (Alex)
Email: `kola.alexios@gmail.com`

**What Alex Should See:**
- ✅ All 14 expenses (7 his + 7 partner's)
- ✅ All 6 income records (3 his + 3 partner's)
- ✅ All 4 loans (2 his + 2 partner's)
- ✅ Name tags showing "Added by Alex" and "Added by Partner"

### Step 3: Login as User 2 (Partner)
Email: `alexisdaywalker1994@gmail.com`

**What Partner Should See:**
- ✅ All 14 expenses (same as Alex)
- ✅ All 6 income records (same as Alex)
- ✅ All 4 loans (same as Alex)
- ✅ Name tags showing "Added by Alex" and "Added by Partner"

### Step 4: Test Editing Permissions

**Alex tries to:**
- ✅ Edit his own expense → Should work
- ❌ Edit partner's expense → Should fail
- ✅ Delete his own transaction → Should work
- ❌ Delete partner's transaction → Should fail

**Partner tries to:**
- ✅ Edit their own expense → Should work
- ❌ Edit Alex's expense → Should fail
- ✅ Delete their own transaction → Should work
- ❌ Delete Alex's transaction → Should fail

---

## 📋 Verification Queries

### Check All Shared Transactions (as Alex)
```sql
-- Login as Alex, then run:
SELECT 
  t.type,
  t.amount,
  t.category,
  t.description,
  t.date,
  up.display_name AS added_by
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
ORDER BY t.date DESC;
```

**Expected**: See all 20 transactions from both users

### Check Monthly Summary by Person
```sql
SELECT 
  up.display_name,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expenses,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS net
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY up.display_name;
```

**Expected Output**:
```
display_name | expenses | income   | net
-------------|----------|----------|----------
Alex         | 525.70   | 3700.00  | 3174.30
Partner      | 546.25   | 3475.00  | 2928.75
```

### Check All Shared Loans
```sql
SELECT 
  l.type,
  l.party_name,
  l.total_amount,
  l.remaining_amount,
  l.due_date,
  up.display_name AS added_by
FROM loans l
LEFT JOIN user_profiles up ON l.user_id = up.id
ORDER BY l.due_date;
```

**Expected**: See all 4 loans from both users

### Check Partnership Status
```sql
SELECT 
  up1.display_name AS user1,
  up2.display_name AS user2,
  p.status,
  p.created_at
FROM partnerships p
JOIN user_profiles up1 ON p.user1_id = up1.id
JOIN user_profiles up2 ON p.user2_id = up2.id;
```

**Expected Output**:
```
user1 | user2   | status | created_at
------|---------|--------|------------------
Alex  | Partner | active | 2024-12-04 ...
```

---

## 🎯 What to Test in Your App

### Dashboard View
- [ ] Shows combined total expenses: **$1,071.95**
- [ ] Shows combined total income: **$7,175.00**
- [ ] Shows net balance: **+$6,103.05**
- [ ] Shows breakdown by person (Alex vs Partner)

### Transactions List
- [ ] Displays all 20 transactions
- [ ] Shows name tags: "Added by Alex" / "Added by Partner"
- [ ] Can filter by person
- [ ] Can sort by date, amount, category
- [ ] Edit button only enabled for own transactions

### Loans View
- [ ] Displays all 4 loans
- [ ] Shows who added each loan
- [ ] Shows remaining amounts correctly
- [ ] Edit button only enabled for own loans

### Add New Transaction
- [ ] Alex adds expense → Partner sees it immediately
- [ ] Partner adds expense → Alex sees it immediately
- [ ] Name tag automatically shows correct person

### Statistics/Charts
- [ ] Pie chart shows expenses by category (combined)
- [ ] Bar chart shows expenses by person
- [ ] Line chart shows trends over time (both users)
- [ ] Option to toggle between "All", "Mine", "Partner's"

---

## 🎨 UI Examples

### Transaction Item Display
```
┌─────────────────────────────────────────┐
│ 💰 $85.50  Groceries                   │
│    Weekly shopping at supermarket       │
│    Added by Alex  •  Dec 1, 2024       │
│    [Edit] [Delete]                      │
├─────────────────────────────────────────┤
│ 💰 $95.75  Groceries                   │
│    Weekly groceries and snacks          │
│    Added by Partner  •  Dec 1, 2024    │
│    [View Only]                          │
└─────────────────────────────────────────┘
```

### Summary Card
```
┌──────────────────────────────────┐
│   December 2024 Summary          │
├──────────────────────────────────┤
│ Alex's Expenses:     $525.70    │
│ Partner's Expenses:  $546.25    │
│ ──────────────────────────────   │
│ Total Expenses:    $1,071.95    │
│                                  │
│ Alex's Income:     $3,700.00    │
│ Partner's Income:  $3,475.00    │
│ ──────────────────────────────   │
│ Total Income:      $7,175.00    │
│                                  │
│ Net Balance:      +$6,103.05 ✅ │
└──────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

### 1. Run Seed Script
```bash
# In Supabase Dashboard SQL Editor:
# Copy and paste: supabase/seed_test_data.sql
# Click "Run"
```

### 2. Verify Data Created
```sql
SELECT 'Profiles' AS type, COUNT(*)::text AS count FROM user_profiles
UNION ALL
SELECT 'Partnerships', COUNT(*)::text FROM partnerships
UNION ALL
SELECT 'Transactions', COUNT(*)::text FROM transactions
UNION ALL
SELECT 'Loans', COUNT(*)::text FROM loans;
```

**Expected**:
```
type          | count
--------------|------
Profiles      | 2
Partnerships  | 1
Transactions  | 20
Loans         | 4
```

### 3. Test in Your App
- Login as Alex → See all 20 transactions
- Login as Partner → See all 20 transactions
- Both users see same data! ✅

---

## 🔧 Troubleshooting

### Issue: Can't see partner's data
**Solution**: Check partnership is active
```sql
SELECT * FROM partnerships 
WHERE user1_id = '10f690b8-b8e9-423d-814e-ef6758d5104a'
   OR user2_id = '10f690b8-b8e9-423d-814e-ef6758d5104a';
```

### Issue: Name tags not showing
**Solution**: Check user profiles exist
```sql
SELECT * FROM user_profiles;
```

### Issue: Can edit partner's data
**Solution**: Check RLS policies
```sql
SELECT policyname, tablename 
FROM pg_policies 
WHERE tablename IN ('transactions', 'loans')
ORDER BY tablename, policyname;
```

---

## ✅ Success Criteria

Partnership sharing is working correctly when:

1. ✅ Both users see **all 20 transactions**
2. ✅ Both users see **all 4 loans**
3. ✅ Name tags correctly show "Alex" or "Partner"
4. ✅ Each user can **only edit their own** data
5. ✅ Combined totals show **$1,071.95** expenses
6. ✅ Combined totals show **$7,175.00** income
7. ✅ Charts and statistics include **both users' data**

---

**Ready to test!** 🎉 Run the seed script and login with either account to verify data sharing works correctly.

