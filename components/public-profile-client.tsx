'use client';

import { useCallback, useEffect, useMemo, useRef, useState, FormEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';
import { useGlobalPlayer } from './global-player-provider';

async function sendNotificationSafe(
  supabase: ReturnType<typeof createClient>,
  payload: { user_id: string; type: string; title?: string | null; body?: string | null; item_type?: string | null; item_id?: string | null }
) {
  // basic guard to avoid invalid UUID errors
  if (!payload?.user_id || typeof payload.user_id !== 'string' || !payload.user_id.match(/^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/)) {
    return;
  }
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API notification failed');
    return;
  } catch {
    try {
      await supabase.from('notifications').insert({ ...payload, read: false });
    } catch (inner) {
      console.warn('Notifikaci se nepodařilo uložit:', inner);
    }
  }
}

type PublicProfile = {
  display_name: string;
  hardware: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  last_seen_at?: string | null;
  seeking_signals?: string[] | null;
  offering_signals?: string[] | null;
  seeking_custom?: string | null;
  offering_custom?: string | null;
  role?: 'superadmin' | 'admin' | 'creator' | 'mc' | null;
};

type Beat = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
};

type Acapella = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
};

type ProjectTrack = {
  name: string;
  url?: string | null;
  path?: string | null;
  id?: string;
  meta?: { projectId: string; trackIndex: number };
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
  project_url: string | null;
  tracks_json?: ProjectTrack[] | Record<string, ProjectTrack> | string;
};

const isProjectTrack = (value: unknown): value is ProjectTrack =>
  !!value &&
  typeof value === 'object' &&
  ('name' in (value as Record<string, unknown>) || 'url' in (value as Record<string, unknown>));

const normalizeProjectTracks = (raw?: Project['tracks_json']): ProjectTrack[] => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter(isProjectTrack);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(isProjectTrack);
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).filter(isProjectTrack);
      }
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') {
    return Object.values(raw).filter(isProjectTrack);
  }
  return [];
};

type Collaboration = {
  id: string;
  title: string;
  status?: string | null;
  bpm: number | null;
  mood: number | null;
  audio_url: string | null;
  cover_url?: string | null;
  partners: string[];
  updated_at?: string | null;
};

type TrackMeta = {
  projectId?: string;
  trackIndex?: number;
};

type CurrentTrack = {
  id: string;
  title: string;
  source: 'beat' | 'project' | 'collab' | 'acapella';
  url: string;
  cover_url?: string | null;
  subtitle?: string | null;
  meta?: TrackMeta;
};

type IncomingCall = {
  id: string;
  room_name: string;
  caller_id: string;
};

function buildRoomName(a: string, b: string) {
  const sorted = [a, b].sort();
  return `beets-${sorted[0]}-${sorted[1]}`;
}

const COMMUNITY_ROOM = 'beets-community-main';

