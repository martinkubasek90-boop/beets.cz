import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase service env' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const projectId = body?.projectId;
  const embedHtml = typeof body?.embed_html === 'string' ? body.embed_html.trim() : '';
  if (!projectId || !embedHtml) {
    return NextResponse.json({ error: 'Missing projectId or embed_html' }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const { error } = await supabase
      .from('projects')
      .update({ embed_html: embedHtml })
      .eq('id', projectId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('external-embed-cache failed:', err);
    return NextResponse.json({ error: err?.message || 'embed cache failed' }, { status: 500 });
  }
}
