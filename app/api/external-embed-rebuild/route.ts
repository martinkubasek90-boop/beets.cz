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

const extractMeta = (html: string, key: string) => {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

const buildIframe = (src: string) =>
  `<iframe style="border: 0; width: 100%; height: 152px;" src="${src}" seamless></iframe>`;

const extractEmbedSrc = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/src=["']([^"']+)["']/i);
  return match?.[1] || null;
};

const extractEmbedAnchor = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/<a[^>]+href=["']([^"']+)["']/i);
  return match?.[1] || null;
};

const extractProjectUrlFromEmbed = (value?: string | null) => {
  const anchor = extractEmbedAnchor(value);
  if (anchor) return anchor;
  const src = extractEmbedSrc(value);
  if (!src) return null;
  if (src.includes('w.soundcloud.com/player/')) {
    try {
      const url = new URL(src);
      const raw = url.searchParams.get('url');
      return raw ? decodeURIComponent(raw) : null;
    } catch {
      return null;
    }
  }
  if (src.includes('open.spotify.com/embed/')) {
    return src.replace('open.spotify.com/embed/', 'open.spotify.com/');
  }
  return src;
};

const fetchEmbed = async (target: string) => {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return { html: null, reason: 'invalid_url' } as const;
  }
  const provider = providers.find((item) => item.match(parsed.hostname));
  if (!provider) return { html: null, reason: 'unsupported_host' } as const;
  const response = await fetch(provider.buildUrl(target), {
    headers: { 'User-Agent': 'beets-metadata', Accept: 'application/json' },
    cache: 'no-store',
  });
  if (response.ok) {
    const data = (await response.json()) as { html?: string };
    if (data?.html) return { html: data.html, reason: null } as const;
  }

  if (provider.name === 'Bandcamp') {
    try {
      const pageResponse = await fetch(target, {
        headers: { 'User-Agent': 'beets-metadata', Accept: 'text/html' },
        cache: 'no-store',
      });
      if (!pageResponse.ok) return { html: null, reason: `bandcamp_status_${pageResponse.status}` } as const;
      const html = await pageResponse.text();
      const videoSrc = extractMeta(html, 'og:video') || extractMeta(html, 'twitter:player');
      if (videoSrc) return { html: buildIframe(videoSrc), reason: null } as const;
      return { html: null, reason: 'bandcamp_no_player' } as const;
    } catch {
      return { html: null, reason: 'bandcamp_fetch_failed' } as const;
    }
  }

  return { html: null, reason: `oembed_status_${response.status}` } as const;
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
  const force = Boolean(body?.force);
  const externalOnly = body?.externalOnly !== false;

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const baseQuery = supabase
      .from('projects')
      .select('id, project_url, purchase_url, embed_html')
      .order('id', { ascending: false })
      .limit(limit);
    let query = baseQuery;
    if (externalOnly) {
      query = query.or(
        [
          'project_url.ilike.%spotify.com%',
          'project_url.ilike.%soundcloud.com%',
          'project_url.ilike.%bandcamp.com%',
          'purchase_url.ilike.%spotify.com%',
          'purchase_url.ilike.%soundcloud.com%',
          'purchase_url.ilike.%bandcamp.com%',
          'embed_html.ilike.%spotify.com%',
          'embed_html.ilike.%soundcloud.com%',
          'embed_html.ilike.%bandcamp.com%',
        ].join(',')
      );
    }
    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
    if (externalOnly && rows.length === 0) {
      const { data: fallback, error: fallbackError } = await baseQuery;
      if (fallbackError) throw fallbackError;
      rows = fallback || [];
    }

    rows = force ? rows : rows.filter((row) => !row.embed_html || row.embed_html.trim() === '');

    const updated: number[] = [];
    const skipped: Array<{ id: number; reason: string; target?: string | null }> = [];
    for (const row of rows) {
      let target = row.project_url || row.purchase_url;
      if (!target && row.embed_html) {
        const derived = extractProjectUrlFromEmbed(row.embed_html);
        if (derived) {
          target = derived;
          try {
            await supabase.from('projects').update({ project_url: derived }).eq('id', row.id);
          } catch (err) {
            console.warn('Uložení odvozeného odkazu selhalo:', err);
          }
        }
      }
      if (!target) {
        skipped.push({ id: row.id, reason: 'no_target' });
        continue;
      }
      if (!force && row.embed_html && row.embed_html.includes('<iframe')) {
        skipped.push({ id: row.id, reason: 'already_has_embed', target });
        continue;
      }
      const result = await fetchEmbed(target);
      if (!result.html) {
        skipped.push({ id: row.id, reason: result.reason || 'no_embed', target });
        continue;
      }
      const { error: updateError } = await supabase
        .from('projects')
        .update({ embed_html: result.html })
        .eq('id', row.id);
      if (!updateError) updated.push(row.id);
    }

    return NextResponse.json({
      updated,
      count: updated.length,
      skipped,
      skippedCount: skipped.length,
    });
  } catch (err: any) {
    console.error('external-embed-rebuild failed:', err);
    return NextResponse.json({ error: err?.message || 'embed rebuild failed' }, { status: 500 });
  }
}
