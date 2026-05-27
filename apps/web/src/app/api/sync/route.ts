import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const syncPayloadSchema = z.object({
  projectId: z.string().uuid(),
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = syncPayloadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid payload structure', details: result.error.issues }, { status: 400 });
    }

    const { projectId, payloads } = result.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Internal server error: Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify project belongs to user
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 403 });
    }

    // Insert the encrypted snapshots
    const insertData = payloads.map(p => ({
      id: p.id,
      project_id: projectId,
      user_id: userId,
      timestamp: p.timestamp || new Date().toISOString(),
      iv: p.iv,
      auth_tag: p.auth_tag,
      encrypted_payload: p.encrypted_payload
    }));

    const { error: insertError } = await supabase
      .from('encrypted_snapshots')
      .insert(insertData);

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      return NextResponse.json({ error: 'Failed to insert encrypted snapshots' }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: payloads.length }, { status: 200 });

  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
