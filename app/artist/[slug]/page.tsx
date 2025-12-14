import { redirect, notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    notFound();
  }

  // Service client (obejde RLS)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    notFound();
  }
  const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const slugLower = decoded.toLowerCase();
  const selectBase =
    'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

  // Najdi profil podle slugu (nebo UUID v URL)
  const { data: profile, error } = await service
    .from('profiles')
    .select(selectBase)
    .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
    .maybeSingle();

  if (error) {
    console.error('Service profile fetch failed:', error);
  }

  // Pokud nenalezeno a URL vypadá jako UUID, zkus id.eq ještě jednou
  let finalProfile = profile;
  if (!finalProfile && UUID_REGEX.test(decoded)) {
    const { data: byId } = await service.from('profiles').select(selectBase).eq('id', decoded).maybeSingle();
    finalProfile = byId ?? null;
  }

  if (!finalProfile) {
    notFound();
  }

  // kanonický slug redirect
  if (finalProfile.slug && finalProfile.slug !== decoded) {
    redirect(`/artist/${finalProfile.slug}`);
  }

  return <PublicProfileClient profileId={finalProfile.id} initialProfile={finalProfile} />;
}
