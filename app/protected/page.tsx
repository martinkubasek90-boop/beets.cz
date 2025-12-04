import ProfileClient from '../../components/profile-client';

type BeatRow = {
  title: string;
  bpm?: number | null;
  mood?: string | null;
  audio_url?: string | null;
  cover_url?: string | null;
};

export default async function ProfilePage() {
  // Pro teď klidně nech svůj e-mail natvrdo,
  // později to napojíme na Supabase auth.
  const email = 'starcrew01@seznam.cz';

  const initialBeats: BeatRow[] = [];

  return <ProfileClient email={email} initialBeats={initialBeats} />;
}






