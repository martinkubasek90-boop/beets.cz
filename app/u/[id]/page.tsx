import { notFound } from 'next/navigation';
import PublicProfileClient from '../../../components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawParam } = await params;
  const slugOrId = decodeURIComponent(rawParam || '').trim();
  if (!slugOrId) {
    notFound();
  }

  const supabase = await createClient();
  const selectBase = 'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug, last_seen_at';
  const isUuid = UUID_REGEX.test(slugOrId);

  // Podle parametru vyhledáme profil (slug nebo UUID).
  const query = supabase.from('profiles').select(selectBase).limit(1);
  if (isUuid) {
    query.eq('id', slugOrId);
  } else {
    query.or(`slug.eq.${slugOrId},slug.ilike.${slugOrId}`);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Chyba při načítání profilu:', error);
  }

  const profileId = data?.id || (isUuid ? slugOrId : null);
  if (!profileId) {
    notFound();
  }

  return <PublicProfileClient profileId={profileId} initialProfile={data ?? undefined} />;
}
