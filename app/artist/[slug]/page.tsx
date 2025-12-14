import { redirect, notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug;
  if (!raw || raw === 'undefined') {
    notFound();
  }
  const slug = decodeURIComponent(raw).trim().toLowerCase();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .maybeSingle();

  if (error) {
    console.error('Chyba při načítání profilu podle slugu:', error);
  }

  const finalId = data?.id ?? (UUID_REGEX.test(slug) ? slug : null);
  if (!finalId) {
    notFound();
  }

  // pokud se slug v URL neshoduje s uloženým slugem, přesměruj na kanonický
  if (data?.slug && data.slug !== slug) {
    redirect(`/artist/${data.slug}`);
  }

  return <PublicProfileClient profileId={finalId} />;
}
