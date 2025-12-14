import { redirect } from 'next/navigation';

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  redirect(`/artist/${params.slug}`);
}
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('id').eq('slug', params.slug).maybeSingle();

  if (error) {
    console.error('Chyba při načítání profilu podle slugu:', error);
  }
  // Fallback: pokud slug nenalezen a vypadá jako UUID, zkusme přímo ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const finalId = data?.id ?? (uuidRegex.test(params.slug) ? params.slug : null);
  if (!finalId) notFound();

  return <PublicProfileClient profileId={finalId} />;
}
