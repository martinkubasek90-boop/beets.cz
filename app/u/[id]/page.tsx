import { use } from 'react';
import PublicProfileClient from '../../../components/public-profile-client';

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <PublicProfileClient profileId={id} />;
}
