'use server';

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function joinWaitlist(email: string) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are missing.');
  }

  // Use the service role key to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Generate a secure beta key
  const betaKey = 'bs_' + crypto.randomBytes(16).toString('hex');

  // Insert into the waitlist
  const { error } = await supabase
    .from('waitlist')
    .insert([{ email, beta_key: betaKey }]);

  if (error) {
    if (error.code === '23505') {
      // 23505 is the PostgreSQL error code for unique violation
      // It means they are already on the waitlist. We can return success or handle it gracefully.
      return { success: true, betaKey, existing: true };
    }
    console.error('Supabase waitlist error:', error);
    throw new Error('Failed to join the waitlist.');
  }

  return { success: true, betaKey, existing: false };
}
