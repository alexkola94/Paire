# Supabase Database Setup

This directory contains the database schema and configuration for the You & Me Expenses application.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Create a new project
4. Note down your project URL and anon key

### 2. Run Database Schema

#### Option A: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `schema.sql`
4. Paste and run the SQL script

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 3. Create Storage Bucket

1. In Supabase dashboard, navigate to **Storage**
2. Create a new bucket named `receipts`
3. Set it as **Public** bucket
4. Configure the bucket policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Allow users to view receipts
CREATE POLICY "Users can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- Allow users to delete their receipts
CREATE POLICY "Users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
```

### 4. Configure Environment Variables

Update your frontend `.env` file:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database Schema Overview

### Tables

#### `transactions`
Stores both expenses and income transactions.

**Columns:**
- `id` - UUID primary key
- `user_id` - Reference to authenticated user
- `type` - 'expense' or 'income'
- `amount` - Transaction amount (decimal)
- `category` - Transaction category
- `description` - Optional description
- `date` - Transaction date
- `attachment_url` - URL to receipt/document
- `attachment_path` - Storage path for file
- `created_at` - Timestamp
- `updated_at` - Timestamp

#### `loans`
Stores loans (money lent or borrowed).

**Columns:**
- `id` - UUID primary key
- `user_id` - Reference to authenticated user
- `type` - 'given' (lent) or 'received' (borrowed)
- `party_name` - Name of other party
- `total_amount` - Total loan amount
- `remaining_amount` - Amount still owed
- `due_date` - Optional due date
- `description` - Optional description
- `status` - 'active' or 'completed'
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own data
- All queries are automatically filtered by user ID
- Authentication is required for all operations

### Indexes

Indexes are created on frequently queried columns:
- User IDs for all tables
- Transaction type, date, and category
- Loan type and status

## Testing

After setup, test your database connection:

1. Sign up a new user in your app
2. Create a test expense
3. Create a test income entry
4. Create a test loan
5. Upload a receipt file

All operations should work seamlessly with Row Level Security enforcing data isolation.

## Backup & Maintenance

Supabase automatically backs up your database. To manually backup:

1. Go to **Database** > **Backups** in Supabase dashboard
2. Create a manual backup before major changes
3. Download backups for local storage

## Troubleshooting

### Common Issues

1. **RLS Policies blocking queries**
   - Ensure you're authenticated
   - Check that `auth.uid()` matches `user_id`

2. **Storage upload fails**
   - Verify bucket exists and is public
   - Check storage policies are set correctly

3. **Connection errors**
   - Verify environment variables are set
   - Check Supabase project is active
   - Ensure anon key is correct

For more help, visit [Supabase Documentation](https://supabase.com/docs)

