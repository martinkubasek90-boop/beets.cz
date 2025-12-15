'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type CmsEntry = {
  key: string;
  value: string;
};

type VideoItem = {
  id: string;
  title: string;
  url: string;
};

type CmsField = { key: string; label: string; description?: string; defaultValue: string; category: string };

const fields: CmsField[] = [
  {
    key: 'home.hero.title',
    label: 'Homepage – hlavní titulek',
    defaultValue: 'Beat komunita BEETS.CZ',
    category: 'Homepage',
  },
  {
    key: 'home.hero.subtitle',
    label: 'Homepage – podtitulek',
    defaultValue: 'Nahrávej beaty, sdílej instrumentály, feedback od CZ/SK komunity.',
    category: 'Homepage',
  },
  {
    key: 'home.hero.cta',
    label: 'Homepage – CTA tlačítko',
    defaultValue: 'Více o platformě',
    category: 'Homepage',
  },
  {
    key: 'home.hero.subtitle2',
    label: 'Homepage – druhý řádek podtitulu',
    defaultValue: 'Bez reklam a nesmyslů, jen hudba.',
    category: 'Homepage',
  },
  {
    key: 'home.projects.title',
    label: 'Homepage – sekce projekty (nadpis)',
    defaultValue: 'Nejnovější projekty',
    category: 'Homepage',
  },
  {
    key: 'home.beats.title',
    label: 'Homepage – sekce beaty (nadpis)',
    defaultValue: 'Nejnovější beaty',
    category: 'Homepage',
  },
  {
    key: 'home.artists.title',
    label: 'Homepage – sekce umělci (nadpis)',
    defaultValue: 'Umělci',
    category: 'Homepage',
  },
  {
    key: 'home.blog.title',
    label: 'Homepage – sekce blog (nadpis)',
    defaultValue: 'News from Beats',
    category: 'Homepage',
  },
  {
    key: 'home.info.producers.title',
    label: 'Homepage – box Pro producenty (titulek)',
    defaultValue: 'Pro producenty',
    category: 'Homepage',
  },
  {
    key: 'home.info.producers.text',
    label: 'Homepage – box Pro producenty (text)',
    defaultValue: 'Nahrávej beaty, sdílej instrumentály, feedback od CZ/SK komunity.',
    category: 'Homepage',
  },
  {
    key: 'home.info.rappers.title',
    label: 'Homepage – box Pro rapery (titulek)',
    defaultValue: 'Pro rapery',
    category: 'Homepage',
  },
  {
    key: 'home.info.rappers.text',
    label: 'Homepage – box Pro rapery (text)',
    defaultValue: 'Hledej beaty, domlouvej spolupráce, přidávej akapely.',
    category: 'Homepage',
  },
  {
    key: 'home.info.community.title',
    label: 'Homepage – box Komunita (titulek)',
    defaultValue: 'CZ / SK komunita',
    category: 'Homepage',
  },
  {
    key: 'home.info.community.text',
    label: 'Homepage – box Komunita (text)',
    defaultValue: 'Kurátorovaný vstup, žádné reklamy, čistá platforma pro hudbu.',
    category: 'Homepage',
  },
  {
    key: 'stream.description',
    label: 'Stream – popis pod tlačítkem',
    defaultValue: 'Zapni se a bav se s námi naživo.',
    category: 'Stream',
  },
  {
    key: 'faq.intro',
    label: 'FAQ – úvodní text',
    defaultValue: 'Nejčastější dotazy k účtu, nahrávání beatů/projektů, spolupráci a zprávám.',
    category: 'FAQ',
  },
  {
    key: 'collabs.hero.title',
    label: 'Spolupráce – hlavní titulek',
    defaultValue: 'Spolupráce bez chaosu',
    category: 'Spolupráce',
  },
  {
    key: 'collabs.hero.lead',
    label: 'Spolupráce – úvodní odstavec',
    defaultValue: 'Spolupráce na beets.cz znamená, že jeden umělec osloví druhého přímo přes platformu a odešle mu žádost o spolupráci.',
    category: 'Spolupráce',
  },
  {
    key: 'faq.title',
    label: 'FAQ – hlavní titulek',
    defaultValue: 'FAQ',
    category: 'FAQ',
  },
];

