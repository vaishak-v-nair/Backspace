-- 1. Create the Waitlist Table
CREATE TABLE public.waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    beta_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row-Level Security (RLS)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 3. The "Default Deny" Fortress
-- We intentionally DO NOT create an 'anon' insert policy here.
-- This prevents bots from finding your Supabase URL and spamming the waitlist.
-- Your Next.js Server Action will use the `SUPABASE_SERVICE_ROLE_KEY` to securely bypass this restriction.
