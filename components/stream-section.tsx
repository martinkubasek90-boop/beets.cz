'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';

type StreamInfo = {
  roomName: string;
  title: string;
  startsAt: string;
  description?: string | null;
};

const defaultStreamInfo: StreamInfo = {
  roomName: process.env.NEXT_PUBLIC_JITSI_ROOM || 'czech-mpc-live',
  title: 'Platformní live stream',
  startsAt: 'Dnes v 20:00',
  description: 'Zapni se a bav se s námi naživo.',
};

type StreamSectionProps = {
  embed?: boolean;
};

export default function StreamSection({ embed = true }: StreamSectionProps) {
  const supabase = createClient();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [nextStreamInfo, setNextStreamInfo] = useState<StreamInfo | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [jitsiLoading, setJitsiLoading] = useState(false);
  const [jitsiError, setJitsiError] = useState<string | null>(null);
  const jitsiApiRef = useRef<any>(null);
  const streamContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiScriptLoadedRef = useRef(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session?.user?.id);
    };
    void loadSession();
  }, [supabase]);

  useEffect(() => {
    const loadStreamInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('room_name,title,starts_at,description')
          .eq('active', true)
          .order('starts_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!error && data?.room_name) {
          setNextStreamInfo({
            roomName: data.room_name,
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

  const loadJitsiScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Jitsi podporujeme pouze v prohlížeči.'));
        return;
      }
      if ((window as any).JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      if (jitsiScriptLoadedRef.current) {
        const interval = setInterval(() => {
          if ((window as any).JitsiMeetExternalAPI) {
            clearInterval(interval);
            resolve();
          }
        }, 80);
        return;
      }
      const script = document.createElement('script');
      script.id = 'jitsi-meet-script';
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        jitsiScriptLoadedRef.current = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Nepodařilo se načíst Jitsi API.'));
      document.body.appendChild(script);
    });
  }, []);

  const streamAccessKey = isLoggedIn ? 'logged-in' : 'guest';

  useEffect(() => {
    if (!embed) return;
    if (streamAccessKey !== 'logged-in' || !nextStreamInfo?.roomName || !streamContainerRef.current) return;
    let cancelled = false;
    setJitsiError(null);
    setJitsiLoading(true);
    loadJitsiScript()
      .then(() => {
        if (cancelled || !streamContainerRef.current) return;
        const domain = 'meet.jit.si';
        jitsiApiRef.current?.dispose();
        const options = {
          roomName: nextStreamInfo.roomName,
          parentNode: streamContainerRef.current,
          width: '100%',
          height: 420,
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Divák',
          },
          configOverwrite: {
            disableDeepLinking: true,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
          },
        };
        try {
          jitsiApiRef.current = new (window as any).JitsiMeetExternalAPI(domain, options);
        } catch (err) {
          setJitsiError('Nepodařilo se vytvořit stream.');
          console.error('Jitsi init err:', err);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setJitsiError(err instanceof Error ? err.message : 'Chyba při načítání streamu.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setJitsiLoading(false);
        }
      });
    return () => {
      cancelled = true;
      jitsiApiRef.current?.dispose();
      jitsiApiRef.current = null;
    };
  }, [embed, streamAccessKey, nextStreamInfo, loadJitsiScript]);

  const description = nextStreamInfo?.description || defaultStreamInfo.description;
  const title = nextStreamInfo?.title || defaultStreamInfo.title;
  const startsAt = nextStreamInfo?.startsAt || defaultStreamInfo.startsAt;

  return (
    <section className="rounded-b-xl border border-t-0 border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-col gap-1 text-sm uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
          <span>{t('stream.heading', 'Stream')}</span>
          <p className="text-[var(--mpc-light)] text-base font-semibold">{title}</p>
          <p className="text-[12px]">
            {t('stream.next', 'Další stream')} {startsAt}
          </p>
        </div>
        {embed ? (
          isLoggedIn ? (
            <div className="rounded-2xl border border-[var(--mpc-dark)] bg-black/60 p-3">
              <div
                className="h-[420px] overflow-hidden rounded-xl border border-white/10 bg-black/80"
                ref={streamContainerRef}
              >
                {jitsiLoading && (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--mpc-muted)]">
                    {t('stream.loading', 'Načítám stream…')}
                  </div>
                )}
                {jitsiError && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-red-400">
                    <p>{t('stream.error', 'Nepodařilo se načíst stream.')}</p>
                    <p className="text-[11px] text-[var(--mpc-muted)]">{jitsiError}</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-[var(--mpc-muted)]">{description}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--mpc-dark)] bg-black/60 p-4 text-sm text-[var(--mpc-light)]">
              <p className="text-[var(--mpc-muted)]">
                {t('stream.loginPrompt', 'Přihlas se, abys mohl/a sledovat živé streamy.')}
              </p>
              <Link
                href="/auth/login"
                className="mt-3 inline-flex rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
              >
                {t('stream.login', 'Přihlásit se')}
              </Link>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-[var(--mpc-dark)] bg-black/60 p-4 text-sm text-[var(--mpc-light)]">
            <p className="text-[var(--mpc-muted)]">{description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/stream"
                className="inline-flex items-center justify-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
              >
                {t('stream.openPage', 'Otevřít stream')}
              </Link>
              {!isLoggedIn && (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 hover:text-white"
                >
                  {t('stream.login', 'Přihlásit se')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
