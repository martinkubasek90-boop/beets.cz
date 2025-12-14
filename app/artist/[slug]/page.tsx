import { redirect, notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    return <PublicProfileClient profileId="" />;
  }

  const slugLower = decoded.toLowerCase();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug')
    .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
    .maybeSingle();

  if (error) {
    console.error('Chyba při načítání profilu podle slugu:', error);
  }

  let finalId = data?.id ?? (UUID_REGEX.test(decoded) ? decoded : null);

  // Fallback: pokud RLS/slug nedovolí načíst, zkusíme service role (pokud je k dispozici)
  if (!finalId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: svcProfile, error: svcErr } = await service
        .from('profiles')
        .select('id, slug')
        .or(`slug.eq.${decoded},slug.eq.${slugLower},slug.ilike.${slugLower},id.eq.${decoded}`)
        .maybeSingle();
      if (!svcErr && svcProfile?.id) {
        finalId = svcProfile.id;
        if (svcProfile.slug && svcProfile.slug !== decoded) {
          redirect(`/artist/${svcProfile.slug}`);
        }
      }
    } catch (e) {
      console.error('Service slug lookup failed:', e);
    }
  }

  // pokud se slug v URL neshoduje s uloženým slugem, přesměruj na kanonický
  if (data?.slug && data.slug !== decoded) {
    redirect(`/artist/${data.slug}`);
  }

  if (!finalId) notFound();

  return <PublicProfileClient profileId={finalId} />;
}
