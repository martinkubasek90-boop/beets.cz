import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function ArtistSlugRedirect({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params?.slug ?? '').trim();
  if (!slug) {
    redirect('/u/');
  } else {
    redirect(`/u/${slug}`);
  }
}
