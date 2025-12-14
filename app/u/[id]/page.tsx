import { notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';

// Původní jednoduché chování: jen předáme ID do PublicProfileClient,
// který si profil načte anonymně (jako dříve).
export const dynamic = 'force-dynamic';

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params?.id ?? '').trim();
  if (!id) {
    notFound();
  }
  return <PublicProfileClient profileId={id} />;
}
