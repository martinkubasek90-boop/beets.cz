import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('share_links')
    .select('item_type,item_id,allow_download,expires_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const isExpired = row.expires_at && new Date(row.expires_at).getTime() < Date.now();
  if (isExpired) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 });
  }

  let resourceUrl: string | null = null;
  if (row.item_type === 'beat') {
    const { data } = await supabase.from('beats').select('audio_url,title,user_id,cover_url,profiles!inner(slug,display_name)').eq('id', row.item_id).maybeSingle();
    if (data?.audio_url) resourceUrl = data.audio_url;
    return NextResponse.json({
      ok: true,
      item_type: row.item_type,
      item_id: row.item_id,
      allow_download: row.allow_download,
      audio_url: data?.audio_url ?? null,
      title: (data as any)?.title ?? null,
      cover_url: (data as any)?.cover_url ?? null,
      author_slug: (data as any)?.profiles?.slug ?? null,
      author_name: (data as any)?.profiles?.display_name ?? null,
    });
  }

  if (row.item_type === 'project') {
    const { data } = await supabase
      .from('projects')
      .select('title,user_id,cover_url,tracks_json,profiles!inner(slug,display_name)')
      .eq('id', row.item_id)
      .maybeSingle();
    const firstTrack = Array.isArray((data as any)?.tracks_json) ? (data as any).tracks_json[0] : null;
    if (firstTrack?.url) resourceUrl = firstTrack.url;
    return NextResponse.json({
      ok: true,
      item_type: row.item_type,
      item_id: row.item_id,
      allow_download: row.allow_download,
      audio_url: resourceUrl,
      title: (data as any)?.title ?? null,
      cover_url: (data as any)?.cover_url ?? null,
      author_slug: (data as any)?.profiles?.slug ?? null,
      author_name: (data as any)?.profiles?.display_name ?? null,
    });
  }

  return NextResponse.json({ error: 'Unsupported item_type' }, { status: 400 });
}
