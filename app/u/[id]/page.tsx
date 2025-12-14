import { redirect, notFound } from 'next/navigation';

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // Jednoduchý redirect: pokud přijde čisté ID, pošleme ho do /artist (slug fallback se řeší tam)
  if (!params?.id || params.id === 'undefined') {
    notFound();
  }
  redirect(`/artist/${params.id}`);
}
