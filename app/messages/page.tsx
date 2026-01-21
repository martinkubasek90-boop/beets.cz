import { Suspense } from 'react';
import ProfileClient from '../../components/profile-client';

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <ProfileClient view="messages" />
    </Suspense>
  );
}
