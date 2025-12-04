-- ============================================
-- Migration: Storage Policies
-- Created: 2024-12-04
-- Description: Sets up storage bucket and access policies
-- ============================================

-- Note: The bucket must be created first through Supabase Dashboard or CLI
-- This migration only sets up the policies

-- ============================================
-- STORAGE BUCKET POLICIES FOR RECEIPTS
-- ============================================

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own receipts
CREATE POLICY "Users can update their own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE HELPER FUNCTIONS
-- ============================================

-- Function to get receipt URL
CREATE OR REPLACE FUNCTION get_receipt_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Get project URL from config
  SELECT current_setting('app.settings.supabase_url', true) INTO project_url;
  
  -- Return full URL
  RETURN project_url || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete receipt file
CREATE OR REPLACE FUNCTION delete_receipt_file()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the storage object when transaction is deleted
  IF OLD.attachment_path IS NOT NULL THEN
    PERFORM storage.delete_object('receipts', OLD.attachment_path);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-delete receipt files when transaction is deleted
DROP TRIGGER IF EXISTS delete_receipt_on_transaction_delete ON transactions;
CREATE TRIGGER delete_receipt_on_transaction_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW
  WHEN (OLD.attachment_path IS NOT NULL)
  EXECUTE FUNCTION delete_receipt_file();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Authenticated users can upload receipts" ON storage.objects 
IS 'Allows authenticated users to upload files to their own folder in receipts bucket';

COMMENT ON POLICY "Users can view their own receipts" ON storage.objects 
IS 'Allows users to view only their own uploaded receipts';

COMMENT ON POLICY "Users can delete their own receipts" ON storage.objects 
IS 'Allows users to delete only their own uploaded receipts';

COMMENT ON FUNCTION get_receipt_url IS 'Helper function to generate full URL for receipt files';
COMMENT ON FUNCTION delete_receipt_file IS 'Automatically deletes receipt file from storage when transaction is deleted';

