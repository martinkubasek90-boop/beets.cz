'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from './notification-bell';

const links = [
  { href: '/beats', label: 'Beaty' },
  { href: '/projects', label: 'Projekty' },
  { href: '/artists', label: 'Umělci' },
  { href: '/collabs', label: 'Spolupráce' },
  { href: '/live', label: 'Live' },
  { href: '/faq', label: 'FAQ' },
];
const toolGroups = [
  {
    label: 'Audio',
    items: [
      { href: '/konvertor', label: 'Konvertor MP3' },
      { href: '/mpc-3000/konvertor', label: 'MPC 3000 Konvertor' },
      { href: '/mix-checklist', label: 'AI Mix Checklist' },
      { href: '/reference-match', label: 'Reference Match' },
      { href: '/drum-analyzer', label: 'Drum Analyzer' },
      { href: '/auto-mix-fix', label: 'Auto Mix Fix' },
      { href: '/stem-splitter', label: 'Stem Splitter' },
      { href: '/mix-targets', label: 'Mix Target Finder' },
    ],
  },
  {
    label: 'Grafika',
    items: [
      { href: '/cover-generator', label: 'AI Cover Generator' },
    ],
  },
];

export function MainNav() {
  const supabase = createClient();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ id: string; room_name: string; caller_id: string } | null>(null);
  const [callerName, setCallerName] = useState<string | null>(null);
  const [communityInvite, setCommunityInvite] = useState<{ room: string; from?: string | null } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      setUserId(data.session?.user?.id ?? null);
    };
    checkSession();
  }, [supabase]);

  useEffect(() => {
    setNavOpen(false);
    setToolsOpen(false);
  }, [pathname]);

  // Realtime příchozí hovory (globální popup)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('calls-listener-nav')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${userId}` },
        async (payload) => {
          const row: any = payload.new;
          if (!row || row.status !== 'ringing') return;
          setIncomingCall({ id: row.id, room_name: row.room_name, caller_id: row.caller_id });
          if (row.caller_id) {
            const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', row.caller_id).maybeSingle();
            setCallerName(prof?.display_name || null);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `callee_id=eq.${userId}` },
        (payload) => {
          const row: any = payload.new;
          if (!row || !incomingCall || row.id !== incomingCall.id) return;
          if (row.status && row.status !== 'ringing') {
            setIncomingCall(null);
            setCallerName(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingCall, supabase, userId]);

  // Broadcast komunitních callů – dorazí všem online
  useEffect(() => {
    const channel = supabase
      .channel('community-call-global')
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

  const acceptCall = () => {
    if (!incomingCall) return;
    // Otevři nejdřív okno (mobilní prohlížeče blokují popup po await)
    window.open(`https://meet.jit.si/${incomingCall.room_name}`, '_blank', 'noopener,noreferrer');
    void supabase
      .from('calls')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', incomingCall.id);
    setIncomingCall(null);
    setCallerName(null);
  };

  const declineCall = async () => {
    if (!incomingCall) return;
    try {
      await supabase.from('calls').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', incomingCall.id);
    } catch (err) {
      console.error('Chyba při odmítnutí hovoru:', err);
    } finally {
      setIncomingCall(null);
      setCallerName(null);
    }
  };

  const acceptCommunity = () => {
    if (!communityInvite) return;
    window.open(`https://meet.jit.si/${communityInvite.room}`, '_blank', 'noopener,noreferrer');
    setCommunityInvite(null);
  };

  const declineCommunity = () => {
    setCommunityInvite(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 relative">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[conic-gradient(from_90deg,var(--mpc-accent),var(--mpc-accent-2),var(--mpc-accent))] text-xs font-black text-[#050505] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
            B
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Beat komunita</p>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-white">Beets.cz</p>
          </div>
        </Link>
        <button
          onClick={() => setNavOpen((prev) => !prev)}
          className="md:hidden rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"
        >
          {navOpen ? 'Zavřít' : 'Menu'}
        </button>
        <nav className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-muted)] md:flex">
          {links.map((link) => (
            <Link key={link.href} className="relative py-1 hover:text-white" href={link.href}>
              {link.label}
              <span
                className={`absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 ${
                  pathname === link.href ? 'scale-x-100' : 'hover:scale-x-100'
                }`}
              />
            </Link>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen((prev) => !prev)}
              className="relative py-1 hover:text-white"
            >
              NÁSTROJE
              <span
                className={`absolute inset-x-0 -bottom-1 h-[2px] origin-center bg-[var(--mpc-accent)] transition-transform duration-200 ${
                  toolsOpen ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </button>
            {toolsOpen && (
              <div className="absolute left-1/2 mt-3 -translate-x-1/2 rounded-xl border border-white/10 bg-black/90 p-3 shadow-lg backdrop-blur z-50 pointer-events-auto min-w-[220px]">
                {toolGroups.map((group) => (
                  <div key={group.label} className="px-2 py-2">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                      {group.label}
                    </p>
                    <div className="mt-2">
                      {group.items.map((tool) => (
                        <Link
                          key={tool.href}
                          className="relative block py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-muted)] hover:text-white"
                          href={tool.href}
                          onClick={() => setToolsOpen(false)}
                        >
                          {tool.label}
                          <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 hover:scale-x-100" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-2 text-right flex-wrap justify-end">
          {isLoggedIn && <NotificationBell className="hidden md:inline-flex" />}
          {isLoggedIn ? (
            <Link
              href="/profile"
              className="inline-flex items-center rounded-full border border-white/20 bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
            >
              <span className="md:hidden">Profil</span>
              <span className="hidden md:inline">Můj profil</span>
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
            >
              <span className="md:hidden">Login</span>
              <span className="hidden md:inline">Přihlásit se</span>
            </Link>
          )}
        </div>
        {navOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-white/10 bg-black/90 p-4 shadow-lg md:hidden">
            <div className="flex flex-col gap-3 text-sm uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
              {links.map((link) => (
                <Link key={link.href} className="py-1 hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              ))}
              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Nástroje</p>
                <div className="mt-3 space-y-3">
                  {toolGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--mpc-muted)]">
                        {group.label}
                      </p>
                      <div className="mt-2 flex flex-col gap-2">
                        {group.items.map((tool) => (
                          <Link key={tool.href} className="py-1 hover:text-white" href={tool.href}>
                            {tool.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {isLoggedIn && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px]">Notifikace</span>
                  <NotificationBell />
                </div>
              )}
              {isLoggedIn ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
                >
                  Můj profil
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
      {incomingCall && (
        <div className="fixed inset-x-4 bottom-8 z-30 mx-auto max-w-lg rounded-2xl border border-[var(--mpc-accent)]/60 bg-black/90 p-4 text-sm text-white shadow-[0_15px_40px_rgba(0,0,0,0.55)] backdrop-blur sm:bottom-10 sm:left-1/2 sm:-translate-x-1/2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Příchozí hovor</p>
          <p className="mt-1 text-base font-semibold">{callerName || 'Uživatel'} volá…</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={acceptCall}
              className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
            >
              Přijmout
            </button>
            <button
              onClick={declineCall}
              className="rounded-full border border-white/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-white hover:border-red-400 hover:text-red-200"
            >
              Položit
            </button>
          </div>
        </div>
      )}
      {communityInvite && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-lg rounded-2xl border border-white/25 bg-black/90 p-4 text-sm text-white shadow-[0_15px_40px_rgba(0,0,0,0.55)] backdrop-blur sm:left-1/2 sm:-translate-x-1/2">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Komunitní call</p>
          <p className="mt-1 text-base font-semibold">
            {communityInvite.from ? `${communityInvite.from} spouští community call` : 'Community call je živý'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={acceptCommunity}
              className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
            >
              Připojit
            </button>
            <button
              onClick={declineCommunity}
              className="rounded-full border border-white/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-white hover:border-red-400 hover:text-red-200"
            >
              Zavřít
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
