import { notFound } from 'next/navigation';
import { EXAMPLES } from '../data';
import ExampleClient from './ExampleClient';

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

  return <ExampleClient site={site} />;
}
