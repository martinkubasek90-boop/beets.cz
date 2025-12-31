'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type Preset = {
  id: string;
  label: string;
  prompt: string;
};

const stylePresets: Preset[] = [
  {
    id: 'lofi',
    label: 'Lo-Fi / Dusty',
    prompt:
      'lofi hip hop cover, soft grain, warm haze, muted contrast, subtle bokeh, analog texture, cinematic mood',
  },
  {
    id: 'trap',
    label: 'Trap / Neon',
    prompt:
      'futuristic trap cover art, neon glow, glossy surfaces, dramatic lighting, high contrast, sharp focus',
  },
  {
    id: 'boombap',
    label: 'Boombap / Vintage',
    prompt:
      'vintage hip hop cover, film grain, gritty texture, collage feel, street photography aesthetic',
  },
  {
    id: 'minimal',
    label: 'Minimal / Clean',
    prompt:
      'minimal album cover, clean composition, strong typography space, subtle gradients, premium design',
  },
  {
    id: 'noir',
    label: 'Noir / Dark',
    prompt:
      'dark moody cover art, chiaroscuro lighting, smoky atmosphere, deep shadows, cinematic noir',
  },
];

const palettePresets: Preset[] = [
  { id: 'ember', label: 'Ember Orange', prompt: 'black, ember orange, warm glow, charcoal' },
  { id: 'teal', label: 'Neon Teal', prompt: 'deep teal, cyan highlights, black, chrome' },
  { id: 'mono', label: 'Mono Silver', prompt: 'black, white, silver, high contrast' },
  { id: 'rust', label: 'Rust Sunset', prompt: 'rust red, sand, warm gray, dusk light' },
  { id: 'olive', label: 'Olive Cream', prompt: 'olive green, cream, muted gold, soft contrast' },
];

const negativePrompt =
  'text, logo, watermark, signature, blurry, low quality, jpeg artifacts, frame, cartoon';

async function renderTextOverlay(baseUrl: string, title: string, artist: string) {
  const image = new Image();
  image.src = baseUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return baseUrl;

  ctx.drawImage(image, 0, 0);

  const gradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.55);

  const safeTitle = title.trim().toUpperCase();
  const safeArtist = artist.trim().toUpperCase();
  const left = Math.round(canvas.width * 0.08);
  let baseline = canvas.height - Math.round(canvas.height * 0.1);

  ctx.fillStyle = '#f6f2ea';
  ctx.font = '700 64px "Space Grotesk", sans-serif';
  ctx.textBaseline = 'bottom';
  if (safeTitle) {
    ctx.fillText(safeTitle.slice(0, 34), left, baseline);
    baseline -= 52;
  }

  ctx.fillStyle = 'rgba(246,242,234,0.75)';
  ctx.font = '500 32px "Space Grotesk", sans-serif';
  if (safeArtist) {
    ctx.fillText(safeArtist.slice(0, 40), left, baseline);
  }

  return canvas.toDataURL('image/png');
}

export default function CoverGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [styleId, setStyleId] = useState(stylePresets[0].id);
  const [paletteId, setPaletteId] = useState(palettePresets[0].id);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [addText, setAddText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const stylePrompt = useMemo(
    () => stylePresets.find((preset) => preset.id === styleId)?.prompt ?? '',
    [styleId]
  );
  const palettePrompt = useMemo(
    () => palettePresets.find((preset) => preset.id === paletteId)?.prompt ?? '',
    [paletteId]
  );

  const composedPrompt = useMemo(() => {
    if (!prompt.trim()) return '';
    return `${prompt.trim()}. ${stylePrompt}. Color palette: ${palettePrompt}. Square album cover, graphic design, high detail, cinematic lighting, no text.`;
  }, [prompt, stylePrompt, palettePrompt]);

  useEffect(() => {
    return () => {
      if (baseUrl) URL.revokeObjectURL(baseUrl);
    };
  }, [baseUrl]);

  useEffect(() => {
    let active = true;
    const build = async () => {
      if (!baseUrl) {
        setOutputUrl(null);
        return;
      }
      if (!addText || (!title.trim() && !artist.trim())) {
        setOutputUrl(baseUrl);
        return;
      }
      const url = await renderTextOverlay(baseUrl, title, artist);
      if (active) {
        setOutputUrl(url);
      }
    };
    void build();
    return () => {
      active = false;
    };
  }, [addText, artist, baseUrl, title]);

  const generateCover = async () => {
    if (!composedPrompt) return;
    setLoading(true);
    setError(null);
    setOutputUrl(null);
    try {
      const response = await fetch('/api/cover-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: composedPrompt,
          negativePrompt,
          width: 1024,
          height: 1024,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Generování selhalo.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (baseUrl) URL.revokeObjectURL(baseUrl);
      setBaseUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Generování selhalo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">AI Cover Generator</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Cover Generator</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Vytvoř AI cover pro beat nebo projekt. 1:1, SDXL kvalitní výstup.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">HF SDXL</p>
              <p className="mt-2">Free model, může být pomalejší.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <label className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                  placeholder="Temná futuristická cover art, industriální beat, smoke, reflective metal..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Styl</p>
                  <div className="mt-3 space-y-2">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setStyleId(preset.id)}
                        className={`w-full rounded-full px-4 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                          preset.id === styleId
                            ? 'bg-[var(--mpc-accent)] text-black'
                            : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Paleta</p>
                  <div className="mt-3 space-y-2">
                    {palettePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setPaletteId(preset.id)}
                        className={`w-full rounded-full px-4 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                          preset.id === paletteId
                            ? 'bg-[var(--mpc-accent)] text-black'
                            : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Text overlay</p>
                    <p className="mt-1 text-xs text-[var(--mpc-muted)]">Název beatu + autor</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddText((prev) => !prev)}
                    className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                      addText
                        ? 'bg-[var(--mpc-accent)] text-black'
                        : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    {addText ? 'Zapnuto' : 'Vypnuto'}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Název beatu"
                    className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                  />
                  <input
                    value={artist}
                    onChange={(event) => setArtist(event.target.value)}
                    placeholder="Autor / Producent"
                    className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateCover}
                  disabled={!composedPrompt || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Generuju…' : 'Vygenerovat cover'}
                </button>
                {outputUrl && (
                  <a
                    href={outputUrl}
                    download="beets-cover.png"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]"
                  >
                    Stáhnout PNG
                  </a>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Preview</p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                {outputUrl ? (
                  <img src={outputUrl} alt="AI cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center text-xs text-[var(--mpc-muted)]">
                    Zatím nic nevygenerováno.
                  </div>
                )}
              </div>
              <p className="mt-4 text-xs text-[var(--mpc-muted)]">
                Tip: napiš konkrétní náladu, materiály a světlo (např. chrome, smoke, film grain).
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
