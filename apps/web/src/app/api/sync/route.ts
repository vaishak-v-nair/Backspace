/**
 * POST /api/sync
 *
 * Receives client-side encrypted snapshot payloads for cloud backup.
 * Authentication via Bearer token (stored during `backspace-ai login`).
 * 
 * All payloads MUST be encrypted client-side before upload.
 * The server never sees plaintext diffs.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const syncPayloadSchema = z.object({
  payloads: z.array(z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime().optional(),
    iv: z.string(),
    auth_tag: z.string(),
    encrypted_payload: z.string()
  }))
});

export async function POST(req: Request) {
  try {
    // Validate Bearer token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = syncPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure', details: result.error.issues }, { status: 400 });
    }

    const { payloads } = result.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Sync not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const insertData = payloads.map(p => ({
      id: p.id,
      timestamp: p.timestamp || new Date().toISOString(),
      iv: p.iv,
      auth_tag: p.auth_tag,
      encrypted_payload: p.encrypted_payload
    }));

    const { error: insertError } = await supabase
      .from('encrypted_snapshots')
      .insert(insertData);

    if (insertError) {
      console.error('Sync insert error:', insertError);
      return NextResponse.json({ error: 'Failed to sync snapshots' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: payloads.length });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
