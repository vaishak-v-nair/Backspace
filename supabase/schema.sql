-- supabase/schema.sql
-- Production SQL schema for the Backspace multi-tenant database.

-- 1. Create the snapshots table
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- user_id corresponds to the Clerk User ID
    user_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- The sanitized prompt context
    prompt_context TEXT NOT NULL,
    -- JSONB for efficient diff storage
    file_paths JSONB NOT NULL,
    diff_data JSONB NOT NULL,
    
    -- Performance index
    CONSTRAINT snapshots_user_id_idx UNIQUE (id, user_id)
);

-- Index for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);

-- 2. Enable Row-Level Security (RLS)
-- This is the core of the Zero-Trust multi-tenant architecture.
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
-- Users can ONLY select their own snapshots
CREATE POLICY "Users can view their own snapshots" 
ON snapshots FOR SELECT 
USING (requesting_user_id() = user_id);

-- Users can ONLY insert their own snapshots
CREATE POLICY "Users can insert their own snapshots" 
ON snapshots FOR INSERT 
WITH CHECK (requesting_user_id() = user_id);

-- Users can ONLY delete their own snapshots
CREATE POLICY "Users can delete their own snapshots" 
ON snapshots FOR DELETE 
USING (requesting_user_id() = user_id);

-- 4. Helper function to extract Clerk ID from the JWT
-- Clerk sends a custom JWT. We extract the 'sub' (subject) claim which is the user ID.
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '');
$$ LANGUAGE SQL STABLE;

-- 5. Waitlist table (used by the landing page /api/waitlist route)
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS on with no public policies: only the service-role key (used
-- server-side by the API route) can read or write waitlist rows.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
