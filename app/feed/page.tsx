import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

// Prozatím čteme napříč tabulkami; ideálně nahradit tabulkou activity_feed.
async function loadFeed() {
  const supabase = await createClient();

  const [beats, projects, acapellas, collabs] = await Promise.all([
    supabase
      .from('beats')
      .select('id, title, user_id, created_at, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('projects')
      .select('id, title, user_id, created_at, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('acapellas')
      .select('id, title, user_id, created_at, profiles!inner(display_name, slug)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('collab_threads')
      .select('id, title, status, updated_at, created_by, collab_participants(user_id, profiles(display_name, slug))')
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  const items: Array<{
    type: 'beat' | 'project' | 'acapella' | 'collab';
    title: string;
    url: string;
    author: string;
    when: string | null;
    extra?: string;
  }> = [];

  beats.data?.forEach((b) => {
    const author = (b as any).profiles?.display_name || 'Autor';
    const slug = (b as any).profiles?.slug;
    const profileUrl = slug ? `/profile/${slug}` : b.user_id ? `/u/${b.user_id}` : '#';
    items.push({
      type: 'beat',
      title: b.title || 'Nový beat',
      url: `/beats?highlight=${b.id}`,
      author,
      when: b.created_at,
      extra: profileUrl,
    });
  });

  projects.data?.forEach((p) => {
    const author = (p as any).profiles?.display_name || 'Autor';
    const slug = (p as any).profiles?.slug;
    const profileUrl = slug ? `/profile/${slug}` : p.user_id ? `/u/${p.user_id}` : '#';
    items.push({
      type: 'project',
      title: p.title || 'Nový projekt',
      url: `/projects?highlight=${p.id}`,
      author,
      when: p.created_at,
      extra: profileUrl,
    });
  });

  acapellas.data?.forEach((a) => {
    const author = (a as any).profiles?.display_name || 'Autor';
    const slug = (a as any).profiles?.slug;
    const profileUrl = slug ? `/profile/${slug}` : a.user_id ? `/u/${a.user_id}` : '#';
    items.push({
      type: 'acapella',
      title: a.title || 'Nová akapela',
      url: `/accapelas?highlight=${a.id}`,
      author,
      when: a.created_at,
      extra: profileUrl,
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
            Domů
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--mpc-muted)]">Zatím žádné novinky.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const since = item.when ? formatDistanceToNow(new Date(item.when), { addSuffix: true, locale: cs }) : '';
              const badge =
                item.type === 'beat'
                  ? 'Beat'
                  : item.type === 'project'
                    ? 'Projekt'
                    : item.type === 'acapella'
                      ? 'Akapela'
                      : 'Spolupráce';

              return (
                <div
                  key={`${item.type}-${item.url}-${idx}`}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white">{badge}</span>
                    {since && <span>{since}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[var(--mpc-muted)]">· {item.author}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--mpc-muted)]">
                    <Link href={item.url} className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black">
                      Otevřít
                    </Link>
                    {item.extra && item.extra.startsWith('/profile') ? (
                      <Link href={item.extra} className="text-[var(--mpc-accent)] underline underline-offset-4">
                        Profil autora
                      </Link>
                    ) : null}
                    {item.type === 'collab' && item.extra ? <span>Status: {item.extra}</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
