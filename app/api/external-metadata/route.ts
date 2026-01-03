import { NextResponse } from 'next/server';

type Provider = {
  name: string;
  match: (host: string) => boolean;
  buildUrl: (target: string) => string;
};

const providers: Provider[] = [
  {
    name: 'Spotify',
    match: (host) => host === 'open.spotify.com' || host.endsWith('.spotify.com'),
    buildUrl: (target) => `https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`,
  },
  {
    name: 'SoundCloud',
    match: (host) => host === 'soundcloud.com' || host.endsWith('.soundcloud.com'),
    buildUrl: (target) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(target)}`,
  },
  {
    name: 'Bandcamp',
    match: (host) => host === 'bandcamp.com' || host.endsWith('.bandcamp.com'),
    buildUrl: (target) => `https://bandcamp.com/oembed?format=json&url=${encodeURIComponent(target)}`,
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

const extractBandcampArtist = (description?: string | null) => {
  if (!description) return null;
  const match = description.match(/by\\s+([^|•]+)/i);
  return match?.[1]?.trim() || null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url')?.trim();
  if (!target) {
    return NextResponse.json({ error: 'Chybí URL.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: 'Neplatná URL.' }, { status: 400 });
  }

  const provider = providers.find((item) => item.match(parsed.hostname));
  if (!provider) {
    return NextResponse.json({ error: 'Podporujeme pouze Spotify, SoundCloud nebo Bandcamp.' }, { status: 400 });
  }

  try {
    const oembedUrl = provider.buildUrl(target);
    const response = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'beets-metadata',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (provider.name === 'Bandcamp') {
        try {
          const pageResponse = await fetch(target, {
            headers: {
              'User-Agent': 'beets-metadata',
              Accept: 'text/html',
            },
            cache: 'no-store',
          });
          if (pageResponse.ok) {
            const html = await pageResponse.text();
            const title = extractMeta(html, 'og:title') || 'Bandcamp projekt';
            const cover = extractMeta(html, 'og:image');
            const description = extractMeta(html, 'og:description');
            const artist = extractBandcampArtist(description);
            return NextResponse.json({
              title,
              artist,
              cover,
              link: target,
              provider: provider.name,
              embed_html: null,
            });
          }
        } catch (err) {
          console.error('bandcamp fallback error', err);
        }
      }
      return NextResponse.json({ error: 'Metadata se nepodařilo načíst.' }, { status: 502 });
    }

    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
      html?: string;
    };

    return NextResponse.json({
      title: data.title || 'Neznámý projekt',
      artist: data.author_name || null,
      cover: data.thumbnail_url || null,
      link: target,
      provider: data.provider_name || provider.name,
      embed_html: data.html || null,
    });
  } catch (err) {
    console.error('external-metadata error', err);
    return NextResponse.json({ error: 'Metadata se nepodařilo načíst.' }, { status: 502 });
  }
}
