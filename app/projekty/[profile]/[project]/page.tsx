import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicProjectClient from '@/components/public-project-client';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getProfileBySlug = async (slug: string) => {
  const supabase = await createClient();
  const slugValue = slug.toLowerCase();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, slug')
    .or(`slug.eq.${slugValue},slug.ilike.${slugValue}`)
    .maybeSingle();

  if (profile) return profile;

  const baseName = slugValue.replace(/-/g, ' ').trim();
  if (!baseName) return null;

  const { data: byName } = await supabase
    .from('profiles')
    .select('id, display_name, slug')
    .ilike('display_name', baseName)
    .maybeSingle();

  return byName ?? null;
};

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ profile: string; project: string }>;
}) {
  const { profile: profileParam, project: projectParam } = await params;
  const rawProfile = decodeURIComponent(profileParam || '').trim();
  const rawProject = decodeURIComponent(projectParam || '').trim();
  if (!rawProfile || !rawProject) {
    notFound();
  }

  const profile = await getProfileBySlug(rawProfile);
  if (!profile) {
    notFound();
  }

  const canonicalProfileSlug = slugify(profile.display_name || profile.slug || rawProfile);
  if (canonicalProfileSlug && canonicalProfileSlug !== rawProfile) {
    return redirect(`/projekty/${canonicalProfileSlug}/${rawProject}`);
  }

  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from('projects')
    .select(
      'id,title,description,cover_url,tracks_json,release_formats,purchase_url,project_url,access_mode,access_password_hash'
    )
    .eq('user_id', profile.id)
    .in('access_mode', ['public', 'request']);

  if (error || !projects || projects.length === 0) {
    notFound();
  }

  const matched = projects.find((item) => slugify(item.title || '') === rawProject);
  if (!matched) {
    notFound();
  }

  const canonicalProjectSlug = slugify(matched.title || '');
  if (canonicalProjectSlug && canonicalProjectSlug !== rawProject) {
    return redirect(`/projekty/${canonicalProfileSlug}/${canonicalProjectSlug}`);
  }

  const requiresPassword = matched.access_mode === 'request' && !!matched.access_password_hash;
  const { access_password_hash: _ignored, ...projectData } = matched as typeof matched & {
    access_password_hash?: string | null;
  };

  return (
    <PublicProjectClient
      project={projectData}
      authorName={profile.display_name || 'Autor'}
      authorUrl={profile.slug ? `/u/${profile.slug}` : profile.id ? `/u/${profile.id}` : null}
      requiresPassword={requiresPassword}
    />
  );
}
