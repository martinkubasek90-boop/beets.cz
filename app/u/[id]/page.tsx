import { redirect } from 'next/navigation';
import { redirect } from 'next/navigation';

export default async function PublicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  // Jednoduchý redirect: pokud přijde čisté ID, pošleme ho do /artist (slug fallback se řeší tam)
  redirect(`/artist/${params.id}`);
}
