import { redirect } from 'next/navigation';

// Návrat k původnímu chování: vše přesměrujeme na starou URL /u/<slug>
export const dynamic = 'force-dynamic';

export default function ArtistSlugRedirect({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params?.slug ?? '').trim();
  if (!slug || slug === 'undefined') {
    return <div className="p-8 text-white">Profil nenalezen.</div>;
  }
  redirect(`/u/${slug}`);
}
