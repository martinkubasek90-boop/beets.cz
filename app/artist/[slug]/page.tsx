import { redirect, notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    return <PublicProfileClient profileId="" />;
  }

  const slugLower = decoded.toLowerCase();
  const supabase = await createClient();

  // Nejprve zkusíme service role (pokud je k dispozici), aby RLS neblokovalo načtení profilu ani slugu
  const canUseService = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  let slugLookup: { id?: string; slug?: string | null } | null = null;

  if (canUseService) {
    try {
      const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: svc, error: svcErr } = await service
        .from('profiles')
        .select('id, slug')
        .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
        .maybeSingle();
      if (!svcErr) slugLookup = svc ?? null;
    } catch (e) {
      console.error('Service slug lookup failed:', e);
    }
  }

  if (!slugLookup) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, slug')
      .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
      .maybeSingle();
    if (error) console.error('Chyba při načítání profilu podle slugu:', error);
    slugLookup = data ?? null;
  }

  let finalId = slugLookup?.id ?? (UUID_REGEX.test(decoded) ? decoded : null);

  if (slugLookup?.slug && slugLookup.slug !== decoded) {
    redirect(`/artist/${slugLookup.slug}`);
  }

  if (!finalId) notFound();

  // Načti profil (preferujeme service role, aby RLS neblokovalo)
  let initialProfile: any = null;
  const selectBase =
    'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

  if (canUseService) {
    try {
      const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: svcProfile, error: svcErr } = await service
        .from('profiles')
        .select(selectBase)
        .eq('id', finalId)
        .maybeSingle();
      if (!svcErr && svcProfile) {
        initialProfile = svcProfile;
      }
    } catch (e) {
      console.error('Service profile fetch failed:', e);
    }
  }

  if (!initialProfile) {
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select(selectBase)
      .eq('id', finalId)
      .maybeSingle();
    if (!profileErr && profileData) {
      initialProfile = profileData;
    }
  }

  if (!initialProfile) {
    notFound();
  }

  return <PublicProfileClient profileId={finalId} initialProfile={initialProfile ?? undefined} />;
}
