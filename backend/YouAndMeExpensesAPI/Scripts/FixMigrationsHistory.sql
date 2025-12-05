-- Manually add InitialCreate migration to history since tables already exist
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251205070007_InitialCreate', '7.0.0')
ON CONFLICT DO NOTHING;

-- Now create the data_clearing_requests table
CREATE TABLE IF NOT EXISTS data_clearing_requests (
    id uuid NOT NULL,
    requester_user_id uuid NOT NULL,
    partner_user_id uuid NULL,
    requester_confirmed boolean NOT NULL DEFAULT true,
    partner_confirmed boolean NOT NULL DEFAULT false,
    confirmation_token character varying(255) NULL,
    status character varying(50) NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    executed_at timestamp with time zone NULL,
    notes text NULL,
    CONSTRAINT "PK_data_clearing_requests" PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "IX_data_clearing_requests_requester_user_id" 
    ON data_clearing_requests (requester_user_id);
    
CREATE INDEX IF NOT EXISTS "IX_data_clearing_requests_confirmation_token" 
    ON data_clearing_requests (confirmation_token);
    
CREATE INDEX IF NOT EXISTS "IX_data_clearing_requests_status" 
    ON data_clearing_requests (status);

-- Create sequence if needed
CREATE SEQUENCE IF NOT EXISTS data_clearing_requests_id_seq;

-- Mark the AddDataClearingRequests migration as applied
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251205080841_AddDataClearingRequests', '7.0.0')
ON CONFLICT DO NOTHING;

SELECT 'Migration history fixed and data_clearing_requests table created!' as status;

