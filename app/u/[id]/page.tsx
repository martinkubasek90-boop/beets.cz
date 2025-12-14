import { redirect, notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';
import { createClient } from '@/lib/supabase/server';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id === 'undefined') {
    notFound();
  }
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('slug').eq('id', id).maybeSingle();

  if (data?.slug) {
    redirect(`/artist/${data.slug}`);
  }

  // fallback: použij ID přímo
  return <PublicProfileClient profileId={id} />;
}
