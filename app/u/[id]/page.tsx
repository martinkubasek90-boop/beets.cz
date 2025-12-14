import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicProfileClient from '@/components/public-profile-client';

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('slug').eq('id', params.id).maybeSingle();

  if (data?.slug) {
    redirect(`/artist/${data.slug}`);
  }

  return <PublicProfileClient profileId={params.id} />;
}
