import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';

export default async function ArtistProfilePage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params?.slug ?? '').trim();
  if (!slug) {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  try {
    const res = await fetch(`https://beets.cz/api/public-profile/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) {
      return <div className="p-8 text-white">Profil nenalezen.</div>;
    }
    const json = await res.json();
    const profile = json?.profile;
    if (!profile?.id) {
      return <div className="p-8 text-white">Profil nenalezen.</div>;
    }
    return <PublicProfileClient profileId={profile.id} initialProfile={profile} />;
  } catch (err) {
    console.error('Profil nelze načíst:', err);
    return <div className="p-8 text-white">Profil nelze načíst.</div>;
  }
}
