import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfileLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slugOrId = decodeURIComponent(rawSlug || '').trim();
  if (!slugOrId) {
    notFound();
  }

  const supabase = await createClient();
  const selectBase =
    'id, display_name, bio, avatar_url, banner_url, role, slug, hardware';
  const isUuid = UUID_REGEX.test(slugOrId);

  const query = supabase.from('profiles').select(selectBase).limit(1);
  if (isUuid) {
    query.eq('id', slugOrId);
  } else {
    query.or(`slug.eq.${slugOrId},slug.ilike.${slugOrId}`);
  }

  const { data: profile, error } = await query.maybeSingle();
  if (error) {
    console.error('Chyba při načítání profilu (landing):', error);
  }

  const profileId = profile?.id || (isUuid ? slugOrId : null);
  if (isUuid && profile?.slug && profile.slug !== slugOrId) {
    return redirect(`/profile/${profile.slug}`);
  }
  if (!profileId) {
    notFound();
  }

  const { data: beats } = await supabase
    .from('beats')
    .select('id, title, bpm, mood, cover_url')
    .eq('user_id', profileId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, description, cover_url, access_mode')
    .eq('user_id', profileId)
    .eq('access_mode', 'public')
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: profile?.banner_url
                ? `url(${profile.banner_url})`
                : 'radial-gradient(circle at 30% 20%, rgba(255,122,24,0.2), transparent 55%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-white/20 bg-white/10">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.display_name || 'Profil'} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs uppercase tracking-[0.2em] text-white/50">
                  BEETS
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                {profile?.display_name || 'Profil beatu'}
              </h1>
              {profile?.role ? (
                <p className="text-sm uppercase tracking-[0.25em] text-white/60">
                  {profile.role}
                </p>
              ) : null}
              {profile?.bio ? (
                <p className="max-w-2xl text-sm text-white/70">{profile.bio}</p>
              ) : null}
              {profile?.hardware ? (
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                  {profile.hardware}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href={`/u/${profile?.slug || profileId}`}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:border-white/40"
              >
                Veřejný profil
              </Link>
              <Link
                href="/projects"
                className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/20 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-[var(--mpc-accent)]/30"
              >
                Všechny projekty
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Top beaty</h2>
              <span className="text-xs text-white/40">{beats?.length || 0}</span>
            </div>
            <div className="space-y-4">
              {(beats || []).map((beat) => (
                <div
                  key={beat.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3"
                >
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {beat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{beat.title}</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                      {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                    </div>
                  </div>
                </div>
              ))}
              {(!beats || beats.length === 0) && (
                <p className="text-sm text-white/50">Zatím žádné veřejné beaty.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">Top projekty</h2>
              <span className="text-xs text-white/40">{projects?.length || 0}</span>
            </div>
            <div className="space-y-4">
              {(projects || []).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3"
                >
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {project.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{project.title}</div>
                    {project.description ? (
                      <div className="text-xs text-white/50 line-clamp-2">{project.description}</div>
                    ) : null}
                  </div>
                </div>
              ))}
              {(!projects || projects.length === 0) && (
                <p className="text-sm text-white/50">Zatím žádné veřejné projekty.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
