import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { supabase } from '../../../lib/supabaseClient';
import type { Lang } from '../../../lib/i18n';
import { unstable_noStore as noStore } from 'next/cache';
import { Suspense } from 'react';

type BlogPost = {
  id: number;
  title: string;
  title_en?: string | null;
  excerpt: string;
  excerpt_en?: string | null;
  body: string | null;
  body_en?: string | null;
  author: string;
  date: string;
  cover_url: string | null;
  embed_url: string | null;
};

function normalizeEmbedUrl(url?: string | null) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url ?? '';
  }
}

async function getPost(id: string) {
  noStore();
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return data as BlogPost | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) {
    return { title: 'Článek nenalezen | News from Beats' };
  }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="p-6 text-center text-white">Načítám článek…</div>}>
      <PostContent id={id} />
    </Suspense>
  );
}

async function PostContent({ id }: { id: string }) {
  const post = await getPost(id);
  if (!post) return notFound();

  const cookieStore = await cookies();
  const lang = (cookieStore.get('lang')?.value as Lang | undefined) || 'cs';
  const title = lang === 'en' && post.title_en?.trim() ? post.title_en : post.title;
  const excerpt = lang === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt;
  const body = lang === 'en' && post.body_en?.trim() ? post.body_en : post.body;
  const embedSrc = normalizeEmbedUrl(post.embed_url);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between text-sm text-[var(--mpc-muted)]">
          <Link href="/" className="hover:text-[var(--mpc-light)]">
            ← Zpět na homepage
          </Link>
          <span>News from Beats</span>
        </div>

        <article className="space-y-4 rounded-2xl border border-white/10 bg-[var(--mpc-panel)] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
          {post.cover_url && (
            <div
              className="h-60 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5"
              style={{
                backgroundImage: `url(${post.cover_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between text-[12px] uppercase tracking-[0.1em] text-[var(--mpc-muted)] gap-2">
            <span>{post.author}</span>
            <span>{post.date}</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-white">{title}</h1>
          <p className="text-[15px] text-[var(--mpc-muted)]">{excerpt}</p>

          {embedSrc && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <iframe
                className="w-full"
                style={{ minHeight: '320px' }}
                src={embedSrc}
                title="Embed"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-[15px] text-[var(--mpc-light)] whitespace-pre-line leading-relaxed">
            {body || 'Celý text článku není k dispozici.'}
          </div>
        </article>
      </div>
    </main>
  );
}
