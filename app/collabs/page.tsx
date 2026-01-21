import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Spolupráce | BEETS.CZ',
  description: 'Domlouvej spolupráce, sdílej soubory a drž si přehled o aktivitách.',
};

type CmsRow = {
  key: string;
  value: string | null;
};

export default async function CollabsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('cms_content')
    .select('key,value')
    .in('key', ['collabs.hero.title', 'collabs.hero.lead']);

  const cmsMap = new Map<string, string>();
  (data as CmsRow[] | null)?.forEach((row) => {
    if (row?.key && row.value) cmsMap.set(row.key, row.value);
  });

  const heroTitle = cmsMap.get('collabs.hero.title') || 'Spolupráce';
  const heroLead =
    cmsMap.get('collabs.hero.lead') ||
    'Domlouvej spolupráce, sdílej soubory a drž si přehled o aktivitách. Vše na jednom místě.';

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
        <div className="flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
          >
            ← Zpět na homepage
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-black via-black/70 to-[#0f0f0f] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 text-left">
            <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--mpc-muted)]">Spolupráce</p>
            <h1 className="text-3xl font-semibold leading-tight">{heroTitle}</h1>
            <p className="max-w-3xl text-[15px] text-[var(--mpc-muted)]">{heroLead}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: '1) Založ vlákno',
              body: 'Pozveš partnera a rovnou popíšeš zadání nebo směr.',
            },
            {
              title: '2) Sdílej soubory',
              body: 'Nahraješ audio nebo podklady přímo do vlákna.',
            },
            {
              title: '3) Drž si přehled',
              body: 'Aktivity, statusy a deadline máš přehledně na jednom místě.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--mpc-muted)]">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--mpc-accent)]/40 bg-[var(--mpc-accent)]/10 p-6 text-center shadow-[0_12px_28px_rgba(243,116,51,0.25)]">
          <h3 className="text-xl font-semibold">Chceš navázat spolupráci?</h3>
          <p className="mt-2 text-sm text-[var(--mpc-muted)]">
            Přihlas se a otevři si sekci Spolupráce ve svém profilu.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a
              href="/auth/login"
              className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
            >
              Přihlásit se
            </a>
            <a
              href="/auth/sign-up"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)]"
            >
              Registrace
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
