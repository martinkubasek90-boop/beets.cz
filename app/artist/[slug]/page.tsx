import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  try {
    const host = headers().get('host') || 'beets.cz';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${host}`;
    const apiUrl = `${baseUrl}/api/public-profile/${encodeURIComponent(decoded)}`;
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) {
      return <div className="p-8 text-white">Profil nenalezen.</div>;
    }
    const json = await res.json();
    const profile = json?.profile;
    if (!profile?.id) {
      return <div className="p-8 text-white">Profil nenalezen.</div>;
    }

    if (profile.slug && profile.slug !== decoded) {
      redirect(`/artist/${profile.slug}`);
    }

    return <PublicProfileClient profileId={profile.id} initialProfile={profile} />;
  } catch (err) {
    console.error('Profil fetch exception:', err);
    return <div className="p-8 text-white">Profil nelze načíst.</div>;
  }
}
