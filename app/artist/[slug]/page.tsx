import PublicProfileClient from '@/components/public-profile-client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const selectBase =
  'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

export default async function ArtistProfilePage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params?.slug ?? '').trim();
  if (!slug) {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return <div className="p-8 text-white">Chybí konfigurace databáze.</div>;
  }

  const service = createSupabaseClient(supabaseUrl, serviceKey);
  const { data, error } = await service
    .from('profiles')
    .select(selectBase)
    .or(`slug.eq.${slug},slug.ilike.${slug}`)
    .maybeSingle();

  if (error) {
    console.error('Artist fetch failed:', error);
    return <div className="p-8 text-white">Profil nelze načíst.</div>;
  }
  if (!data) {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  return <PublicProfileClient profileId={data.id} initialProfile={data} />;
}
