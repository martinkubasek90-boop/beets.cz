import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';

const selectBase =
  'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params?.id ?? '').trim();
  if (!id) {
    notFound();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1) Zkus přímo DB přes service role
  if (supabaseUrl && serviceKey) {
    try {
      const service = createSupabaseClient(supabaseUrl, serviceKey);
      const { data, error } = await service.from('profiles').select(selectBase).eq('id', id).maybeSingle();
      if (!error && data) {
        return <PublicProfileClient profileId={data.id} initialProfile={data} />;
      }
      if (error) {
        console.error('Service profile fetch error:', error);
      }
    } catch (err) {
      console.error('Service client failed:', err);
    }
  }

  // 2) Fallback: veřejné API, pokud by DB neprošla
  try {
    const res = await fetch(`https://beets.cz/api/public-profile/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const profile = json?.profile;
      if (profile?.id) {
        return <PublicProfileClient profileId={profile.id} initialProfile={profile} />;
      }
    }
  } catch (err) {
    console.error('Public API profile fetch failed:', err);
  }

  return <div className="p-8 text-white">Profil nenalezen.</div>;
}
