'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { resizeImageFile } from '../lib/image-utils';

type ProjectUploadFormProps = {
  onCreated?: () => void;
};

export default function ProjectUploadForm({ onCreated }: ProjectUploadFormProps) {
  const supabase = createClient();
  const MAX_TRACKS = 30;
  const labelClass = 'block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-200';
  const inputClass =
    'mt-1 w-full rounded-lg border border-white/15 bg-white/95 px-3 py-2 text-sm text-black shadow-sm outline-none focus:border-[var(--mpc-accent)]';
  const helperClass = 'mt-1 text-[11px] text-neutral-500';
  const normalizePurchaseUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessMode, setAccessMode] = useState<'public' | 'request' | 'private'>('request');
  const [tracks, setTracks] = useState<Array<{ file: File | null; name: string }>>([
    { file: null, name: '' },
  ]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [releaseFormats, setReleaseFormats] = useState<string[]>([]);
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleCoverFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
  }

  function handleTrackFileChange(idx: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, file } : t)));
  }

  function handleTrackNameChange(idx: number, value: string) {
    setTracks((prev) => prev.map((t, i) => (i === idx ? { ...t, name: value } : t)));
  }

  function addTrackRow() {
    setError(null);
    setTracks((prev) => {
      if (prev.length >= MAX_TRACKS) {
        setError(`Maximálně ${MAX_TRACKS} skladeb na projekt.`);
        return prev;
      }
      return [...prev, { file: null, name: '' }];
    });
  }

  function removeTrackRow(idx: number) {
    setTracks((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Zadej název projektu.');
      return;
    }

    const validTracks = tracks.filter((t) => t.file);
    if (validTracks.length === 0) {
      setError('Přidej alespoň jeden audio soubor (MP3).');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error('Uživatel není přihlášen.');
      }

      const uploadedTracks: Array<{ name: string; path: string; url: string }> = [];

      for (const t of validTracks) {
        const ext = t.file!.name.split('.').pop()?.toLowerCase();
        if (ext && ext !== 'mp3') {
          throw new Error('Audio musí být MP3.');
        }
        const safeName = t.file!.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const trackPath = `${user.id}/projects/audio/${Date.now()}-${safeName}`;

        const { error: uploadTrackError } = await supabase.storage
          .from('projects')
          .upload(trackPath, t.file!, { upsert: true });
        if (uploadTrackError) {
          throw uploadTrackError;
        }
        const { data: pubUrl } = supabase.storage.from('projects').getPublicUrl(trackPath);

        uploadedTracks.push({
          name: t.name.trim() || t.file!.name,
          path: trackPath,
          url: pubUrl.publicUrl,
        });
      }

      let coverUrl: string | null = null;

      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.toLowerCase();
        if (coverExt && !['pgm', 'jpg', 'jpeg', 'png', 'webp'].includes(coverExt)) {
          throw new Error('Cover musí být PGM, JPG, PNG nebo WEBP.');
        }

        const safeCoverName = coverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const coverPath = `${user.id}/projects/covers/${Date.now()}-${safeCoverName}`;
        const coverToUpload = await resizeImageFile(coverFile, { maxSize: 420, quality: 0.75 });

        const { error: coverUploadError } = await supabase.storage
          .from('projects')
          .upload(coverPath, coverToUpload, { upsert: true });

        if (coverUploadError) {
          throw coverUploadError;
        }

        const { data: coverPublicData } = supabase.storage
          .from('projects')
          .getPublicUrl(coverPath);

        coverUrl = coverPublicData.publicUrl;
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        project_url: uploadedTracks[0]?.url || null,
        tracks_json: uploadedTracks,
        user_id: user.id,
        access_mode: accessMode,
        release_formats: releaseFormats.length ? releaseFormats : null,
        purchase_url: normalizePurchaseUrl(purchaseUrl),
      };

      if (coverUrl) {
        payload.cover_url = coverUrl;
      }

      const { error: insertError } = await supabase.from('projects').insert(payload);
      if (insertError) {
        throw insertError;
      }

      setSuccess('Projekt byl nahrán.');
      setTitle('');
      setDescription('');
      setTracks([{ file: null, name: '' }]);
      setCoverFile(null);
      setAccessMode('request');
      setReleaseFormats([]);
      setPurchaseUrl('');

      if (onCreated) {
        onCreated();
      }
    } catch (err: any) {
      console.error('Chyba při nahrávání projektu:', err);
      setError(err?.message || 'Nepodařilo se nahrát projekt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl w-full mx-auto">
      <div>
        <label className={labelClass}>Název projektu</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Např. Beton Stories EP"
        />
      </div>

      <div>
        <label className={labelClass}>Popis projektu</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-[96px]`}
          rows={3}
          placeholder="Počet beatů, mood, hosté…"
        />
      </div>

      <div>
        <label className={labelClass}>Přístup k projektu</label>
        <select
          value={accessMode}
          onChange={(e) => setAccessMode(e.target.value as 'public' | 'request' | 'private')}
          className={inputClass}
        >
          <option value="public">Veřejný</option>
          <option value="request">Na žádost (doporučeno)</option>
          <option value="private">Soukromý (jen udělené přístupy)</option>
        </select>
        <p className={helperClass}>U „na žádost“ mohou uživatelé poslat žádost o náhled; přehrání bude možné až po schválení.</p>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Vydáno na</label>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'vinyl', label: 'Vinyl' },
            { id: 'cassette', label: 'Kazeta' },
            { id: 'cd', label: 'CD' },
            { id: 'digital', label: 'Digital' },
          ].map((format) => {
            const active = releaseFormats.includes(format.id);
            return (
              <button
                key={format.id}
                type="button"
                onClick={() =>
                  setReleaseFormats((prev) =>
                    prev.includes(format.id) ? prev.filter((item) => item !== format.id) : [...prev, format.id]
                  )
                }
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  active
                    ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                    : 'border-white/15 bg-white/90 text-black hover:border-[var(--mpc-accent)]'
                }`}
              >
                {format.label}
              </button>
            );
          })}
        </div>
        <p className={helperClass}>Vyber formáty vydání projektu.</p>
      </div>

      <div>
        <label className={labelClass}>URL pro nákup</label>
        <input
          type="url"
          value={purchaseUrl}
          onChange={(e) => setPurchaseUrl(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
        <p className={helperClass}>CTA tlačítko „Koupit“ přesměruje na tuto URL.</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelClass}>Audio soubory (MP3)</label>
        </div>
        <p className={helperClass}>Můžeš nahrát více souborů a každému dát název. {tracks.length}/{MAX_TRACKS}</p>
        <p className={helperClass}>
          WAV? Využij <a href="/konvertor" className="text-[var(--mpc-accent)]">Konvertor MP3</a>.
        </p>
        <div className="space-y-3">
          {tracks.map((track, idx) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] uppercase tracking-[0.12em] text-neutral-200">Soubor #{idx + 1}</label>
                {tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTrackRow(idx)}
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Odebrat
                  </button>
                )}
              </div>
              <input
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={(e) => handleTrackFileChange(idx, e)}
                className="block w-full text-sm text-neutral-200"
              />
              <input
                type="text"
                value={track.name}
                onChange={(e) => handleTrackNameChange(idx, e.target.value)}
                className={inputClass}
                placeholder="Název skladby (volitelné)"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={addTrackRow}
            className="rounded-full border border-[var(--mpc-accent,#f37433)] bg-[var(--mpc-accent,#f37433)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_8px_20px_rgba(243,116,51,0.35)] disabled:opacity-60"
            disabled={tracks.length >= MAX_TRACKS}
          >
            Další skladba
          </button>
        </div>
        {tracks.length >= MAX_TRACKS && (
          <p className="text-[11px] text-red-600">Dosáhl jsi maxima {MAX_TRACKS} skladeb pro jeden projekt.</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Cover projektu (PGM / JPG / PNG / WEBP, volitelné)</label>
        <input
          type="file"
          accept=".pgm,.jpg,.jpeg,.png,.webp,image/x-portable-graymap,image/jpeg,image/png,image/webp"
          onChange={handleCoverFileChange}
          className="mt-1 block w-full text-sm text-neutral-800"
        />
        <p className={helperClass}>Obrázek se uloží jako public URL k projektu.</p>
      </div>

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {success && <p className="text-[11px] text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full border-2 border-[var(--mpc-accent,#f37433)] bg-[var(--mpc-accent,#f37433)] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_22px_rgba(243,116,51,0.35)] disabled:opacity-60"
      >
        {loading ? 'Nahrávám…' : 'Nahrát projekt'}
      </button>
    </form>
  );
}
