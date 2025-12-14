import { redirect, notFound } from 'next/navigation';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id === 'undefined') {
    notFound();
  }
  redirect(`/artist/${id}`);
}
