import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShareButton } from '@/components/share-button';

export default async function ProjectDetail({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id,title,description,cover_url,user_id,tracks_json,profiles!inner(display_name,slug)')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !project) {
    notFound();
  }

  const authorSlug = (project as any)?.profiles?.slug ?? null;
  const authorName = (project as any)?.profiles?.display_name ?? 'Autor';
  const authorUrl = authorSlug ? `/profile/${authorSlug}` : project.user_id ? `/u/${project.user_id}` : '/';
  const firstTrack = Array.isArray((project as any).tracks_json) ? (project as any).tracks_json[0] : null;

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <Link href="/projects" className="text-[12px] uppercase tracking-[0.16em] text-[var(--mpc-muted)] hover:text-[var(--mpc-accent)]">
          ← Zpět na projekty
        </Link>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          {project.cover_url && (
            <div
              className="h-48 w-full bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(${project.cover_url})`,
              }}
            />
          )}
          <div className="space-y-3 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Projekt</p>
            <h1 className="text-2xl font-bold">{project.title || 'Projekt'}</h1>
            <Link href={authorUrl} className="text-[var(--mpc-accent)] underline underline-offset-4">
              {authorName}
            </Link>
            {project.description && <p className="text-sm text-[var(--mpc-muted)]">{project.description}</p>}
            {firstTrack?.url ? (
              <audio controls className="mt-2 w-full">
                <source src={firstTrack.url} />
                Váš prohlížeč nepodporuje přehrávání.
              </audio>
            ) : (
              <p className="text-[12px] text-[var(--mpc-muted)]">Audio není k dispozici.</p>
            )}
            <ShareButton itemType="project" itemId={project.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
