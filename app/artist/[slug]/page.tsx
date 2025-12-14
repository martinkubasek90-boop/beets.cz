import { redirect } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';

// Pro kompatibilitu: pokud slug odpovídá UUID, renderuj přímo profil (stejně jako /u/[id]).
// Jinak přesměruj na /u/<slug>, aby fungovaly staré odkazy s ID.
export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  if (UUID_REGEX.test(decoded)) {
    return <PublicProfileClient profileId={decoded} />;
  }

  // fallback: přesměruj na starý formát /u/<id|slug>
  redirect(`/u/${decoded}`);
}
