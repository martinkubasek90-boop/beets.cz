'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type CmsEntry = {
  key: string;
  value: string;
};

const fields: { key: string; label: string; description?: string; defaultValue: string }[] = [
  {
    key: 'home.hero.title',
    label: 'Homepage – hlavní titulek',
    defaultValue: 'Beat komunita BEETS.CZ',
  },
  {
    key: 'home.hero.subtitle',
    label: 'Homepage – podtitulek',
    defaultValue: 'Nahrávej beaty, sdílej instrumentály, feedback od CZ/SK komunity.',
  },
  {
    key: 'home.hero.cta',
    label: 'Homepage – CTA tlačítko',
    defaultValue: 'Spustit přehrávač',
  },
  {
    key: 'stream.description',
    label: 'Stream – popis pod tlačítkem',
    defaultValue: 'Zapni se a bav se s námi naživo.',
  },
  {
    key: 'faq.intro',
    label: 'FAQ – úvodní text',
    defaultValue: 'Nejčastější dotazy k účtu, nahrávání beatů/projektů, spolupráci a zprávám.',
  },
];

export default function AdminPage() {
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Record<string, string>>({});
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

        <div className="space-y-3">
          {fields.map((field) => {
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
      </div>
    </main>
  );
}
