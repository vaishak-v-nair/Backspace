-- Migration: 00001_init_backspace_schema.sql
-- Description: Initialize the base schema for Backspace including users, projects, and snapshots with RLS.

-- 1. Create the Users Table (Links to Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Function to handle new user signup from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create a public.user record
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Create the Projects Table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    repo_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create the Snapshots Table
CREATE TABLE public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    prompt_context TEXT,
    file_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
    diff_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies

-- Users Policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- Snapshots Policies
-- For snapshots, we need to ensure the user owns the project the snapshot belongs to.
CREATE POLICY "Users can view snapshots of their own projects"
    ON public.snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = snapshots.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert snapshots into their own projects"
    ON public.snapshots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update snapshots of their own projects"
    ON public.snapshots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = snapshots.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete snapshots of their own projects"
    ON public.snapshots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = snapshots.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- 6. Performance Indexes
-- B-tree indexes for high-speed timeline scrubbing based on project and timestamp
CREATE INDEX idx_snapshots_project_id ON public.snapshots USING btree (project_id);
CREATE INDEX idx_snapshots_timestamp ON public.snapshots USING btree (timestamp DESC);
