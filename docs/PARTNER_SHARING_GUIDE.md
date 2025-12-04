# Partner Sharing System - Guide

## Overview
This app is designed for couples to share and track their expenses together. All data is visible to both partners, while still tracking who added what through **name tags**.

---

## How It Works

### 1. **User Profiles**
Each user has a profile with a **display name** (name tag) that shows who added each expense:
```sql
-- Example user profiles
user_id: 123e4567-e89b-12d3-a456-426614174000
display_name: "Alex"

user_id: 987fcdeb-51a2-43f7-8d9e-9876543210fe
display_name: "Partner Name"
```

### 2. **Partnerships**
Two users are linked together in a partnership:
```sql
-- Partnership linking Alex and Partner
user1_id: 123e4567-e89b-12d3-a456-426614174000
user2_id: 987fcdeb-51a2-43f7-8d9e-9876543210fe
status: 'active'
```

### 3. **Shared Data**
Once partnered, **both users can see ALL expenses and loans** from both accounts.

The `user_id` field tracks who created each record, and the display name shows it in the UI:
```sql
-- Example: Alex adds an expense
transaction:
  user_id: 123e4567-e89b-12d3-a456-426614174000
  amount: 50.00
  category: "Groceries"
  
-- UI shows: "Added by Alex"
```

---

## Setting Up a Partnership

### Step 1: Create User Profiles
When a user signs up, create their profile:

```sql
INSERT INTO user_profiles (id, display_name, email)
VALUES (
  auth.uid(),
  'Alex',  -- Your name tag
  'alex@example.com'
);
```

### Step 2: Link Partners
Create a partnership between two users:

```sql
INSERT INTO partnerships (user1_id, user2_id, status)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Alex's user_id
  '987fcdeb-51a2-43f7-8d9e-9876543210fe',  -- Partner's user_id
  'active'
);
```

**Important Notes:**
- Only one partnership per pair (enforced by UNIQUE constraint)
- Can't partner with yourself (enforced by CHECK constraint)
- Set status to 'inactive' to temporarily disable sharing

---

## What Each User Can See

### ✅ What You CAN See:
- **All your transactions** (expenses & income)
- **All your partner's transactions** (expenses & income)
- **All your loans** (given & received)
- **All your partner's loans** (given & received)
- **Who added what** (via display name)
- **Your profile** (can edit)
- **Your partner's profile** (read-only)

### ❌ What You CANNOT Do:
- Edit or delete your partner's transactions
- Edit or delete your partner's loans
- Edit your partner's profile
- See data from users outside your partnership

---

## Example Queries

### Get All Shared Transactions
```sql
SELECT 
  t.*,
  up.display_name AS added_by
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE t.user_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM partnerships p
     WHERE p.status = 'active'
       AND ((p.user1_id = auth.uid() AND p.user2_id = t.user_id)
         OR (p.user2_id = auth.uid() AND p.user1_id = t.user_id))
   )
ORDER BY t.date DESC;
```

### Get Combined Monthly Summary
```sql
SELECT 
  DATE_TRUNC('month', date) AS month,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income
FROM transactions
WHERE user_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM partnerships p
     WHERE p.status = 'active'
       AND ((p.user1_id = auth.uid() AND p.user2_id = transactions.user_id)
         OR (p.user2_id = auth.uid() AND p.user1_id = transactions.user_id))
   )
GROUP BY month
ORDER BY month DESC;
```

### Get Who Added What
```sql
SELECT 
  up.display_name AS added_by,
  COUNT(*) AS transaction_count,
  SUM(t.amount) AS total_amount
FROM transactions t
LEFT JOIN user_profiles up ON t.user_id = up.id
WHERE type = 'expense'
  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY up.display_name;
```

### Check Your Partner
```sql
-- Using helper function
SELECT get_partner_id(auth.uid()) AS partner_user_id;

-- Get partner's profile
SELECT up.*
FROM user_profiles up
WHERE up.id = get_partner_id(auth.uid());
```

---

## Frontend Implementation

### Display Name Tags in UI
When showing transactions, display who added them:

```typescript
// Example React component
function TransactionItem({ transaction }) {
  return (
    <div className="transaction">
      <span className="amount">${transaction.amount}</span>
      <span className="category">{transaction.category}</span>
      <span className="added-by">Added by {transaction.user_profile.display_name}</span>
    </div>
  );
}
```

### Filter by Who Added
```typescript
// Filter to show only your expenses
const myExpenses = transactions.filter(t => t.user_id === currentUserId);

// Filter to show partner's expenses
const partnerExpenses = transactions.filter(t => t.user_id === partnerId);

// Show all (default)
const allExpenses = transactions; // Already filtered by RLS
```

---

## Security Features

### Row Level Security (RLS)
All tables have RLS policies that automatically:
- Show you your own data
- Show you your partner's data (if partnership is active)
- Hide data from non-partners
- Prevent editing/deleting partner's data

### What's Protected:
1. **Transactions**: You can only INSERT/UPDATE/DELETE your own
2. **Loans**: You can only INSERT/UPDATE/DELETE your own
3. **Profiles**: You can only UPDATE your own
4. **Partnerships**: Both partners can UPDATE (e.g., to deactivate)

---

## Migration Instructions

To apply this new sharing system to your database:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the migration
psql -h <host> -U postgres -d postgres -f supabase/migrations/20241204_add_partner_sharing.sql
```

---

## API Endpoints to Create

### Backend (C#) Controllers

```csharp
// GET /api/transactions - Returns all shared transactions
// GET /api/loans - Returns all shared loans
// GET /api/profile - Get current user's profile
// PUT /api/profile - Update current user's profile
// GET /api/partner - Get partner's profile
// POST /api/partnership - Create partnership (admin/invite system)
// GET /api/partnership - Get current partnership info
```

---

## Best Practices

### 1. Always Show Name Tags
In the UI, always display who added each transaction:
- Use different colors for different users
- Show avatar/icon next to name
- Add filter to view by person

### 2. Set Display Names at Signup
Prompt users to set their display name during onboarding:
```
"What should we call you?" 
→ "Alex" ✅
→ "Me" ❌ (not descriptive)
```

### 3. Handle Partnership Invites
Implement an invite system so partners can link accounts:
1. User A sends invite to User B (via email)
2. User B accepts invite
3. Partnership is created
4. Both users now see shared data

### 4. Show Combined Totals
In dashboards, show:
- **Total** (both partners combined)
- **Your portion** (your expenses)
- **Partner's portion** (partner's expenses)

---

## Troubleshooting

### Can't see partner's data?
- Check if partnership exists and status is 'active'
- Verify both users have profiles created
- Check RLS policies are enabled

### Want to stop sharing?
```sql
UPDATE partnerships
SET status = 'inactive'
WHERE user1_id = auth.uid() OR user2_id = auth.uid();
```

### Want to unlink completely?
```sql
DELETE FROM partnerships
WHERE user1_id = auth.uid() OR user2_id = auth.uid();
```

---

## Summary

🔹 **All data is shared** between partners  
🔹 **Name tags** identify who added what  
🔹 **user_id** tracks ownership  
🔹 **RLS policies** handle security automatically  
🔹 **Can only edit your own** transactions/loans  
🔹 **Can view everything** from both partners  

This creates a truly collaborative expense tracking experience! 💑💰

