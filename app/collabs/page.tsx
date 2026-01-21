import { Suspense } from 'react';
import ProfileClient from '../../components/profile-client';

export default function CollabsPage() {
  return (
    <Suspense fallback={null}>
      <ProfileClient view="collabs" />
    </Suspense>
  );
}
