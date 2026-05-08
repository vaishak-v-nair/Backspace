import { createClient } from "@supabase/supabase-js";

/**
 * Creates an authenticated Supabase client using a Clerk session token.
 * This guarantees that Supabase Row-Level Security (RLS) policies 
 * can read the correct `auth.uid()`.
 */
export function createClerkSupabaseClient(clerkToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // Forward the Clerk JWT to Supabase
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      },
    }
  );
}
