import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';

const selectBase =
  'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params?.id ?? '').trim();
  if (!id) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return <div className="p-8 text-white">Chybí konfigurace databáze.</div>;
  }

  const service = createSupabaseClient(supabaseUrl, serviceKey);
  const { data, error } = await service.from('profiles').select(selectBase).eq('id', id).maybeSingle();

  if (error) {
    console.error('Service profile fetch error:', error);
    return <div className="p-8 text-white">Profil nelze načíst.</div>;
  }
  if (!data) {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  return <PublicProfileClient profileId={data.id} initialProfile={data} />;
}
