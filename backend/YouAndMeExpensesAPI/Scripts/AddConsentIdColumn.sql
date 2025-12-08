-- Add consent_id column to bank_connections table
-- This column stores the Enable Banking consent_id for revoking consent when disconnecting

ALTER TABLE bank_connections 
ADD COLUMN IF NOT EXISTS consent_id TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN bank_connections.consent_id IS 'Enable Banking consent ID used for revoking consent when disconnecting bank accounts';

