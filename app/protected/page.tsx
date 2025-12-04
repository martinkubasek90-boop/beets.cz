import ProfileClient, { BeatRow } from '../../components/profile-client';

export default async function ProfilePage() {
  // Pro teď klidně nech svůj e-mail natvrdo,
  // později to napojíme na Supabase auth.
  const email = 'starcrew01@seznam.cz';

  const initialBeats: BeatRow[] = [];

  return <ProfileClient email={email} initialBeats={initialBeats} />;
}







