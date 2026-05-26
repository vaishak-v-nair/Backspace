-- Migration: 00003_encrypted_snapshots_schema.sql
-- Description: Upgrading to a Zero-Knowledge Encrypted Ledger for the snapshots

-- Create the new table for encrypted snapshots
CREATE TABLE public.encrypted_snapshots (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    iv TEXT NOT NULL,           -- Initialization Vector for AES-GCM
    auth_tag TEXT NOT NULL,     -- Ensures the payload hasn't been tampered with
    encrypted_payload TEXT NOT NULL -- The completely unreadable AES-encrypted code diff
);

-- Enable RLS
ALTER TABLE public.encrypted_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view encrypted snapshots of their own projects"
    ON public.encrypted_snapshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert encrypted snapshots into their own projects"
    ON public.encrypted_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update encrypted snapshots of their own projects"
    ON public.encrypted_snapshots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete encrypted snapshots of their own projects"
    ON public.encrypted_snapshots FOR DELETE
    USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX idx_encrypted_snapshots_project_id ON public.encrypted_snapshots USING btree (project_id);
CREATE INDEX idx_encrypted_snapshots_user_id ON public.encrypted_snapshots USING btree (user_id);
CREATE INDEX idx_encrypted_snapshots_timestamp ON public.encrypted_snapshots USING btree (timestamp DESC);
