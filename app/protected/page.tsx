import { Suspense } from 'react';
import ProfileClient from '../../components/profile-client';

export default async function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileClient />
    </Suspense>
  );
}


