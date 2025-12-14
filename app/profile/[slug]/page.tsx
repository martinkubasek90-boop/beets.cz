import { redirect } from 'next/navigation';

export default function LegacyProfileSlugRedirect({ params }: { params: { slug: string } }) {
  return redirect(`/artist/${params.slug}`);
}
