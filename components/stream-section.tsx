'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';

type StreamInfo = {
  title: string;
  startsAt: string;
  description?: string | null;
  embedUrl?: string | null;
};

const defaultStreamInfo: StreamInfo = {
  title: 'Meet',
  startsAt: 'Dnes v 20:00',
  description: 'Pojďme se potkat naživo přes Google Meet.',
  embedUrl: process.env.NEXT_PUBLIC_STREAM_EMBED_URL || null,
};

type StreamSectionProps = {
  embed?: boolean;
};

const normalizeEmbedUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    return match?.[1] || null;
  }
  return trimmed;
};

export default function StreamSection({ embed = true }: StreamSectionProps) {
  const supabase = createClient();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [nextStreamInfo, setNextStreamInfo] = useState<StreamInfo | null>(null);
  const [communityInvite, setCommunityInvite] = useState<{ room: string; from?: string | null } | null>(null);
  const [cmsStream, setCmsStream] = useState<{ embedUrl?: string | null; description?: string | null }>({});

  useEffect(() => {
    const loadCms = async () => {
      try {
        const { data, error } = await supabase
          .from('cms_content')
          .select('key,value')
          .in('key', ['stream.embed.url', 'stream.description']);
        if (!error && data) {
          const map = Object.fromEntries((data as any[]).map((row) => [row.key, row.value]));
          setCmsStream({
            embedUrl: map['stream.embed.url'] || null,
            description: map['stream.description'] || null,
          });
        }
      } catch (err) {
        console.warn('Nepodařilo se načíst CMS stream obsah:', err);
      }
    };
    void loadCms();
  }, [supabase]);

  useEffect(() => {
    const loadStreamInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('room_name,title,starts_at,description,stream_embed_url')
          .eq('active', true)
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          setNextStreamInfo({
            title: data.title || defaultStreamInfo.title,
            startsAt: data.starts_at
              ? new Date(data.starts_at).toLocaleString('cs-CZ', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                })
              : defaultStreamInfo.startsAt,
            description: data.description ?? defaultStreamInfo.description,
            embedUrl: (data as any).stream_embed_url || defaultStreamInfo.embedUrl || null,
          });
          return;
        }
      } catch (err) {
        console.warn('Nepodařilo se načíst stream info:', err);
      }
      setNextStreamInfo(defaultStreamInfo);
    };
    void loadStreamInfo();
  }, [supabase]);

  // Zachytíme komunitní call broadcast a nabídneme link
  useEffect(() => {
    const channel = supabase
      .channel('community-call-global-stream')
      .on('broadcast', { event: 'community-call' }, (payload) => {
        const data: any = payload.payload;
        if (!data?.room) return;
        setCommunityInvite({ room: String(data.room), from: data.fromName || null });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const description = nextStreamInfo?.description || defaultStreamInfo.description;
  const title = nextStreamInfo?.title || defaultStreamInfo.title;
  const startsAt = nextStreamInfo?.startsAt || defaultStreamInfo.startsAt;
  const descriptionWithCms = description || cmsStream.description || defaultStreamInfo.description;
  const meetUrl = normalizeEmbedUrl(
    nextStreamInfo?.embedUrl || cmsStream.embedUrl || defaultStreamInfo.embedUrl || null
  );

  return (
    <section className="rounded-b-xl border border-t-0 border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
          <span>{t('stream.heading', 'Meet')}</span>
          <p className="text-[var(--mpc-light)] text-base font-semibold">{title}</p>
          <p className="text-[12px]">
            {t('stream.next', 'Další meet')} {startsAt}
          </p>
          {communityInvite && (
            <p className="text-[11px] text-[var(--mpc-accent)]">
              Live: {communityInvite.from ? `${communityInvite.from} spustil community call` : 'Community call je aktivní'}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--mpc-dark)] bg-black/70 p-5">
          <p className="text-sm text-[var(--mpc-light)]">{descriptionWithCms}</p>
          {meetUrl ? (
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center rounded-full bg-[var(--mpc-accent)] px-5 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)] hover:translate-y-[1px]"
            >
              Připojit se na Google Meet
            </a>
          ) : (
            <p className="mt-3 text-[12px] text-[var(--mpc-muted)]">Meet link brzy doplníme.</p>
          )}
        </div>
      </div>
    </section>
  );
}
