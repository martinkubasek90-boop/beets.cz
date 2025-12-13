import { notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id').eq('slug', params.slug).maybeSingle();

  if (error) {
    console.error('Chyba při načítání profilu podle slugu:', error);
  }
  if (!data?.id) {
    notFound();
  }

  return <PublicProfileClient profileId={data.id} />;
}
