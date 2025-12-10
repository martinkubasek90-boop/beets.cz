'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';

type CallRecord = {
  id: string;
  room_name: string;
  caller_id: string;
  callee_id: string;
  status: string;
};

const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si';

export default function CallPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      const roomFromUrl = searchParams.get('room');
      const callerFromUrl = searchParams.get('caller');
      const calleeFromUrl = searchParams.get('callee');

      const { data: auth } = await supabase.auth.getUser();
      const authedUser = auth.user;
      if (authedUser) {
        setUserId(authedUser.id);
      }

      const { data, error: err } = await supabase
        .from('calls')
        .select('id,room_name,caller_id,callee_id,status')
        .eq('id', params.id)
        .maybeSingle();

      if (data) {
        if (authedUser && data.caller_id !== authedUser.id && data.callee_id !== authedUser.id) {
          setError('K tomuto hovoru nemáš přístup.');
          return;
        }
        if (authedUser && data.status === 'ringing' && data.callee_id === authedUser.id) {
          await supabase
            .from('calls')
            .update({ status: 'accepted', accepted_at: new Date().toISOString() })
            .eq('id', data.id);
          data.status = 'accepted';
        }
        setCall(data as CallRecord);
        return;
      }

      // Fallback: pokud se nenašel záznam, ale v URL je room+caller+callee a aktuální user (pokud je) je účastník
      if (roomFromUrl && callerFromUrl && calleeFromUrl) {
        if (!authedUser || authedUser.id === callerFromUrl || authedUser.id === calleeFromUrl) {
          setCall({
            id: params.id,
            room_name: roomFromUrl,
            caller_id: callerFromUrl,
            callee_id: calleeFromUrl,
            status: 'accepted',
          });
          return;
        }
      }

      const msg = err?.message ? `Hovor nebyl nalezen: ${err.message}` : 'Hovor nebyl nalezen.';
      setError(msg);
    };
    void load();
  }, [params.id, searchParams, supabase]);

  // Aktualizuj status na ended při zavření
  useEffect(() => {
    const onUnload = async () => {
      if (!call || !userId) return;
      await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', call.id);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      void onUnload();
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [call, supabase, userId]);

  useEffect(() => {
    if (!call || typeof window === 'undefined' || !scriptReady) return;
    const init = () => {
      if (!window || !(window as any).JitsiMeetExternalAPI) {
        setError('Jitsi se nepodařilo načíst. Zkus stránku obnovit.');
        return;
      }
      if (!containerRef.current) return;
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      const Jitsi = (window as any).JitsiMeetExternalAPI;
      apiRef.current = new Jitsi(domain, {
        roomName: call.room_name,
        parentNode: containerRef.current,
        configOverwrite: {
          prejoinPageEnabled: true,
        },
      });
    };
    init();
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [call, scriptReady]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white">
        <p className="text-lg font-semibold">{error}</p>
        <button
          className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-[var(--mpc-accent)]"
          onClick={() => router.push('/')}
        >
          Zpět
        </button>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white">
        <p>Načítám hovor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f16] text-white">
      <Script src={`https://${domain}/external_api.js`} onLoad={() => setScriptReady(true)} />
      <header className="border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm text-[var(--mpc-muted,#9aa3b5)]">Hovor</p>
            <h1 className="text-xl font-semibold">Místnost: {call.room_name}</h1>
          </div>
          <div className="text-sm text-[var(--mpc-muted,#9aa3b5)]">
            Stav: <span className="text-white">{call.status}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
        <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-xl border border-white/10 bg-black" />
      </main>
    </div>
  );
}