export default function AdminPage() {
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) {
          setError('Nejsi přihlášen.');
          return;
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        setRole(prof?.role ?? null);

        const { data } = await supabase.from('cms_content').select('key,value').in(
          'key',
          fields.map((f) => f.key)
        );
        const map: Record<string, string> = {};
        (data as CmsEntry[] | null | undefined)?.forEach((row) => {
          map[row.key] = row.value;
        });
        setEntries(map);

        if (map['home.video.items']) {
          try {
            const parsed = JSON.parse(map['home.video.items']);
            if (Array.isArray(parsed)) {
              setVideos(
                parsed.map((v: any, idx: number) => ({
                  id: String(v.id ?? idx + 1),
                  title: v.title ?? `Video ${idx + 1}`,
                  url: v.url ?? '',
                }))
              );
            }
          } catch (err) {
            console.warn('Nepodařilo se načíst seznam videí:', err);
          }
        }
      } catch (err: any) {
        console.error('Chyba načítání CMS:', err);
        setError('Nepodařilo se načíst data.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase]);

  const isAdmin = useMemo(() => role === 'admin' || role === 'superadmin', [role]);

  const handleSave = async (key: string, value: string) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setError(null);
    try {
      const { error } = await supabase.from('cms_content').upsert({ key, value });
      if (error) throw error;
      setEntries((prev) => ({ ...prev, [key]: value }));
      if (key === 'home.video.items') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setVideos(
              parsed.map((v: any, idx: number) => ({
                id: String(v.id ?? idx + 1),
                title: v.title ?? `Video ${idx + 1}`,
                url: v.url ?? '',
              }))
            );
          }
        } catch (err) {
          console.warn('Parsování uložených videí selhalo:', err);
        }
      }
    } catch (err: any) {
      console.error('Chyba ukládání CMS:', err);
      setError('Uložení se nepodařilo.');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--mpc-deck)] text-white p-6">
        <p className="text-sm text-[var(--mpc-muted)]">Načítám…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--mpc-deck)] text-white p-6">
        <div className="mx-auto max-w-4xl rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4">
          <p className="text-sm text-[var(--mpc-muted)]">Tato sekce je dostupná pouze pro admin / superadmin.</p>
          <Link href="/" className="mt-3 inline-flex rounded-full border border-[var(--mpc-accent)] px-3 py-2 text-[12px] uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black">
            Zpět na homepage
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--mpc-deck)] text-white p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Admin</p>
            <h1 className="text-2xl font-bold">Texty na platformě</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Upravené hodnoty se uloží do tabulky cms_content.</p>
          </div>
          <Link href="/" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)]">
            Zpět
          </Link>
        </div>

        {error && (
          <div className="rounded-md border border-red-700/40 bg-red-900/30 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {Array.from(
          fields.reduce((acc, f) => {
            const arr = acc.get(f.category) || [];
            arr.push(f);
            acc.set(f.category, arr);
            return acc;
          }, new Map<string, CmsField[]>())
        ).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-base font-semibold text-white">{category}</h2>
            {items.map((field) => {
              const current = entries[field.key] ?? field.defaultValue;
              return (
                <div key={field.key} className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{field.label}</p>
                      <p className="text-[11px] text-[var(--mpc-muted)]">{field.key}</p>
                      {field.description && <p className="text-[11px] text-[var(--mpc-muted)]">{field.description}</p>}
                    </div>
                    <button
                      onClick={() => void handleSave(field.key, current)}
                      disabled={saving[field.key]}
                      className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
                    >
                      {saving[field.key] ? 'Ukládám…' : 'Uložit'}
                    </button>
                  </div>
                  <textarea
                    className="mt-3 w-full rounded-md border border-[var(--mpc-dark)] bg-black/50 px-3 py-2 text-sm text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                    rows={3}
                    value={current}
                    onChange={(e) => setEntries((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              );
            })}
          </div>
        ))}

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">Homepage – Video sekce</h2>
          <p className="text-[12px] text-[var(--mpc-muted)]">
            Seznam videí (YouTube/iframe embed URL). Uloženo jako JSON v klíči <code>home.video.items</code>.
          </p>
          <div className="space-y-2">
            {videos.map((v, idx) => (
              <div
                key={v.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-3 sm:flex-row sm:items-center"
              >
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--mpc-muted)]">#{idx + 1}</span>
                <input
                  className="w-full rounded border border-[var(--mpc-dark)] bg-black/40 px-3 py-2 text-sm text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                  placeholder="Název videa"
                  value={v.title}
                  onChange={(e) =>
                    setVideos((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                    )
                  }
                />
                <input
                  className="w-full rounded border border-[var(--mpc-dark)] bg-black/40 px-3 py-2 text-sm text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                  placeholder="https://www.youtube.com/embed/..."
                  value={v.url}
                  onChange={(e) =>
                    setVideos((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item))
                    )
                  }
                />
                <button
                  onClick={() => setVideos((prev) => prev.filter((_, i) => i !== idx))}
                  className="self-start rounded-full border border-red-500/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-300 hover:bg-red-500/10"
                >
                  Smazat
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                setVideos((prev) => [
                  ...prev,
                  { id: `${Date.now()}`, title: `Video ${prev.length + 1}`, url: '' },
                ])
              }
              className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
            >
              Přidat video
            </button>
            <button
              onClick={() =>
                void handleSave(
                  'home.video.items',
                  JSON.stringify(
                    videos.map((v, idx) => ({
                      id: v.id || idx + 1,
                      title: v.title || `Video ${idx + 1}`,
                      url: v.url || '',
                    }))
                  )
                )
              }
              disabled={saving['home.video.items']}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)] disabled:opacity-60"
            >
              {saving['home.video.items'] ? 'Ukládám…' : 'Uložit videa'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
