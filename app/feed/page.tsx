import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { FeedList, type FeedItem } from '@/components/feed-list';

// Prozatím čteme napříč tabulkami; ideálně nahradit tabulkou activity_feed.
async function loadFeed() {
  const supabase = await createClient();

  const [beats, projects, acapellas, collabs] = await Promise.all([
    supabase
      .from('beats')
      .select('id, title, user_id, created_at, audio_url, cover_url, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('projects')
      .select('id, title, user_id, created_at, cover_url, tracks_json, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('acapellas')
      .select('id, title, user_id, created_at, audio_url, cover_url, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('collab_threads')
      .select('id, title, status, updated_at, created_by, collab_participants(user_id, profiles(display_name, slug))')
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  const items: FeedItem[] = [];

  beats.data?.forEach((b) => {
    const author = (b as any).profiles?.display_name || 'Autor';
    const slug = (b as any).profiles?.slug;
    const profileUrl = slug ? `/artist/${slug}` : b.user_id ? `/u/${b.user_id}` : '#';
    items.push({
      type: 'beat',
      title: b.title || 'Nový beat',
      url: `/beats?highlight=${b.id}`,
      author,
      when: b.created_at,
      extra: profileUrl,
      coverUrl: (b as any).cover_url ?? null,
      audioUrl: (b as any).audio_url ?? null,
    });
  });

  projects.data?.forEach((p) => {
    const author = (p as any).profiles?.display_name || 'Autor';
    const slug = (p as any).profiles?.slug;
    const profileUrl = slug ? `/artist/${slug}` : p.user_id ? `/u/${p.user_id}` : '#';
    items.push({
      type: 'project',
      title: p.title || 'Nový projekt',
      url: `/projects?highlight=${p.id}`,
      author,
      when: p.created_at,
      extra: profileUrl,
      coverUrl: (p as any).cover_url ?? null,
      audioUrl: Array.isArray((p as any).tracks_json) ? (p as any).tracks_json[0]?.url ?? null : null,
    });
  });

  acapellas.data?.forEach((a) => {
    const author = (a as any).profiles?.display_name || 'Autor';
    const slug = (a as any).profiles?.slug;
    const profileUrl = slug ? `/artist/${slug}` : a.user_id ? `/u/${a.user_id}` : '#';
    items.push({
      type: 'acapella',
      title: a.title || 'Nová akapela',
      url: `/accapelas?highlight=${a.id}`,
      author,
      when: a.created_at,
      extra: profileUrl,
      coverUrl: (a as any).cover_url ?? null,
      audioUrl: (a as any).audio_url ?? null,
    });
  });

  collabs.data?.forEach((c) => {
    const others = ((c as any).collab_participants || [])
      .map((p: any) => p.profiles?.display_name)
      .filter(Boolean)
      .join(' • ');
    const title = c.title || 'Spolupráce';
    items.push({
      type: 'collab',
      title,
      url: `/collabs?highlight=${c.id}`,
      author: others || 'Spolupracující',
      when: c.updated_at,
      extra: c.status,
    });
  });

  return items
    .filter((i) => i.when)
    .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime())
    .slice(0, 30);
}

export default async function FeedPage() {
  const items = await loadFeed();

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Novinky</p>
            <h1 className="text-2xl font-bold">Feed</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Nejnovější projekty, beaty, akapely a spolupráce.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[12px] uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět na homepage
          </Link>
        </div>

        <FeedList
          items={
            items.length === 0
              ? [
                  {
                    type: 'project',
                    title: 'Nový projekt: Raindrops',
                    author: 'Nineteez',
                    when: new Date().toISOString(),
                    url: '/projects',
                    extra: '/artist/nineteez',
                    coverUrl: '/mpc-hero.jpg',
                  },
                  {
                    type: 'beat',
                    title: 'Beat: Night Tram 93',
                    author: 'Blockboy',
                    when: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
                    url: '/beats',
                    extra: '/artist/blockboy',
                    coverUrl: '/mpc-hero.jpg',
                    audioUrl: '/demo-beat.mp3',
                  },
                  {
                    type: 'collab',
                    title: 'Spolupráce „Cypher Praha“ dokončena',
                    author: 'LoFi Karel • Northside',
                    when: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
                    url: '/collabs',
                    extra: 'done',
                  },
                  {
                    type: 'acapella',
                    title: 'Akapela: Hook idea',
                    author: 'Quin',
                    when: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
                    url: '/accapelas',
                    extra: '/artist/quin',
                    coverUrl: '/mpc-hero.jpg',
                    audioUrl: '/demo-acapella.mp3',
                  },
                ]
              : items
          }
        />
      </div>
    </main>
  );
}
