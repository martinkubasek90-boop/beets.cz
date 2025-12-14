import { redirect, notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import PublicProfileClient from '@/components/public-profile-client';

// Server-renderovaný veřejný profil (primárně pro staré URL /u/<id>)
// Načítá přes service role, aby obejšel RLS, a předá data klientu.
export const dynamic = 'force-dynamic';

const selectBase =
  'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params?.id ?? '').trim();
  if (!id || id === 'undefined') notFound();

  // Zkusíme service role (preferované)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let profile: any = null;
  if (supabaseUrl && serviceKey) {
    try {
      const service = createSupabaseClient(supabaseUrl, serviceKey);
      const { data, error } = await service.from('profiles').select(selectBase).eq('id', id).maybeSingle();
      if (error) {
        console.error('Service profile fetch error:', error);
      } else {
        profile = data ?? null;
      }
    } catch (e) {
      console.error('Service client failed:', e);
    }
  }

  // fallback: anonymní klient (pokud není service key)
  if (!profile) {
    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select(selectBase).eq('id', id).maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  // pokud má profil slug, použijeme kanonickou URL
  if (profile.slug && profile.slug !== id) {
    redirect(`/artist/${profile.slug}`);
  }

  return <PublicProfileClient profileId={profile.id} initialProfile={profile} />;
}
