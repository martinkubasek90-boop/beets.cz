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

  // Čteme přímo přes service role (obejde RLS i typové chyby na UUID)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    notFound();
  }
  const service = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const isUuid = UUID_REGEX.test(decoded);
  const slugLower = decoded.toLowerCase();
  const selectBase =
    'id, display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role, slug';

  const filters = [`slug.eq.${decoded}`, `slug.eq.${slugLower}`, `slug.ilike.${slugLower}`];
  if (isUuid) filters.push(`id.eq.${decoded}`);

  const { data, error } = await service.from('profiles').select(selectBase).or(filters.join(',')).maybeSingle();
  if (error) {
    console.error('Service profile fetch failed:', error);
    notFound();
  }
  if (!data) {
    notFound();
  }

  if (data.slug && data.slug !== decoded) {
    redirect(`/artist/${data.slug}`);
  }

  return <PublicProfileClient profileId={data.id} initialProfile={data} />;
}
