import { notFound } from 'next/navigation';
import { EXAMPLES } from '../data';
import ExampleClient from './ExampleClient';
import ArchiektClient from './ArchiektClient';
import ZubarClient from './ZubarClient';
import FashionClient from './FashionClient';
import StartupClient from './StartupClient';

export function generateStaticParams() {
  return EXAMPLES.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = EXAMPLES.find(e => e.slug === slug);
  if (!site) return {};
  return {
    title: `${site.name} – ${site.tagline} | Demo AIWEB`,
    description: site.description,
  };
}

export default async function ExamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = EXAMPLES.find(e => e.slug === slug);
  if (!site) notFound();

  if (slug === 'architekt') return <ArchiektClient site={site} />;
  if (slug === 'zubar') return <ZubarClient site={site} />;
  if (slug === 'fashion') return <FashionClient site={site} />;
  if (slug === 'startup') return <StartupClient site={site} />;

  return <ExampleClient site={site} />;
}
