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
  title: 'Platformní live stream',
  startsAt: 'Dnes v 20:00',
  description: 'Zapni se a bav se s námi naživo.',
  embedUrl: process.env.NEXT_PUBLIC_STREAM_EMBED_URL || null,
};

type StreamSectionProps = {
  embed?: boolean;
};

export default function StreamSection({ embed = true }: StreamSectionProps) {
  const supabase = createClient();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [nextStreamInfo, setNextStreamInfo] = useState<StreamInfo | null>(null);
  const [communityInvite, setCommunityInvite] = useState<{ room: string; from?: string | null } | null>(null);

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
  const embedUrl = nextStreamInfo?.embedUrl || defaultStreamInfo.embedUrl || null;

  return (
    <section className="rounded-b-xl border border-t-0 border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
          <span>{t('stream.heading', 'Stream')}</span>
          <p className="text-[var(--mpc-light)] text-base font-semibold">{title}</p>
          <p className="text-[12px]">
            {t('stream.next', 'Další stream')} {startsAt}
          </p>
          {communityInvite && (
            <p className="text-[11px] text-[var(--mpc-accent)]">
              Live: {communityInvite.from ? `${communityInvite.from} spustil community call` : 'Community call je aktivní'}
            </p>
          )}
        </div>
        {embedUrl ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--mpc-dark)] bg-black/70">
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={embedUrl}
                title="Live stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <p className="p-3 text-[11px] text-[var(--mpc-muted)]">{description}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--mpc-dark)] bg-black/60 p-4 text-sm text-[var(--mpc-light)]">
            <p className="text-[var(--mpc-muted)]">Stream připravujeme.</p>
          </div>
        )}
      </div>
    </section>
  );
}
