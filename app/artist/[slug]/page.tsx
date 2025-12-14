import { redirect, notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id, slug').eq('slug', params.slug).maybeSingle();

  if (error) {
    console.error('Chyba při načítání profilu podle slugu:', error);
  }

  const finalId = data?.id ?? (UUID_REGEX.test(params.slug) ? params.slug : null);
  if (!finalId) {
    notFound();
  }

  // pokud se slug v URL neshoduje s uloženým slugem, přesměruj na kanonický
  if (data?.slug && data.slug !== params.slug) {
    redirect(`/artist/${data.slug}`);
  }

  return <PublicProfileClient profileId={finalId} />;
}
