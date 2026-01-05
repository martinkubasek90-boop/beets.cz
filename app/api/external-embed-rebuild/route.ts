import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const providers = [
  {
    name: 'Spotify',
    match: (host: string) => host === 'open.spotify.com' || host.endsWith('.spotify.com'),
    buildUrl: (target: string) => `https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`,
  },
  {
    name: 'SoundCloud',
    match: (host: string) => host === 'soundcloud.com' || host.endsWith('.soundcloud.com'),
    buildUrl: (target: string) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(target)}`,
  },
  {
    name: 'Bandcamp',
    match: (host: string) => host === 'bandcamp.com' || host.endsWith('.bandcamp.com'),
    buildUrl: (target: string) => `https://bandcamp.com/oembed?format=json&url=${encodeURIComponent(target)}`,
  },
];

const fetchEmbed = async (target: string) => {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return null;
  }
  const provider = providers.find((item) => item.match(parsed.hostname));
  if (!provider) return null;
  const response = await fetch(provider.buildUrl(target), {
    headers: { 'User-Agent': 'beets-metadata', Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { html?: string };
  return data?.html || null;
};

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.EMBED_REBUILD_TOKEN;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase service env' }, { status: 500 });
  }

  const headerToken = request.headers.get('x-rebuild-token');
  if (token && headerToken !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Number(body?.limit) || 25, 100);

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_url, purchase_url, embed_html')
      .or('embed_html.is.null,embed_html.eq.""')
      .limit(limit);
    if (error) throw error;

    const updated: number[] = [];
    for (const row of data || []) {
      const target = row.project_url || row.purchase_url;
      if (!target) continue;
      const html = await fetchEmbed(target);
      if (!html) continue;
      const { error: updateError } = await supabase
        .from('projects')
        .update({ embed_html: html })
        .eq('id', row.id);
      if (!updateError) updated.push(row.id);
    }

    return NextResponse.json({ updated, count: updated.length });
  } catch (err: any) {
    console.error('external-embed-rebuild failed:', err);
    return NextResponse.json({ error: err?.message || 'embed rebuild failed' }, { status: 500 });
  }
}
