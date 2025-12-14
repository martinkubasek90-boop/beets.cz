import { NextResponse, NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Čistý SSR endpoint: načte profil podle slugu/ID přes service role, vrátí JSON nebo 404.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: slugParam } = await params;
  const decoded = decodeURIComponent(slugParam || '').trim();
  if (!decoded || decoded === 'undefined') {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'missing service role env' }, { status: 500 });
  }

  const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const slugLower = decoded.toLowerCase();
  const selectBase =
    'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

  const { data, error } = await service
    .from('profiles')
    .select(selectBase)
    .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
