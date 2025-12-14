import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';

// Extrémně jednoduché: profil se načte přes veřejné API beets.cz
export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params?.id ?? '').trim();
  if (!id || id === 'undefined') {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }

  try {
    const res = await fetch(`https://beets.cz/api/public-profile/${encodeURIComponent(id)}`, { cache: 'no-store' });
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
