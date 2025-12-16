/** Live session / listening party – plánované eventy s chatem a Q&A nástřel */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MainNav } from '@/components/main-nav';

type LiveEvent = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status: 'scheduled' | 'live' | 'done' | 'cancelled';
  room_name?: string | null;
};

type LiveMessage = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
};

export default function LivePage() {
  const supabase = createClient();
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, [supabase]);

  // load events
  useEffect(() => {
    const load = async () => {
      setLoadingEvents(true);
      try {
        const { data, error } = await supabase
          .from('live_events')
          .select('id,title,description,cover_url,starts_at,ends_at,status,room_name')
          .order('starts_at', { ascending: true })
          .limit(20);
        if (error) throw error;
        const rows = (data as LiveEvent[]) ?? [];
        setEvents(rows);
        if (!selectedId && rows.length) {
          const liveNow = rows.find((r) => r.status === 'live');
          setSelectedId(liveNow?.id ?? rows[0].id);
        }
        setEventsError(null);
      } catch (err: any) {
        console.error('Chyba načítání eventů:', err);
        setEvents([]);
        setEventsError('Nepodařilo se načíst live eventy.');
      } finally {
        setLoadingEvents(false);
      }
    };
    void load();
  }, [supabase, selectedId]);

  // load messages for selected event
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('live_messages')
          .select('id,body,user_id,created_at')
          .eq('event_id', selectedId)
          .order('created_at', { ascending: true })
          .limit(200);
        if (error) throw error;
        const rows = (data as LiveMessage[]) ?? [];
        if (!cancelled) {
          setMessages(rows);
          setMessagesError(null);
          const ids = Array.from(new Set(rows.map((m) => m.user_id)));
          if (ids.length) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id,display_name')
              .in('id', ids);
            if (profs) {
              setProfiles(Object.fromEntries((profs as any[]).map((p) => [p.id, p.display_name || 'Uživatel'])));
            }
          }
        }
      } catch (err) {
        console.error('Chyba načítání zpráv:', err);
        if (!cancelled) {
          setMessagesError('Nepodařilo se načíst chat.');
        }
      }
    };
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedId, supabase]);

  // realtime subscription
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`live-messages-${selectedId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `event_id=eq.${selectedId}` },
        (payload) => {
          const row = payload.new as any;
          setMessages((prev) => [...prev, row as LiveMessage]);
        }
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [selectedId, supabase]);

  const selectedEvent = useMemo(() => events.find((e) => e.id === selectedId) || null, [events, selectedId]);

  const statusLabel = selectedEvent?.status === 'live'
    ? 'Live'
    : selectedEvent?.status === 'done'
      ? 'Archiv'
      : selectedEvent?.status === 'cancelled'
        ? 'Zrušeno'
        : 'Plánováno';

  const startsAt = selectedEvent?.starts_at
    ? new Date(selectedEvent.starts_at).toLocaleString('cs-CZ', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : '—';

  const handleSend = async () => {
    if (!input.trim() || !selectedId) return;
    setSending(true);
    setMessagesError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!userData.user?.id) {
        setMessagesError('Pro chat se přihlas.');
        return;
      }
      const body = input.trim().slice(0, 400);
      const { error } = await supabase.from('live_messages').insert({
        event_id: selectedId,
        user_id: userData.user.id,
        body,
      });
      if (error) throw error;
      setInput('');
    } catch (err: any) {
      console.error('Send chat failed:', err);
      setMessagesError(err?.message || 'Nepodařilo se odeslat zprávu.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Live session</p>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Premiéry & listening party</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Plánované premiéry, live poslechy, chat a Q&A.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
          >
            ← Zpět
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              {loadingEvents ? (
                <p className="text-[12px] text-[var(--mpc-muted)]">Načítám event…</p>
              ) : eventsError ? (
                <p className="text-[12px] text-red-300">{eventsError}</p>
              ) : selectedEvent ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-accent)]">
                        {statusLabel}
                      </span>
                      <span className="text-[12px] text-[var(--mpc-muted)]">{startsAt}</span>
                    </div>
                    {selectedEvent.room_name && (
                      <a
                        href={`https://meet.jit.si/${selectedEvent.room_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
                      >
                        Připojit se
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="h-40 w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 md:w-48">
                      {selectedEvent.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedEvent.cover_url} alt={selectedEvent.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                          Žádný cover
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h2 className="text-xl font-semibold text-white">{selectedEvent.title}</h2>
                      <p className="text-sm text-[var(--mpc-muted)]">
                        {selectedEvent.description || 'Live premiéra / listening party s chatem.'}
                      </p>
                      <div className="flex flex-wrap gap-2 text-[12px] text-[var(--mpc-muted)]">
                        <span>Start: {startsAt}</span>
                        {selectedEvent.ends_at && (
                          <span>
                            Konec:{' '}
                            {new Date(selectedEvent.ends_at).toLocaleTimeString('cs-CZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[var(--mpc-muted)]">Žádný event k dispozici.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Chat</h3>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Live chat & Q&A</p>
                </div>
                {!userId && <span className="text-[11px] text-[var(--mpc-muted)]">Pro psaní se přihlas</span>}
              </div>
              {messagesError && (
                <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-100">
                  {messagesError}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div className="max-h-[360px] overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-3 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné zprávy.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className="rounded border border-white/5 bg-white/5 px-3 py-2 text-sm">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                          <span>{profiles[m.user_id] || 'Uživatel'}</span>
                          <span>{new Date(m.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[14px] leading-relaxed text-white">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={userId ? 'Napiš zprávu nebo otázku…' : 'Přihlas se pro psaní do chatu.'}
                    disabled={!userId || sending}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)] disabled:opacity-50"
                    rows={3}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-[var(--mpc-muted)]">Max 400 znaků. Q&A se označuje emoji otazníku.</p>
                    <button
                      onClick={() => void handleSend()}
                      disabled={!userId || !input.trim() || sending}
                      className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-black shadow-[0_10px_24px_rgba(243,116,51,0.35)] disabled:opacity-50"
                    >
                      {sending ? 'Odesílám…' : 'Odeslat'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Eventy</h3>
              {loadingEvents ? (
                <p className="text-[12px] text-[var(--mpc-muted)]">Načítám…</p>
              ) : events.length === 0 ? (
                <p className="text-[12px] text-[var(--mpc-muted)]">Zatím nic naplánováno.</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {events.map((ev) => {
                    const label =
                      ev.status === 'live'
                        ? 'Live'
                        : ev.status === 'done'
                          ? 'Archiv'
                          : ev.status === 'cancelled'
                            ? 'Zrušeno'
                            : 'Plánováno';
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedId(ev.id)}
                        className={`flex w-full items-start gap-3 px-2 py-3 text-left transition hover:bg-white/5 ${
                          selectedId === ev.id ? 'bg-white/10' : ''
                        }`}
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                          {ev.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ev.cover_url} alt={ev.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[11px] text-[var(--mpc-muted)]">
                              {label}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-semibold text-white line-clamp-1">{ev.title}</p>
                            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">
                              {label}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--mpc-muted)]">
                            {new Date(ev.starts_at).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(243,116,51,0.14),rgba(0,0,0,0.6))] p-4 shadow-[0_10px_26px_rgba(0,0,0,0.35)]">
              <h4 className="text-sm font-semibold text-white">Tipy / donaty</h4>
              <p className="text-[12px] text-[var(--mpc-muted)]">
                Připravujeme Stripe Connect. Zatím můžeš poslat dobrovolný příspěvek během streamu – budeme ho zobrazovat v chatu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
