import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NINETEEZ – Hip-Hop Beatmaker',
  description:
    'Beatmaker zaměřený na boom-bap a 90s hip-hop zvuk. Tvoří na Akai MPC 3000.',
  openGraph: {
    title: 'NINETEEZ – Hip-Hop Beatmaker',
    description: 'Beats. Samples. Grooves. Made on the MPC 3000.',
    type: 'website',
  },
};

export default function NineTeezLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
