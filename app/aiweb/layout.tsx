import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AIWEB – Weby nové generace pro český trh',
  description:
    'Tvoříme AI weby, e-shopy a landing pages, které prodávají. Moderní design, rychlost a výsledky. Jednička na českém trhu.',
  keywords: [
    'AI web',
    'tvorba webu',
    'webové stránky',
    'e-shop',
    'landing page',
    'moderní web',
    'česky',
  ],
  openGraph: {
    title: 'AIWEB – Weby nové generace',
    description: 'Tvoříme AI weby, které prodávají. Moderní design, rychlost, výsledky.',
    type: 'website',
  },
};

export default function AIWebLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