export default function PublicProfileClient({ profileId }: { profileId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [beats, setBeats] = useState<Beat[]>([]);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [acapellas, setAcapellas] = useState<Acapella[]>([]);
  const [acapellasError, setAcapellasError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [tabsOpen, setTabsOpen] = useState(false);

  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [collabsError, setCollabsError] = useState<string | null>(null);
  // collabsReload zůstává kvůli případnému budoucímu refreshi, nyní ho nepoužíváme
  const _collabsReload = 0;
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [collabSubject, setCollabSubject] = useState('');
  const [collabMessage, setCollabMessage] = useState('');
  const [collabFile, setCollabFile] = useState<File | null>(null);
  const [collabFileError, setCollabFileError] = useState<string | null>(null);
  const [collabRequestState, setCollabRequestState] = useState<'idle' | 'sending' | 'success'>('idle');
  const [collabRequestError, setCollabRequestError] = useState<string | null>(null);
  const projectQueueRef = useRef<{ projectId: string; queue: CurrentTrack[]; idx: number } | null>(null);

  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState<string | null>(null);
  const {
    current: currentTrack,
    isPlaying,
    currentTime,
    duration,
    play,
    toggle,
    seek,
    setOnEnded,
    setOnNext,
    setOnPrev,
  } = useGlobalPlayer();
  const [playerError, setPlayerError] = useState<string | null>(null);

  const loadBeats = useCallback(async () => {
    const { data, error } = await supabase
      .from('beats')
      .select('id, title, bpm, mood, audio_url, cover_url')
      .eq('user_id', profileId)
      .order('id', { ascending: false })
      .limit(10);
    if (error) {
      console.error('Chyba načítání beatů:', error);
      setBeatsError('Nepodařilo se načíst beaty.');
    } else {
      setBeats((data as Beat[]) ?? []);
      setBeatsError(null);
    }
  }, [profileId, supabase]);

  const loadAcapellas = useCallback(async () => {
    const { data, error } = await supabase
      .from('acapellas')
      .select('id, title, bpm, mood, audio_url, cover_url')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      console.error('Chyba načítání akapel:', error);
      setAcapellasError('Nepodařilo se načíst akapely.');
    } else {
      setAcapellas((data as Acapella[]) ?? []);
      setAcapellasError(null);
    }
  }, [profileId, supabase]);

  const loadProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, description, cover_url, project_url, tracks_json, access_mode')
      .eq('user_id', profileId)
      .order('id', { ascending: false })
      .limit(6);
    if (error) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
          ? (error as any).message
          : 'Neznámá chyba';
      console.error('Chyba načítání projektů:', error);
      setProjectsError('Nepodařilo se načíst projekty: ' + message);
      return;
    }
    setProjects((data as Project[]) ?? []);
    setProjectsError(null);
  }, [profileId, supabase]);

  const loadCollabs = useCallback(async () => {
    if (!currentUserId || currentUserId !== profileId) {
      setCollabs([]);
      setCollabsError('Spolupráce tohoto profilu jsou soukromé. Žádost o spolupráci může poslat pouze registrovaný uživatel.');
      return;
    }
    const fields = `
      id,
      title,
      status,
      result_audio_url,
      result_cover_url,
      updated_at
    `;
    try {
      const creatorPromise = supabase
        .from('collab_threads')
        .select(fields)
        .eq('created_by', profileId)
        .order('updated_at', { ascending: false });
      const participantIdsPromise = supabase
        .from('collab_participants')
        .select('thread_id')
        .eq('user_id', profileId);

      const [byCreator, participantIds] = await Promise.all([creatorPromise, participantIdsPromise]);
      if (byCreator.error) throw byCreator.error;
      if (participantIds.error) throw participantIds.error;

      const participantThreadIds = Array.from(
        new Set(
          ((participantIds.data as any[]) ?? [])
            .map((row) => row.thread_id)
            .filter(Boolean)
        )
      );

      const participantThreadsResult =
        participantThreadIds.length > 0
          ? await supabase
              .from('collab_threads')
              .select(fields)
              .in('id', participantThreadIds)
              .order('updated_at', { ascending: false })
          : { data: [], error: null };

      if (participantThreadsResult.error) throw participantThreadsResult.error;

      const mergedThreads = new Map<string, Collaboration>();
      const collect = (items: any[] = []) => {
        items.forEach((thread) => {
          if (!thread?.id) return;
          mergedThreads.set(thread.id, {
            id: thread.id,
            title: thread.title || 'Spolupráce',
            status: thread.status ?? null,
            bpm: null,
            mood: null,
            audio_url: thread.result_audio_url ?? null,
            cover_url: thread.result_cover_url ?? null,
            partners: [],
            updated_at: thread.updated_at ?? null,
          });
        });
      };

      collect(byCreator.data as any[]);
      collect(participantThreadsResult.data as any[]);

      const threadIds = Array.from(mergedThreads.keys());
      if (threadIds.length) {
        const { data: participants, error: participantsErr } = await supabase
          .from('collab_participants')
          .select('thread_id,user_id')
          .in('thread_id', threadIds);
        if (participantsErr) throw participantsErr;
        const userIds = Array.from(new Set((participants ?? []).map((p: any) => p.user_id).filter(Boolean)));
        let nameMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles, error: profileErr } = await supabase
            .from('profiles')
            .select('id,display_name')
            .in('id', userIds);
          if (profileErr) throw profileErr;
          if (profiles) {
            nameMap = Object.fromEntries(
              (profiles as any[]).map((p) => [p.id, (p.display_name as string) || ''])
            );
          }
        }

        const threadNames = new Map<string, string[]>();
        (participants ?? []).forEach((p: any) => {
          const thread = mergedThreads.get(p.thread_id);
          if (!thread) return;
          const displayName = nameMap[p.user_id] || p.user_id;
          if (!threadNames.has(p.thread_id)) {
            threadNames.set(p.thread_id, []);
          }
          const list = threadNames.get(p.thread_id)!;
          if (!list.includes(displayName)) {
            list.push(displayName);
          }
        });

        const ownerName = profile?.display_name || 'Ty';
        setCollabs(
          Array.from(mergedThreads.values()).map((thread) => {
            const partners = threadNames.get(thread.id) ?? [];
            const partnerLabel = partners.length ? partners.filter((name) => name !== ownerName) : [];
            const partnerDisplay = partnerLabel.length ? partnerLabel.join(' • ') : 'někým';
            return {
              ...thread,
              title: `Spolupráce ${ownerName} a ${partnerDisplay}`,
            };
          })
        );
      } else {
        setCollabs(Array.from(mergedThreads.values()));
      }
      setCollabsError(null);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Neznámá chyba';
      console.error('Chyba načítání spoluprací:', err);
      setCollabs([]);
      setCollabsError('Nepodařilo se načíst spolupráce: ' + message);
    }
  }, [currentUserId, profile?.display_name, profileId, supabase]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const selectBase =
          'display_name, hardware, bio, avatar_url, banner_url, seeking_signals, offering_signals, seeking_custom, offering_custom, role';
        const { data: profileDataFull, error: profileErr } = await supabase
          .from('profiles')
          .select(selectBase)
          .eq('id', profileId)
          .maybeSingle();

        let profileData = profileDataFull as any;
        if (profileErr && typeof profileErr.message === 'string' && profileErr.message.includes('column')) {
          const { data: fallback, error: fbError } = await supabase
            .from('profiles')
            .select('display_name, hardware, bio, avatar_url, banner_url')
            .eq('id', profileId)
            .maybeSingle();
          if (fbError) throw fbError;
          profileData = fallback
            ? {
                ...fallback,
                seeking_signals: [],
                offering_signals: [],
                seeking_custom: null,
                offering_custom: null,
              }
            : null;
        } else if (profileErr) {
          throw profileErr;
        }

        if (profileData) {
          setProfile({
            display_name: profileData.display_name ?? 'Uživatel',
            hardware: profileData.hardware ?? '',
            bio: profileData.bio ?? '',
            avatar_url: profileData.avatar_url ?? null,
            banner_url: (profileData as any).banner_url ?? null,
            seeking_signals: (profileData as any).seeking_signals ?? [],
            offering_signals: (profileData as any).offering_signals ?? [],
            seeking_custom: (profileData as any).seeking_custom ?? null,
            offering_custom: (profileData as any).offering_custom ?? null,
            role: (profileData as any).role ?? null,
          });
          const mcOnly = (profileData as any)?.role === 'mc';
          if (mcOnly) {
            await loadAcapellas();
            setBeats([]);
            setProjects([]);
            setBeatsError(null);
            setProjectsError(null);
          } else {
            await loadBeats();
            await loadProjects();
            await loadCollabs();
          }
        } else {
          setProfile(null);
          setProfileError('Profil nenalezen.');
        }
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
            ? (err as any).message
            : 'Neznámá chyba';
        console.error('Chyba při načítání profilu:', err);
        setProfileError('Nepodařilo se načíst profil. ' + message);
      }
    };

    const loadBeats = async () => {
        const { data, error } = await supabase
          .from('beats')
          .select('id, title, bpm, mood, audio_url, cover_url')
          .eq('user_id', profileId)
          .order('id', { ascending: false })
          .limit(10);
      if (error) {
        console.error('Chyba načítání beatů:', error);
        setBeatsError('Nepodařilo se načíst beaty.');
      } else {
        setBeats((data as Beat[]) ?? []);
        setBeatsError(null);
      }
    };

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      setIsLoggedIn(!!uid);
      setCurrentUserId(uid ?? null);
      if (uid && uid === profileId) {
        router.push('/profile');
      }
    };

    loadSession();
    loadData();
    // Realtime příchozí hovory
    const channel = supabase
      .channel('calls-listener')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` },
        async (payload) => {
          const row: any = payload.new;
          if (!row || row.status !== 'ringing' || row.callee_id !== currentUserId) return;
          setIncomingCall({ id: row.id, room_name: row.room_name, caller_id: row.caller_id });
          if (row.caller_id) {
            const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', row.caller_id).maybeSingle();
            setIncomingCallerName(prof?.display_name || null);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `callee_id=eq.${currentUserId}` },
        (payload) => {
          const row: any = payload.new;
          if (!row || !incomingCall || row.id !== incomingCall.id) return;
          if (row.status && row.status !== 'ringing') {
            setIncomingCall(null);
            setIncomingCallerName(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, incomingCall, loadAcapellas, loadBeats, loadCollabs, loadProjects, profileId, router, supabase]);

  const handleRequestCollab = async () => {
    if (!isLoggedIn) {
      setCollabRequestError('Musíš být přihlášen.');
      return;
    }
    if (!collabSubject.trim()) {
      setCollabRequestError('Zadej název spolupráce.');
      return;
    }
    if (!currentUserId || currentUserId === profileId) {
      setCollabRequestError('Nelze požádat sám sebe.');
      return;
    }
    setCollabRequestError(null);
        setCollabRequestState('sending');
        try {
          const [myThreads, partnerThreads] = await Promise.all([
            supabase.from('collab_participants').select('thread_id').eq('user_id', currentUserId),
            supabase.from('collab_participants').select('thread_id').eq('user_id', profileId),
      ]);
      const mySet = new Set((myThreads.data ?? []).map((r: any) => r.thread_id));
      const existing = (partnerThreads.data ?? []).find((r: any) => mySet.has(r.thread_id));
      if (existing?.thread_id) {
        setCollabRequestError('Spolupráce již existuje.');
        setCollabRequestState('idle');
        return;
      }

      const { data: thread, error: threadErr } = await supabase
        .from('collab_threads')
        .insert({ title: collabSubject.trim(), created_by: currentUserId })
        .select('id')
        .single();
      if (threadErr) throw threadErr;
      const threadId = thread?.id as string;
      const rows = [
        { thread_id: threadId, user_id: currentUserId, role: 'owner' },
        { thread_id: threadId, user_id: profileId, role: 'guest' },
      ];
      const { error: partErr } = await supabase.from('collab_participants').insert(rows);
      if (partErr) throw partErr;

      if (collabMessage.trim()) {
        const { error: msgErr } = await supabase
          .from('collab_messages')
          .insert({ thread_id: threadId, user_id: currentUserId, body: collabMessage.trim() });
        if (msgErr) throw msgErr;
      }

      // Volitelný soubor
      if (collabFile) {
        try {
          setCollabFileError(null);
          const safe = collabFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const path = `${currentUserId}/collabs/${Date.now()}-${safe}`;
          const { error: upErr } = await supabase.storage.from('collabs').upload(path, collabFile, { upsert: true });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('collabs').getPublicUrl(path);
          const publicUrl = pub?.publicUrl;
          if (publicUrl) {
            const { error: fileErr } = await supabase
              .from('collab_files')
              .insert({ thread_id: threadId, user_id: currentUserId, file_url: publicUrl, file_name: collabFile.name });
            if (fileErr) throw fileErr;
          }
        } catch (err) {
          const message =
            err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
              ? (err as any).message
              : 'Nepodařilo se nahrát soubor.';
          setCollabFileError(message);
        }
      }

      setCollabRequestState('success');
      setCollabSubject('');
      setCollabMessage('');
      setCollabFile(null);
      setShowCollabForm(false);
      if (profileId) {
        void sendNotificationSafe(supabase, {
          user_id: profileId,
          type: 'collab_created',
          title: 'Nová žádost o spolupráci',
          body: collabSubject.trim(),
          item_type: 'collab_thread',
          item_id: threadId,
        });
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Nepodařilo se vytvořit spolupráci.';
      setCollabRequestError(message);
      setCollabRequestState('idle');
    }
  };

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    setMessageError(null);
    setMessageSuccess(null);
    if (!messageBody.trim()) {
      setMessageError('Zpráva je prázdná.');
      return;
    }
    try {
      setSendingMessage(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessageError('Musíš být přihlášen.');
        return;
      }
      const payload = {
        user_id: userData.user.id,
        to_user_id: profileId,
        from_name: userData.user.email ?? 'Uživatel',
        to_name: profile?.display_name ?? 'Uživatel',
        body: messageBody.trim(),
      };
      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
      setMessageBody('');
      setMessageSuccess('Zpráva odeslána.');
      if (profileId) {
        void sendNotificationSafe(supabase, {
          user_id: profileId,
          type: 'direct_message',
          title: payload.from_name || 'Nová zpráva',
          body: payload.body,
          item_type: 'message',
        });
      }
    } catch (err) {
      console.error('Chyba při odeslání zprávy:', err);
      setMessageError('Nepodařilo se odeslat zprávu.');
    } finally {
      setSendingMessage(false);
    }
  }

  const beatTracks = useMemo<CurrentTrack[]>(() => {
    return beats
      .filter((beat) => Boolean(beat.audio_url))
      .map((beat) => ({
        id: `beat-${beat.id}`,
        title: beat.title,
        url: beat.audio_url || '',
        source: 'beat',
        cover_url: beat.cover_url ?? null,
        subtitle: profile?.display_name ?? null,
      }));
  }, [beats, profile?.display_name]);

  const acapellaTracks = useMemo<CurrentTrack[]>(() => {
    return acapellas
      .filter((item) => Boolean(item.audio_url))
      .map((item) => ({
        id: `acapella-${item.id}`,
        title: item.title,
        url: item.audio_url || '',
        source: 'acapella',
        cover_url: item.cover_url ?? null,
        subtitle: profile?.display_name ?? null,
      }));
  }, [acapellas, profile?.display_name]);

  const projectTracksMap = useMemo<Record<string, CurrentTrack[]>>(() => {
    const map: Record<string, CurrentTrack[]> = {};
    projects.forEach((project) => {
      if (project.access_mode === 'private') return;
      const tracks: CurrentTrack[] = [];
      normalizeProjectTracks(project.tracks_json).forEach((track, idx) => {
        if (!track.url) return;
        tracks.push({
          id: `project-${project.id}-${idx}`,
          title: track.name || `Track ${idx + 1}`,
          url: track.url,
          source: 'project',
          cover_url: project.cover_url ?? null,
          subtitle: project.title,
          meta: { projectId: project.id, trackIndex: idx },
        });
      });
      if (tracks.length === 0 && project.project_url) {
        tracks.push({
          id: `project-${project.id}`,
          title: project.title,
          url: project.project_url,
          source: 'project',
          cover_url: project.cover_url ?? null,
          subtitle: project.title,
          meta: { projectId: project.id, trackIndex: -1 },
        });
      }
      if (tracks.length) {
        map[project.id] = tracks;
      }
    });
    return map;
  }, [projects]);

  const collabTracks = useMemo<CurrentTrack[]>(() => {
    return collabs
      .filter((col) => Boolean(col.audio_url))
      .map((col) => ({
        id: `collab-${col.id}`,
        title: col.title,
        url: col.audio_url || '',
        source: 'collab',
        cover_url: col.cover_url ?? null,
        subtitle: col.partners.join(' • ') || profile?.display_name || null,
      }));
  }, [collabs, profile?.display_name]);

  const buildPlayerTrack = useCallback(
    (track: CurrentTrack) => ({
      id: track.id,
      title: track.title,
      url: track.url,
      cover_url: track.cover_url,
      artist: track.subtitle || profile?.display_name || 'Profil',
      item_type: track.source,
      meta: track.meta,
    }),
    [profile?.display_name]
  );

  const startTrack = useCallback(
    (track: CurrentTrack) => {
      if (!track.url) return;
      setPlayerError(null);

      // Pokud jde o projektový track a máme dostupné next/prev/ended, nastavíme frontu
      if (track.source === 'project' && track.meta?.projectId && setOnNext && setOnPrev && setOnEnded) {
        const queue = projectTracksMap[track.meta.projectId]?.filter((t) => t.url) || [];
        if (!queue.length) {
          play(buildPlayerTrack(track));
          setOnNext && setOnNext(null);
          setOnPrev && setOnPrev(null);
          setOnEnded && setOnEnded(null);
          return;
        }
        const initialIdx = Math.max(queue.findIndex((t) => t.id === track.id), 0);
        const playFromQueue = (idx: number) => {
          const nextTrack = queue[idx];
          if (!nextTrack?.url) return;
          projectQueueRef.current = { projectId: track.meta!.projectId as string, queue, idx };
          play(buildPlayerTrack(nextTrack));
        };

        playFromQueue(initialIdx);

        setOnNext(() => {
          const q = projectQueueRef.current;
          const qQueue = q?.queue ?? queue;
          if (!qQueue.length) return;
          const next = ((q?.idx ?? initialIdx) + 1) % qQueue.length;
          playFromQueue(next);
        });
        setOnPrev(() => {
          const q = projectQueueRef.current;
          const qQueue = q?.queue ?? queue;
          if (!qQueue.length) return;
          const prev = ((q?.idx ?? initialIdx) - 1 + qQueue.length) % qQueue.length;
          playFromQueue(prev);
        });
        setOnEnded(() => {
          const q = projectQueueRef.current;
          const qQueue = q?.queue ?? queue;
          if (!qQueue.length) return;
          const next = ((q?.idx ?? initialIdx) + 1) % qQueue.length;
          playFromQueue(next);
        });
        return;
      }

      // Fallback: standard přehrání
      play(buildPlayerTrack(track));
      setOnNext && setOnNext(null);
      setOnPrev && setOnPrev(null);
      setOnEnded && setOnEnded(null);
    },
    [buildPlayerTrack, play, projectTracksMap, setOnEnded, setOnNext, setOnPrev]
  );

  function handlePlayTrack(track: CurrentTrack) {
    if (!track.url) {
      setPlayerError('Tento záznam nemá audio soubor.');
      return;
    }
    if (currentTrack?.id === track.id) {
      setPlayerError(null);
      toggle();
      return;
    }
    startTrack(track);
  }

  function handleTrackProgressClick(trackId: string, e: MouseEvent<HTMLDivElement>) {
    if (currentTrack?.id !== trackId) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    seek(ratio);
  }

  function handleGlobalProgressClick(e: MouseEvent<HTMLDivElement>) {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    seek(ratio);
  }

  useEffect(() => {
    if (!setOnNext || !setOnPrev || !setOnEnded) return;
    if (currentTrack?.item_type === 'project' && projectQueueRef.current?.projectId === currentTrack?.meta?.projectId) {
      return;
    }
    const cycleTracks = (items: CurrentTrack[], direction: 1 | -1) => {
      if (!items.length) return;
      const currentId = currentTrack?.id;
      const idx = items.findIndex((item) => item.id === currentId);
      const nextIndex =
        idx === -1
          ? direction === 1
            ? 0
            : items.length - 1
          : (idx + direction + items.length) % items.length;
      startTrack(items[nextIndex]);
    };

    const handleNext = () => {
      if (!currentTrack) {
        if (acapellaTracks.length) {
          startTrack(acapellaTracks[0]);
          return;
        }
        if (beatTracks.length) {
          startTrack(beatTracks[0]);
        }
        return;
      }
      if (currentTrack.item_type === 'beat') {
        cycleTracks(beatTracks, 1);
        return;
      }
      if (currentTrack.item_type === 'acapella') {
        cycleTracks(acapellaTracks, 1);
        return;
      }
      if (currentTrack.item_type === 'project') {
        const projectId = currentTrack.meta?.projectId;
        if (projectId) {
          const queue = projectTracksMap[projectId];
          if (queue?.length) {
            cycleTracks(queue, 1);
            return;
          }
        }
      }
      if (currentTrack.item_type === 'collab') {
        cycleTracks(collabTracks, 1);
      }
    };

    const handlePrev = () => {
      if (!currentTrack) {
        if (acapellaTracks.length) {
          startTrack(acapellaTracks[acapellaTracks.length - 1]);
          return;
        }
        if (beatTracks.length) {
          startTrack(beatTracks[beatTracks.length - 1]);
        }
        return;
      }
      if (currentTrack.item_type === 'beat') {
        cycleTracks(beatTracks, -1);
        return;
      }
      if (currentTrack.item_type === 'acapella') {
        cycleTracks(acapellaTracks, -1);
        return;
      }
      if (currentTrack.item_type === 'project') {
        const projectId = currentTrack.meta?.projectId;
        if (projectId) {
          const queue = projectTracksMap[projectId];
          if (queue?.length) {
            cycleTracks(queue, -1);
            return;
          }
        }
      }
      if (currentTrack.item_type === 'collab') {
        cycleTracks(collabTracks, -1);
      }
    };

    setOnNext(handleNext);
    setOnPrev(handlePrev);
    setOnEnded(handleNext);
    return () => {
      setOnNext(null);
      setOnPrev(null);
      setOnEnded(null);
    };
  }, [
    acapellaTracks,
    beatTracks,
    collabTracks,
    currentTrack,
    setOnEnded,
    projectTracksMap,
    setOnNext,
    setOnPrev,
    startTrack,
  ]);

  function formatTime(sec: number) {
    if (!sec || Number.isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  const heroName = profile?.display_name || 'Profil';
  const currentCover = currentTrack?.cover_url || null;
  const currentSubtitle = currentTrack?.artist || profile?.display_name || null;
  const progressRatio = duration ? Math.min(currentTime / duration, 1) : 0;
  const lastSeenMs = profile?.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  const isOnline = lastSeenMs && Date.now() - lastSeenMs < 5 * 60 * 1000;
  const statusColor = isOnline ? 'bg-emerald-500' : 'bg-red-500';
  const statusLabel = isOnline ? 'Online' : 'Offline';
  const isMcOnly = profile?.role === 'mc';

  const handleCommunityCall = () => {
    void supabase
      .channel('community-call')
      .send({
        type: 'broadcast',
        event: 'community-call',
        payload: { room: COMMUNITY_ROOM, fromName: profile?.display_name || null },
      })
      .catch((err) => console.warn('Community call broadcast failed:', err));
    window.open(`https://meet.jit.si/${COMMUNITY_ROOM}`, '_blank', 'noopener,noreferrer');
  };

  async function handleStartCall() {
    if (!isLoggedIn || !currentUserId) {
      setMessageError('Musíš být přihlášen pro volání.');
      return;
    }
    if (profileId === currentUserId) {
      setMessageError('Nemůžeš volat sám sobě.');
      return;
    }
    setMessageError(null);
    setStartingCall(true);
    try {
      const roomName = buildRoomName(profileId, currentUserId);
      const { data, error } = await supabase
        .from('calls')
        .insert({
          room_name: roomName,
          caller_id: currentUserId,
          callee_id: profileId,
          status: 'ringing',
        })
        .select('id')
        .single();
      if (error) throw error;
      const url = `https://meet.jit.si/${roomName}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      // Pošli notifikaci příjemci
      await sendNotificationSafe(supabase, {
        user_id: profileId,
        type: 'call_incoming',
        title: 'Příchozí hovor',
        body: profile?.display_name || 'Uživatel',
        item_type: 'call',
        item_id: data?.id || roomName,
      });
    } catch (err) {
      console.error('Chyba při startu hovoru:', err);
      setMessageError('Nepodařilo se otevřít hovor.');
    } finally {
      setStartingCall(false);
    }
  }

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      await supabase
        .from('calls')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', incomingCall.id);
    } catch (err) {
      console.error('Chyba při označení hovoru jako přijatého:', err);
    } finally {
      window.open(`https://meet.jit.si/${incomingCall.room_name}`, '_blank', 'noopener,noreferrer');
      setIncomingCall(null);
      setIncomingCallerName(null);
    }
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      await supabase.from('calls').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', incomingCall.id);
    } catch (err) {
      console.error('Chyba při odmítnutí hovoru:', err);
    } finally {
      setIncomingCall(null);
      setIncomingCallerName(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0c0f16] text-[var(--mpc-light)]">
      {playerError && (
        <div className="fixed top-3 right-3 z-50 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-sm text-red-100 shadow-lg">
          {playerError}
        </div>
      )}
      <section
        className="relative overflow-hidden border-b border-[var(--mpc-dark)]"
        style={{
          backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : 'url("/mpc-hero.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/25" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 md:h-28 md:w-28">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profilová fotka"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--mpc-light)]">
                    {heroName ? heroName.charAt(0).toUpperCase() : 'MPC'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-black/70 bg-black/75 px-4 py-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur sm:justify-start">
                    <span className="text-2xl font-black uppercase tracking-[0.12em] md:text-3xl">
                      {heroName}
                    </span>
                    <div className="flex items-center gap-1 text-[12px] text-white/90">
                      <span className={`inline-flex h-3 w-3 rounded-full ${statusColor}`} aria-hidden />
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                  <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur sm:justify-start">
                    <span className="text-[13px] font-semibold tracking-[0.08em]">
                      {t('profile.hardware', 'Hardware')}:
                    </span>
                    <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                      {profile?.hardware || t('profile.noHardware', 'Profil uživatele platformy.')}
                    </span>
                  </div>
                  <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur sm:justify-start">
                    <span className="text-[13px] font-semibold tracking-[0.08em]">
                      {t('profile.bioLabel', 'Bio')}:
                    </span>
                    <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                      {profile?.bio || t('profile.noBio', 'Profil zatím nemá popis.')}
                    </span>
                  </div>
                  {(profile?.seeking_signals?.length || profile?.seeking_custom) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Hledám:</span>
                      {profile?.seeking_signals?.map((opt) => (
                        <span
                          key={`seeking-${opt}`}
                          className="rounded-full border border-[var(--mpc-accent)]/70 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-accent)] shadow-[0_8px_18px_rgba(243,116,51,0.25)]"
                        >
                          {opt}
                        </span>
                      ))}
                      {profile?.seeking_custom && (
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                          {profile.seeking_custom}
                        </span>
                      )}
                    </div>
                  )}
                  {(profile?.offering_signals?.length || profile?.offering_custom) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Nabízím:</span>
                      {profile?.offering_signals?.map((opt) => (
                        <span
                          key={`offering-${opt}`}
                          className="rounded-full border border-emerald-400/60 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200 shadow-[0_8px_18px_rgba(16,185,129,0.25)]"
                        >
                          {opt}
                        </span>
                      ))}
                      {profile?.offering_custom && (
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                          {profile.offering_custom}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Krátké info už je nahoře vedle hardware */}
          {profileError && (
            <p className="mt-2 text-sm text-red-300">{profileError}</p>
          )}
        </div>
      </section>

      
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.15em] text-[var(--mpc-muted)] border-b border-[var(--mpc-dark)] pb-3 md:text-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-black/60 bg-black/80 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:bg-black"
          >
            <span className="text-[14px]">←</span>
            <span>Zpět</span>
          </Link>
          <button
            onClick={() => setTabsOpen((p) => !p)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:border-[var(--mpc-accent)] md:hidden"
          >
            Menu <span className="text-[13px]">{tabsOpen ? '▲' : '▼'}</span>
          </button>
          {isMcOnly ? (
            <div className="hidden items-center gap-3 md:flex">
              <a href="#acapellas-section" className="font-semibold text-white relative pb-2">
                {t('publicProfile.nav.all', 'Vše')}
                <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[var(--mpc-accent)]" />
              </a>
              <a href="#acapellas-section" className="hover:text-[var(--mpc-light)]">
                {t('publicProfile.nav.collabs', 'Akapely')}
              </a>
            </div>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <a href="#beats-section" className="font-semibold text-white relative pb-2">
                {t('publicProfile.nav.all', 'Vše')}
                <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[var(--mpc-accent)]" />
              </a>
              <a href="#beats-section" className="hover:text-[var(--mpc-light)]">
                {t('publicProfile.nav.beats', 'Beaty')}
              </a>
              <a href="#projects-section" className="hover:text-[var(--mpc-light)]">
                {t('publicProfile.nav.projects', 'Projekty')}
              </a>
              <a href="#collabs-section" className="hover:text-[var(--mpc-light)]">
                {t('publicProfile.nav.collabs', 'Spolupráce')}
              </a>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleCommunityCall}
            className="inline-flex h-10 items-center rounded-full border border-white/20 bg-black/50 px-4 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_20px_rgba(0,0,0,0.35)] hover:bg-white/10"
          >
            Komunitní call
          </button>
          {currentUserId && currentUserId !== profileId && (
            <button
              onClick={handleStartCall}
              disabled={startingCall}
              className="inline-flex h-10 items-center rounded-full border border-[var(--mpc-accent)] bg-black/50 px-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--mpc-accent)] shadow-[0_10px_20px_rgba(0,0,0,0.35)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
            >
              {startingCall ? 'Vytvářím hovor…' : 'Zahájit hovor'}
            </button>
          )}
          <a
            href="#message-form"
            className="inline-flex h-10 items-center rounded-full bg-[var(--mpc-accent)] px-5 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)] hover:translate-y-[1px]"
          >
            {t('publicProfile.sendMessage', 'Poslat zprávu')}
          </a>
        </div>
      </div>
      {incomingCall && (
        <div className="mt-4 rounded-xl border border-[var(--mpc-accent)]/40 bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <p className="text-sm font-semibold text-white">Volá ti {incomingCallerName || 'uživatel'}.</p>
          <p className="text-xs text-[var(--mpc-muted)]">Chceš hovor přijmout?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={acceptIncomingCall}
              className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_20px_rgba(255,75,129,0.35)]"
            >
              Přijmout
            </button>
            <button
              onClick={declineIncomingCall}
              className="rounded-full border border-white/20 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white hover:border-red-400 hover:text-red-200"
            >
              Položit
            </button>
          </div>
        </div>
      )}
      {tabsOpen && (
        <div className="md:hidden grid gap-2 text-xs uppercase tracking-[0.14em] text-[var(--mpc-muted)]">
          <a href={isMcOnly ? '#acapellas-section' : '#beats-section'} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[var(--mpc-light)]">
            {t('publicProfile.nav.all', 'Vše')}
          </a>
            {isMcOnly ? (
              <a href="#acapellas-section" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                {t('publicProfile.nav.collabs', 'Akapely')}
              </a>
            ) : (
              <>
                <a href="#beats-section" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                  {t('publicProfile.nav.beats', 'Beaty')}
                </a>
                <a href="#projects-section" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                  {t('publicProfile.nav.projects', 'Projekty')}
                </a>
                <a href="#collabs-section" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                  {t('publicProfile.nav.collabs', 'Spolupráce')}
                </a>
              </>
            )}
          </div>
        )}

        {isMcOnly ? (
          <div id="acapellas-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--mpc-light)]">Akapely</h2>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{acapellas.length} {t('profile.items', 'položek')}</p>
              </div>
            </div>
            {acapellasError && (
              <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                {acapellasError}
              </div>
            )}
            {acapellas.length === 0 ? (
              <p className="text-sm text-[var(--mpc-muted)]">Žádné akapely k zobrazení.</p>
            ) : (
              <div className="space-y-3">
                {acapellas.map((item) => {
                  const trackId = `acapella-${item.id}`;
                  const isCurrent = currentTrack?.id === trackId;
                  const progressPct = isCurrent && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%';
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                    >
                      <div
                        className="relative overflow-hidden rounded-xl border border-white/5 p-4"
                        style={{
                          background: 'linear-gradient(135deg, #090012 0%, #0a3a70 55%, #ff007a 100%)',
                        }}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 text-[11px] uppercase tracking-[0.1em] text-white">
                              {item.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <span>{item.title.slice(0, 2)}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-base font-semibold text-white">{item.title}</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">
                                {item.bpm ? `${item.bpm} BPM` : '—'} · {item.mood || '—'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handlePlayTrack({
                                id: trackId,
                                title: item.title,
                                url: item.audio_url || '',
                                source: 'acapella',
                                cover_url: item.cover_url,
                                subtitle: profile?.display_name || null,
                              })
                            }
                            disabled={!item.audio_url}
                            className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0"
                          >
                            {isCurrent && isPlaying ? '▮▮ Pauza' : '► Přehrát'}
                          </button>
                        </div>
                        <div
                          className="mt-3 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                          onClick={(e) => {
                            if (!isCurrent) return;
                            handleTrackProgressClick(trackId, e);
                          }}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                            style={{ width: progressPct }}
                          />
                        </div>
                        {isCurrent && (
                          <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Beaty */}
        <div id="beats-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.beats.title', 'Beaty')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{beats.length} {t('profile.items', 'položek')}</p>
            </div>
          </div>
          {beatsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {beatsError}
            </div>
          )}
          {beats.length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné beaty k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {beats.map((beat) => {
                const trackId = `beat-${beat.id}`;
                const isCurrent = currentTrack?.id === trackId;
                const progressPct = isCurrent && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%';
                return (
                  <div
                    key={beat.id}
                    className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                  >
                    <div
                      className="relative overflow-hidden rounded-xl border border-white/5 p-4"
                      style={{
                        background: 'linear-gradient(135deg, #000409 0%, #0a704e 55%, #fb8b00 100%)',
                      }}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 text-[11px] uppercase tracking-[0.1em] text-white">
                            {beat.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
                            ) : (
                              <span>{beat.title.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">{beat.title}</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">
                              {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handlePlayTrack({
                              id: `beat-${beat.id}`,
                              title: beat.title,
                              url: beat.audio_url || '',
                              source: 'beat',
                              cover_url: beat.cover_url,
                              subtitle: profile?.display_name || null,
                            })
                          }
                          disabled={!beat.audio_url}
                          className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          {isCurrent && isPlaying ? '▮▮ Pauza' : '► Přehrát'}
                        </button>
                      </div>
                      <div
                        className="mt-3 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                        onClick={(e) => {
                          if (!isCurrent) return;
                          handleTrackProgressClick(trackId, e);
                        }}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                          style={{ width: progressPct }}
                        />
                      </div>
                      {isCurrent && (
                        <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Projekty */}
        <div id="projects-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.projects.title', 'Projekty')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{projects.length} {t('profile.items', 'položek')}</p>
            </div>
          </div>
          {projectsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {projectsError}
            </div>
          )}
          {projects.filter((p) => p.access_mode !== 'private').length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné projekty k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {projects.filter((p) => p.access_mode !== 'private').map((project) => {
                const tracks = normalizeProjectTracks(project.tracks_json);
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                  >
                  {/** přístupový režim projektu */}
                  {project.access_mode && project.access_mode !== 'public' && (
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-yellow-200">
                      Zamčeno · {project.access_mode === 'request' ? 'Na žádost' : 'Soukromé'}
                    </div>
                  )}
                  <div
                    className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-6"
                    style={
                      project.cover_url
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.88)), url(${project.cover_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : {
                            background: 'linear-gradient(135deg, #000409 0%, #0a704e 55%, #fb8b00 100%)',
                          }
                    }
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="grid h-40 w-40 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 text-[11px] uppercase tracking-[0.1em] text-white">
                        {project.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
                        ) : (
                          <span>{project.title.slice(0, 2)}</span>
                        )}
                      </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-white">{project.title}</p>
                    <p className="text-[12px] text-[var(--mpc-muted)]">
                      {project.description || t('publicProfile.projects.defaultDescription', 'Projekt')}
                    </p>
                  </div>
                </div>

                {project.access_mode === 'request' && (
                  <div className="mt-4 flex justify-center">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center rounded-full border border-[var(--mpc-accent)] bg-black/40 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)] shadow-[0_10px_25px_rgba(243,116,51,0.35)] transition hover:bg-[var(--mpc-accent)] hover:text-black"
                    >
                      Požádat o přístup
                    </Link>
                  </div>
                )}

                {(() => {
                  const playableIdx = tracks.findIndex((t) => t.url);
                  const primary =
                    playableIdx >= 0
                      ? {
                          ...tracks[playableIdx],
                          id: `project-${project.id}-${playableIdx}`,
                          meta: { projectId: project.id, trackIndex: playableIdx },
                        }
                      : project.project_url
                        ? {
                            id: `project-${project.id}`,
                            name: project.title,
                            url: project.project_url,
                            meta: { projectId: project.id, trackIndex: -1 },
                          }
                        : null;
                  if (!primary) return null;
                  const isCurrent = currentTrack?.id === primary.id;
                  const primaryMeta = primary.meta ?? { projectId: project.id, trackIndex: playableIdx >= 0 ? playableIdx : -1 };
                  const progressPct = isCurrent && duration ? Math.min((currentTime / duration) * 100, 100) : 0;
                  return (
                    <div className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 p-3">
                      <div className="mx-auto flex max-w-3xl items-center gap-3">
                        <button
                          onClick={() =>
                            handlePlayTrack({
                              id: primary.id,
                              title: primary.name || project.title,
                              url: primary.url || '',
                              source: 'project',
                              cover_url: project.cover_url,
                              subtitle: profile?.display_name || null,
                              meta: primaryMeta,
                            })
                          }
                          className="grid h-12 w-12 place-items-center rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-lg text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)]"
                        >
                          {isCurrent && isPlaying ? '▮▮' : '►'}
                        </button>
                        <div className="flex-1">
                          <p className="text-center text-sm font-semibold text-white">
                            {primary.name || project.title}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="h-3 overflow-hidden rounded-full bg-black/70">
                              <div
                                className="h-full rounded-full bg-[var(--mpc-accent,#00e096)] transition-all duration-150"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                              <span>{isCurrent ? formatTime(currentTime) : '0 s'}</span>
                              <span>{isCurrent ? formatTime(duration) : '-- s'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">Tracklist</span>
                    <button
                      onClick={() =>
                        setExpandedProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                      }
                      className={`grid h-10 w-10 place-items-center rounded-full border text-white transition ${
                        expandedProjects[project.id]
                          ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                          : 'border-white/20 bg-white/5'
                      }`}
                      aria-label="Tracklist"
                    >
                      <span
                        className="text-base font-bold transition-transform"
                        style={{ transform: expandedProjects[project.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      >
                        ▼
                      </span>
                    </button>
                  </div>

                {expandedProjects[project.id] && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-[var(--mpc-light)]">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Tracklist</p>
                    {project.access_mode && project.access_mode !== 'public' ? (
                      <div className="space-y-2 rounded border border-[var(--mpc-dark)] bg-black/50 p-3 text-[13px] text-[var(--mpc-light)]">
                        <p>Projekt je uzamčený.</p>
                        <p className="text-[12px] text-[var(--mpc-muted)]">
                          {project.access_mode === 'request'
                            ? 'Požádej o přístup z detailu projektu.'
                            : 'Přístup mají jen schválení uživatelé.'}
                        </p>
                        {!isLoggedIn && (
                          <Link href="/auth/login" className="text-[var(--mpc-accent)] underline">
                            Přihlas se a zažádej o přístup.
                          </Link>
                        )}
                      </div>
                    ) : tracks.length > 0 ? (
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {tracks.map((t, idx) => {
                          const trackId = `project-${project.id}-${idx}`;
                          const isCurrent = currentTrack?.id === trackId;
                          const progressPct = isCurrent && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%';
                          return (
                            <div
                              key={trackId}
                              className="rounded border border-white/10 bg-black/40 px-3 py-2 transition hover:border-[var(--mpc-accent)]/60"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-5 text-[11px] text-[var(--mpc-muted)]">{idx + 1}.</span>
                                  <span>{t.name || `Track ${idx + 1}`}</span>
                                </div>
                                <button
                                  onClick={() =>
                                    handlePlayTrack({
                                      id: trackId,
                                      title: t.name || `Track ${idx + 1}`,
                                      url: t.url || '',
                                      source: 'project',
                                      cover_url: project.cover_url,
                                      subtitle: profile?.display_name || null,
                                      meta: { projectId: project.id, trackIndex: idx },
                                    })
                                  }
                                  disabled={!t.url}
                                  className="rounded-full border border-[var(--mpc-accent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-40"
                                >
                                  {isCurrent && isPlaying ? '▮▮' : '►'}
                                </button>
                              </div>
                              <div
                                className="mt-2 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                                onClick={(e) => {
                                  if (!isCurrent) return;
                                  handleTrackProgressClick(trackId, e);
                                }}
                              >
                                <div
                                  className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                                  style={{ width: progressPct }}
                                />
                              </div>
                              {isCurrent && (
                                <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                                  <span>{formatTime(currentTime)}</span>
                                  <span>{formatTime(duration)}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : project.project_url ? (
                      <div className="flex items-center justify-between rounded border border-white/5 bg-black/30 px-3 py-2">
                        <span>{project.title || 'Ukázka projektu'}</span>
                        <button
                          onClick={() =>
                            handlePlayTrack({
                              id: `project-${project.id}`,
                              title: project.title,
                              url: project.project_url || '',
                              source: 'project',
                              cover_url: project.cover_url,
                              subtitle: profile?.display_name || null,
                              meta: { projectId: project.id, trackIndex: -1 },
                            })
                          }
                          className="text-[11px] text-[var(--mpc-accent)] hover:text-white"
                        >
                          {currentTrack?.id === `project-${project.id}` && isPlaying ? '▮▮' : '►'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--mpc-muted)]">Tracklist není k dispozici.</p>
                    )}
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

    </div>

    {/* Spolupráce */}
    <div id="collabs-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.collabs.title', 'Spolupráce')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{collabs.length} {t('profile.collabs.count', 'spoluprací')}</p>
            </div>
            {isLoggedIn && currentUserId && currentUserId !== profileId && (
              <button
                onClick={() => {
                  setShowCollabForm((prev) => !prev);
                  setCollabRequestError(null);
                  setCollabRequestState('idle');
                }}
                className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
              >
                {showCollabForm ? 'Zrušit' : 'Požádat o spolupráci'}
              </button>
            )}
          </div>
          {showCollabForm && isLoggedIn && currentUserId && currentUserId !== profileId && (
            <div className="mb-4 rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-[var(--mpc-light)]">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)] mb-2">Chceš rozjet spolupráci?</p>
              <input
                value={collabSubject}
                onChange={(e) => setCollabSubject(e.target.value)}
                placeholder="Název spolupráce"
                className="mb-2 w-full rounded border border-[var(--mpc-dark)] bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
              />
              <textarea
                value={collabMessage}
                onChange={(e) => setCollabMessage(e.target.value)}
                placeholder="Napiš, co chceš vytvořit…"
                rows={3}
                className="mb-2 w-full rounded border border-[var(--mpc-dark)] bg-black/70 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
              />
              <div className="mb-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">Přiložit soubor (volitelné)</label>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)]">
                    Vybrat soubor
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setCollabFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {collabFile && (
                    <span className="text-[11px] text-[var(--mpc-muted)]">{collabFile.name}</span>
                  )}
                </div>
                {collabFileError && <p className="mt-1 text-[11px] text-red-300">{collabFileError}</p>}
              </div>
              {collabRequestError && <p className="mb-1 text-[11px] text-red-300">{collabRequestError}</p>}
              {collabRequestState === 'success' && (
                <p className="mb-1 text-[11px] text-green-300">Žádost byla odeslána.</p>
              )}
              <button
                type="button"
                disabled={collabRequestState === 'sending'}
                onClick={() => void handleRequestCollab()}
                className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_8px_20px_rgba(255,75,129,0.35)] disabled:opacity-50"
              >
                {collabRequestState === 'sending' ? 'Odesílám…' : 'Odeslat žádost'}
              </button>
            </div>
          )}
          {collabsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {collabsError}
            </div>
          )}
          {collabs.length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné spolupráce k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {collabs.map((col) => (
                <div
                  key={col.id}
                  className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3 text-sm text-[var(--mpc-light)] transition hover:border-[var(--mpc-accent)]"
                  style={
                    col.cover_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url(${col.cover_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--mpc-light)]">{col.title}</p>
                      <p className="text-[12px] text-[var(--mpc-muted)]">
                        {col.bpm ? `${col.bpm} BPM` : '—'} · {col.mood || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
                      {col.partners.map((p, idx) => (
                        <span
                          key={p + idx}
                          className="rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-2 py-[2px]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <button
                        onClick={() =>
                          handlePlayTrack({
                            id: `collab-${col.id}`,
                            title: col.title,
                            url: col.audio_url || '',
                            source: 'collab',
                            cover_url: col.cover_url,
                            subtitle: col.partners.join(' • ') || profile?.display_name || null,
                          })
                        }
                        disabled={!col.audio_url}
                        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        {currentTrack?.id === `collab-${col.id}` && isPlaying ? '▮▮ Pauza' : '► Přehrát'}
                      </button>
                    </div>
                    {col.audio_url && (
                      <div
                        className="mt-3 h-[70px] cursor-pointer overflow-hidden rounded-md border border-[var(--mpc-dark)] bg-[var(--mpc-deck)]"
                        onClick={(e) => handleTrackProgressClick(`collab-${col.id}`, e)}
                      >
                      <div
                        className="h-full"
                        style={{
                          width:
                            currentTrack?.id === `collab-${col.id}` && duration
                              ? `${Math.min((currentTime / duration) * 100, 100)}%`
                              : '0%',
                          background:
                            'repeating-linear-gradient(to right, rgba(0,86,63,0.95) 0, rgba(0,86,63,0.95) 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)',
                          boxShadow: currentTrack?.id === `collab-${col.id}` ? '0 4px 12px rgba(0,224,150,0.35)' : 'none',
                          transition: 'width 0.1s linear',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {/* Poslat zprávu */}
        <div id="message-form" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.message.title', 'Poslat zprávu')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{t('publicProfile.message.subtitle', 'Přímo autorovi profilu')}</p>
            </div>
            {!isLoggedIn && (
              <Link href="/auth/login" className="text-[11px] uppercase tracking-[0.15em] text-[var(--mpc-accent)]">
                {t('nav.login', 'Přihlásit se')}
              </Link>
            )}
          </div>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {t('publicProfile.message.label', 'Zpráva')}
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                rows={3}
                placeholder="Napiš detail spolupráce, tempo, mood, deadline…"
              />
            </div>
            {messageSuccess && (
              <p className="text-sm text-green-300">{messageSuccess}</p>
            )}
            {messageError && <p className="text-sm text-red-300">{messageError}</p>}
            <button
              type="submit"
              disabled={sendingMessage}
              className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60"
              >
                {sendingMessage ? t('publicProfile.message.sending', 'Odesílám…') : t('publicProfile.message.send', 'Odeslat zprávu')}
              </button>
            </form>
            {!isLoggedIn && (
              <p className="mt-2 text-[11px] text-[var(--mpc-muted)]">{t('publicProfile.message.loginNote', 'Pro odeslání zprávy se přihlas.')}</p>
            )}
        </div>
      </section>

      {currentTrack && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-[#04080f]/85 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/60">
                {currentCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentCover} alt={currentTrack.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[11px] uppercase tracking-[0.1em] text-white">
                    {heroName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Právě hraje</p>
                <p className="text-sm font-semibold text-white">{currentTrack.title}</p>
                {currentSubtitle ? (
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    {profileId ? (
                      <Link href={`/u/${profileId}`} className="hover:text-[var(--mpc-accent)]">
                        {currentSubtitle}
                      </Link>
                    ) : (
                      currentSubtitle
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex-1">
              <div
                className="h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                onClick={handleGlobalProgressClick}
              >
                <div
                  className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <button
              onClick={toggle}
              className="grid h-12 w-12 place-items-center rounded-full bg-[var(--mpc-accent)] text-lg text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)]"
            >
              {isPlaying ? '▮▮' : '►'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
