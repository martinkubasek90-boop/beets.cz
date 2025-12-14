import { redirect, notFound } from 'next/navigation';
import PublicProfileClient from '@/components/public-profile-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function PublicProfileBySlugPage({ params }: { params: { slug: string } }) {
  const raw = params?.slug ?? '';
  const decoded = decodeURIComponent(raw || '').trim();
  if (!decoded || decoded === 'undefined') {
    notFound();
  }

  // zavoláme interní API, které čte přes service role (a obejde RLS)
  const apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/public-profile/${encodeURIComponent(decoded)}`;
  const res = await fetch(apiUrl, { cache: 'no-store' });
  if (!res.ok) {
    notFound();
  }
  const json = await res.json();
  const profile = json?.profile;
  if (!profile?.id) {
    notFound();
  }

  if (profile.slug && profile.slug !== decoded) {
    redirect(`/artist/${profile.slug}`);
  }

  return <PublicProfileClient profileId={profile.id} initialProfile={profile} />;
}
