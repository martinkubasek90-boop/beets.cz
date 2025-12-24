'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { createClient } from '../lib/supabase/client';

export default function AcapellaUploadForm({ onCreated }: { onCreated?: () => void }) {
  const supabase = createClient();
  const labelClass = 'block text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-200';
  const inputClass =
    'mt-1 w-full rounded-lg border border-white/15 bg-white/95 px-3 py-2 text-sm text-black shadow-sm outline-none focus:border-[var(--mpc-accent)]';
  const helperClass = 'mt-1 text-[11px] text-neutral-500';

  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [mood, setMood] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleAudioChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAudioFile(file);
  }

  function handleCoverChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('Zadej název akapely.');
      return;
    }
    if (!audioFile) {
      setError('Nahraj audio soubor.');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Nejsi přihlášen.');

      let audioUrl: string | null = null;
      let coverUrl: string | null = null;

      // upload audio
      const audioExt = audioFile.name.split('.').pop()?.toLowerCase();
      if (audioExt && audioExt !== 'mp3') {
        throw new Error('Podporujeme jen MP3.');
      }
      const audioPath = `${user.id}/${Date.now()}-${audioFile.name}`;
      const { error: uploadErr } = await supabase.storage.from('acapellas').upload(audioPath, audioFile);
      if (uploadErr) throw uploadErr;
      audioUrl = supabase.storage.from('acapellas').getPublicUrl(audioPath).data.publicUrl;

      // upload cover (optional)
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.toLowerCase();
        if (coverExt && !['jpg', 'jpeg', 'png', 'webp'].includes(coverExt)) {
          throw new Error('Cover musí být JPG/PNG/WEBP.');
        }
        const safeName = coverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const coverPath = `${user.id}/covers/${Date.now()}-${safeName}`;
        const { error: coverErr } = await supabase.storage.from('acapella_covers').upload(coverPath, coverFile, { upsert: true });
        if (coverErr) throw coverErr;
        coverUrl = supabase.storage.from('acapella_covers').getPublicUrl(coverPath).data.publicUrl;
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        bpm: bpm ? Number(bpm) : null,
        mood: mood.trim() || null,
        audio_url: audioUrl,
        cover_url: coverUrl,
        user_id: user.id,
      };

      const { error: insertErr } = await supabase.from('acapellas').insert(payload);
      if (insertErr) throw insertErr;

      setSuccess('Akapela byla nahrána.');
      setTitle('');
      setBpm('');
      setMood('');
      setAudioFile(null);
      setCoverFile(null);
      if (onCreated) onCreated();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Chyba při nahrávání akapely.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl w-full mx-auto">
      <div>
        <label className={labelClass}>Název akapely</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Např. Studio take 01"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>BPM</label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            className={inputClass}
            placeholder="Např. 90"
          />
        </div>
        <div>
          <label className={labelClass}>Mood / vibe</label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className={inputClass}
            placeholder="Např. Dark"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Audio (MP3)</label>
        <input type="file" accept=".mp3,audio/mpeg" onChange={handleAudioChange} className={helperClass} />
      </div>
      <div>
        <label className={labelClass}>Cover (volitelné, JPG/PNG/WEBP)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} className={helperClass} />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {success && <p className="text-sm text-green-300">{success}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60"
      >
        {loading ? 'Nahrávám…' : 'Nahrát akapelu'}
      </button>
    </form>
  );
}
