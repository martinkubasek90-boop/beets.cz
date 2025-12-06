'use client';

import { FormEvent, useState, ChangeEvent } from 'react';
import { createClient } from '../lib/supabase/client';

type BeatUploadFormProps = {
  onCreated?: () => void; // zatím nepovinné, můžeš ignorovat
};

export default function BeatUploadForm({ onCreated }: BeatUploadFormProps) {
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [bpm, setBpm] = useState('');
  const [mood, setMood] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
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
      setError('Zadej název beatu.');
      return;
    }

    if (!audioFile && !externalUrl.trim()) {
      setError('Nahraj audio soubor nebo zadej externí URL.');
      return;
    }

    setLoading(true);

    try {
      // 1) přihlášený uživatel
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Nejsi přihlášen – nemůžu uložit beat.');
      }

      // načti display_name z profilu, jinak použij e-mail
      let artistName = user.email ?? 'Neznámý';
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      if (profileData?.display_name) {
        artistName = profileData.display_name;
      }

      let finalAudioUrl: string | null = externalUrl.trim() || null;
      let finalCoverUrl: string | null = null;

      // 2) upload WAV / MP3 do bucketu "beats"
      if (audioFile) {
        const ext = audioFile.name.split('.').pop()?.toLowerCase();
        if (ext && !['wav', 'mp3'].includes(ext)) {
          throw new Error('Podporujeme jen soubory WAV nebo MP3.');
        }

        const filePath = `${user.id}/${Date.now()}-${audioFile.name}`;

        const { error: uploadError } = await supabase
          .storage
          .from('beats')
          .upload(filePath, audioFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicData } = supabase
          .storage
          .from('beats')
          .getPublicUrl(filePath);

        finalAudioUrl = publicData.publicUrl;
      }

      // 2b) upload coveru (pgm/jpg/png/webp) – volitelné
      if (coverFile) {
        const ext = coverFile.name.split('.').pop()?.toLowerCase();
        if (ext && !['pgm', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          throw new Error('Cover musí být PGM, JPG, PNG nebo WEBP.');
        }

        const safeName = coverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const coverPath = `${user.id}/covers/${Date.now()}-${safeName}`;

        const { error: coverUploadError } = await supabase.storage
          .from('beat_covers')
          .upload(coverPath, coverFile, { upsert: true });

        if (coverUploadError) {
          throw coverUploadError;
        }

        const { data: coverPublicData } = supabase.storage
          .from('beat_covers')
          .getPublicUrl(coverPath);

        finalCoverUrl = coverPublicData.publicUrl;
      }

      // 3) záznam do tabulky beats
      const payload: Record<string, any> = {
        title: title.trim(),
        artist: artistName,
        bpm: bpm ? Number(bpm) : null,
        mood: mood.trim() || null,
        audio_url: finalAudioUrl,
        user_id: user.id, // musí sedět na RLS policy
      };

      if (finalCoverUrl) {
        payload.cover_url = finalCoverUrl;
      }

      const { error: insertError } = await supabase.from('beats').insert(payload);

      if (insertError) {
        throw insertError;
      }

      setSuccess('Beat byl úspěšně nahrán.');
      setTitle('');
      setBpm('');
      setMood('');
      setExternalUrl('');
      setAudioFile(null);
      setCoverFile(null);

      if (onCreated) {
        onCreated();
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || 'Nastala chyba při nahrávání beatu.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
          Název beatu
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm text-black outline-none"
          placeholder="Např. Panel Story"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
            BPM
          </label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm text-black outline-none"
            placeholder="Např. 96"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
            Mood / vibe
          </label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm text-black outline-none"
            placeholder="Boom bap, dark, lo-fi…"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
          Audio soubor (WAV / MP3)
        </label>
        <input
          type="file"
          accept=".wav,audio/wav,.mp3,audio/mpeg"
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-neutral-800"
        />
        <p className="mt-1 text-[11px] text-neutral-600">
          Stačí jeden formát – WAV nebo MP3. Velikost drž raději při zemi kvůli limitům.
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
          Cover beatu (PGM / JPG / PNG / WEBP)
        </label>
        <input
          type="file"
          accept=".pgm,.jpg,.jpeg,.png,.webp,image/x-portable-graymap,image/jpeg,image/png,image/webp"
          onChange={handleCoverChange}
          className="mt-1 block w-full text-sm text-neutral-800"
        />
        <p className="mt-1 text-[11px] text-neutral-600">
          Volitelné – obrázek se uloží k beatu jako public URL.
        </p>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-neutral-700">
          nebo externí URL (SoundCloud / YouTube)
        </label>
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          className="mt-1 w-full border-2 border-black bg-white px-3 py-2 text-sm text-black outline-none"
          placeholder="https://…"
        />
      </div>

      {error && (
        <p className="text-[11px] text-red-500">
          {error}
        </p>
      )}

      {success && (
        <p className="text-[11px] text-green-500">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_rgba(255,122,26,0.35)] transition hover:brightness-105 disabled:opacity-60"
      >
        {loading ? 'Nahrávám…' : 'Nahrát beat'}
      </button>
    </form>
  );
}
