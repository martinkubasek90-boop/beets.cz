'use client';

import {
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
  useRef,
  useMemo,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';
import BeatUploadForm from './beat-upload-form';
import ProjectUploadForm from './project-upload-form';

type Profile = {
  display_name: string;
  hardware: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
};

type BeatItem = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
};

type ProjectItem = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  project_url: string | null;
  access_mode?: 'public' | 'request' | 'private';
  tracks_json?: Array<{ name: string; url: string }>;
};

type CollabThread = {
  id: string;
  title: string;
  status: string;
  updated_at: string | null;
  participants: string[];
};

type CollabMessage = {
  id: string;
  body: string;
  user_id: string;
  created_at: string | null;
  author_name?: string | null;
};

type CollabFile = {
  id: string;
  file_name: string | null;
  file_url: string;
  user_id: string;
  created_at: string | null;
};

type ProjectAccessRequest = {
  id: string;
  project_id: number;
  status: string;
  message?: string | null;
  requester_id: string;
  requester_name?: string | null;
  project_title?: string | null;
  created_at?: string | null;
};

type ProjectAccessGrant = {
  id: string;
  project_id: string;
  user_id: string;
  display_name?: string | null;
  created_at?: string | null;
};

type BlogPost = {
  id: number;
  title: string;
  title_en?: string | null;
  excerpt: string;
  excerpt_en?: string | null;
  body: string | null;
  body_en?: string | null;
  author: string;
  date: string;
  cover_url: string | null;
  embed_url: string | null;
  published?: boolean | null;
};

type UserSuggestion = {
  id: string;
  display_name: string | null;
};

type ForumCategorySummary = {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
};

type ForumThreadSummary = {
  id: string;
  title: string;
  category_id: string;
  updated_at?: string | null;
};

type DirectMessage = {
  id: number | string;
  user_id: string;
  to_user_id: string;
  from_name?: string | null;
  to_name?: string | null;
  body: string;
  created_at?: string | null;
  unread?: boolean;
};

const demoCollabMessages: DirectMessage[] = [
  {
    id: 1,
    user_id: 'demo-1',
    to_user_id: 'demo-me',
    from_name: 'MC Panel',
    to_name: 'Ty',
    body: 'Hej, posílám ti vokály k „Betonovej sen“, můžeš mrknout?',
    created_at: '2024-12-16T10:32:00Z',
    unread: true,
  },
  {
    id: 2,
    user_id: 'demo-2',
    to_user_id: 'demo-me',
    from_name: 'Třetí Vchod',
    to_name: 'Ty',
    body: 'Díky za beat, máš i verzi bez basy na živák?',
    created_at: '2024-12-16T09:15:00Z',
  },
  {
    id: 3,
    user_id: 'demo-3',
    to_user_id: 'demo-me',
    from_name: 'GreyTone',
    to_name: 'Ty',
    body: 'Můžem hodit rychlej call ohledně mixu akapely?',
    created_at: '2024-12-15T12:00:00Z',
  },
  {
    id: 4,
    user_id: 'demo-4',
    to_user_id: 'demo-me',
    from_name: 'Northside',
    to_name: 'Ty',
    body: 'Máme připravený hook na tvůj beat, chceš poslat raw?',
    created_at: '2024-12-14T12:00:00Z',
  },
  {
    id: 5,
    user_id: 'demo-5',
    to_user_id: 'demo-me',
    from_name: 'DJ Lávka',
    to_name: 'Ty',
    body: 'Hledám scratch části na live set, pošleš stems?',
    created_at: '2024-12-13T12:00:00Z',
  },
];

type NewMessageForm = {
  to: string;
  toUserId: string;
  body: string;
};

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'neznámý čas';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'právě teď';
  if (minutes === 1) return 'před minutou';
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'před hodinou';
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'včera';
  if (days < 7) return `před ${days} dny`;
  return date.toLocaleDateString('cs-CZ');
}

function buildCollabLabel(names?: string[]) {
  const filtered = (names ?? []).filter(Boolean);
  const uniqueNames = Array.from(new Set(filtered));
  if (uniqueNames.length === 0) return 'Spolupráce';
  if (uniqueNames.length === 1) return `Spolupráce ${uniqueNames[0]}`;
  if (uniqueNames.length === 2) return `Spolupráce ${uniqueNames[0]} a ${uniqueNames[1]}`;
  const last = uniqueNames.pop();
  return `Spolupráce ${uniqueNames.join(', ')} a ${last}`;
}

export default function ProfileClient() {
  const supabase = createClient();
  const router = useRouter();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    hardware: '',
    bio: '',
    avatar_url: null,
    banner_url: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [beats, setBeats] = useState<BeatItem[]>([]);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectGrants, setProjectGrants] = useState<Record<string, ProjectAccessGrant[]>>({});
  const [projectGrantsError, setProjectGrantsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>(demoCollabMessages);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(true);
  const [newMessage, setNewMessage] = useState<NewMessageForm>({ to: '', toUserId: '', body: '' });
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [userSuggestionsLoading, setUserSuggestionsLoading] = useState<boolean>(false);
  const [collabThreads, setCollabThreads] = useState<CollabThread[]>([]);
  const [collabThreadsError, setCollabThreadsError] = useState<string | null>(null);
  const [collabThreadsLoading, setCollabThreadsLoading] = useState<boolean>(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [collabMessages, setCollabMessages] = useState<CollabMessage[]>([]);
  const [collabFiles, setCollabFiles] = useState<CollabFile[]>([]);
  const [collabMessagesLoading, setCollabMessagesLoading] = useState<boolean>(false);
  const [collabFilesLoading, setCollabFilesLoading] = useState<boolean>(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadPartner, setNewThreadPartner] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);
  const [collabMessageBody, setCollabMessageBody] = useState('');
  const [sendingCollabMessage, setSendingCollabMessage] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [uploadingCollabFile, setUploadingCollabFile] = useState(false);
  const [threadReplies, setThreadReplies] = useState<Record<string, string>>({});
  const [collabFile, setCollabFile] = useState<File | null>(null);
  const [showNewThreadForm, setShowNewThreadForm] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    titleEn: '',
    excerpt: '',
    excerptEn: '',
    body: '',
    bodyEn: '',
    author: '',
    date: '',
    coverUrl: '',
    embedUrl: '',
  });
  const [blogCoverFile, setBlogCoverFile] = useState<File | null>(null);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [blogSuccess, setBlogSuccess] = useState<string | null>(null);
  const [blogFormOpen, setBlogFormOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [myPosts, setMyPosts] = useState<BlogPost[]>([]);
  const [myPostsError, setMyPostsError] = useState<string | null>(null);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myForumCategories, setMyForumCategories] = useState<ForumCategorySummary[]>([]);
  const [myForumThreads, setMyForumThreads] = useState<ForumThreadSummary[]>([]);
  const [myForumError, setMyForumError] = useState<string | null>(null);
  const [myForumLoading, setMyForumLoading] = useState(false);
  const [projectRequests, setProjectRequests] = useState<ProjectAccessRequest[]>([]);
  const [projectRequestsLoading, setProjectRequestsLoading] = useState(false);
  const [projectRequestsError, setProjectRequestsError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    profile: false,
    beatUpload: false,
    projectUpload: false,
  });
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectEditTitle, setProjectEditTitle] = useState('');
  const [projectEditDescription, setProjectEditDescription] = useState('');
  const [projectEditTracks, setProjectEditTracks] = useState<Array<{ name: string; url?: string; file?: File | null }>>([]);
  const [projectEditCover, setProjectEditCover] = useState<{ url?: string; file?: File | null }>({});
  const [projectSaving, setProjectSaving] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deleteProjectError, setDeleteProjectError] = useState<Record<string, string>>({});
  const [currentBeat, setCurrentBeat] = useState<BeatItem | null>(null);
  const [isPlayingBeat, setIsPlayingBeat] = useState(false);
  const [playerMessage, setPlayerMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [beatTime, setBeatTime] = useState(0);
  const [beatDuration, setBeatDuration] = useState(0);
  const [openBeatMenuId, setOpenBeatMenuId] = useState<number | null>(null);
  const [editingBeatId, setEditingBeatId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBpm, setEditBpm] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [openAcapellaMenuId, setOpenAcapellaMenuId] = useState<number | null>(null);
  const [editingAcapellaId, setEditingAcapellaId] = useState<number | null>(null);
  const [editAcapellaTitle, setEditAcapellaTitle] = useState('');
  const [editAcapellaBpm, setEditAcapellaBpm] = useState('');
  const [editAcapellaMood, setEditAcapellaMood] = useState('');
  const [editAcapellaCoverUrl, setEditAcapellaCoverUrl] = useState('');
  const [editAcapellaCoverFile, setEditAcapellaCoverFile] = useState<File | null>(null);
  const [editAcapellaAccess, setEditAcapellaAccess] = useState<'public' | 'request'>('public');

  // Načtení přihlášeného uživatele a profilu
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          router.push('/auth/login');
          return;
        }

        setEmail(user.email ?? null);
        setUserId(user.id);
        setIsLoggedIn(true);

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, hardware, bio, avatar_url, banner_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (data) {
          setProfile({
            display_name: data.display_name ?? '',
            hardware: data.hardware ?? '',
            bio: data.bio ?? '',
            avatar_url: data.avatar_url ?? null,
            banner_url: (data as any).banner_url ?? null,
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as any).message)
              : 'Neznámá chyba';
        console.error('Chyba při načítání profilu:', message, err);
        setError('Nepodařilo se načíst profil. ' + message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  function handleFieldChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // Načtení uživatelských beatů a projektů
  useEffect(() => {
    if (!userId) return;

    const loadBeatsProjectsCollabs = async () => {
      // načti beaty
      const { data: beatData, error: beatErr } = await supabase
        .from('beats')
        .select('id, title, bpm, mood, audio_url, cover_url')
        .eq('user_id', userId)
        .order('id', { ascending: false })
        .limit(10);

      if (beatErr) {
        console.error('Chyba při načítání beatů:', beatErr);
        setBeatsError('Nepodařilo se načíst tvoje beaty.');
      } else {
        setBeats((beatData as BeatItem[]) ?? []);
        setBeatsError(null);
      }

      // projekty
      try {
        let projectData: any[] | null = null;
        // primární pokus – zahrnuje project_url/tracks_json, pokud existují
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, project_url, tracks_json, access_mode')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) throw error;
          projectData = data || [];
        } catch (innerErr) {
          console.warn('Fallback select projects bez project_url/tracks_json:', innerErr);
          const { data, error } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, access_mode')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (error) throw error;
          projectData = data || [];
        }
        setProjects(projectData as ProjectItem[]);
        setProjectsError(null);
        // Grants pro moje projekty
        const ownedIds = (projectData || [])
          .map((p) => p.id)
          .filter(Boolean);
        if (ownedIds.length > 0) {
          const { data: grants, error: grantErr } = await supabase
            .from('project_access_grants')
            .select('id, project_id, user_id, created_at, profiles:profiles(display_name)')
            .in('project_id', ownedIds);
          if (grantErr) {
            console.warn('Chyba načítání grantů (ignorováno):', grantErr);
            setProjectGrants({});
          } else {
            const map: Record<string, ProjectAccessGrant[]> = {};
            (grants as any[]).forEach((g) => {
              const pid = String(g.project_id);
              if (!map[pid]) map[pid] = [];
              map[pid].push({
                id: g.id,
                project_id: String(g.project_id),
                user_id: g.user_id,
                display_name: g.profiles?.display_name || null,
                created_at: g.created_at,
              });
            });
            setProjectGrants(map);
          }
        } else {
          setProjectGrants({});
        }
      } catch (projectErr) {
        console.error('Chyba při načítání projektů:', projectErr);
        setProjectsError('Nepodařilo se načíst tvoje projekty.');
      }

    };

    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessagesError(null);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, user_id, to_user_id, from_name, to_name, body, created_at, unread')
          .or(`to_user_id.eq.${userId},user_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: DirectMessage[] = data.map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            to_user_id: item.to_user_id,
            from_name: item.from_name,
            to_name: item.to_name,
            body: item.body || '',
            created_at: item.created_at,
            unread: Boolean(item.unread),
          }));
          setMessages(mapped);
          setMessagesError(null);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Chyba při načítání zpráv:', err);
        setMessagesError('Nepodařilo se načíst zprávy.');
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    const loadMyPosts = async () => {
      if (!userId) return;
      setMyPostsLoading(true);
      setMyPostsError(null);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url, published')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMyPosts((data as BlogPost[]) ?? []);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
        console.error('Chyba při načítání článků:', msg, err);
        setMyPostsError('Nepodařilo se načíst tvoje články.');
        setMyPosts([]);
      } finally {
        setMyPostsLoading(false);
      }
    };

    const loadMyForum = async () => {
      if (!userId) return;
      setMyForumLoading(true);
      setMyForumError(null);
      try {
        const { data: catData, error: catErr } = await supabase
          .from('forum_categories')
          .select('id, name, description, parent_id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (catErr) throw catErr;
        setMyForumCategories((catData as ForumCategorySummary[]) ?? []);

        const { data: threadData, error: threadErr } = await supabase
          .from('forum_threads')
          .select('id, title, category_id, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (threadErr) throw threadErr;
        setMyForumThreads((threadData as ForumThreadSummary[]) ?? []);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : typeof err === 'object' ? JSON.stringify(err) : String(err);
        console.error('Chyba při načítání fóra:', msg, err);
        setMyForumError('Nepodařilo se načíst tvoje kategorie/vlákna.');
        setMyForumCategories([]);
        setMyForumThreads([]);
      } finally {
        setMyForumLoading(false);
      }
    };

    const loadProjectRequests = async () => {
      if (!userId) return;
      setProjectRequestsLoading(true);
      setProjectRequestsError(null);
      try {
        const { data, error } = await supabase
          .from('project_access_requests')
          .select('id, project_id, status, message, requester_id, created_at, projects!inner(id, title, user_id)')
          .eq('projects.user_id', userId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        if (error) throw error;

        const reqs = (data as any[]) ?? [];
        const requesterIds = Array.from(new Set(reqs.map((r) => r.requester_id).filter(Boolean) as string[]));
        let nameMap: Record<string, string> = {};
        if (requesterIds.length) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', requesterIds);
          if (profErr) throw profErr;
          if (profiles) {
            nameMap = Object.fromEntries((profiles as any[]).map((p) => [p.id, p.display_name || '']));
          }
        }

        const mapped: ProjectAccessRequest[] =
          reqs.map((row) => ({
            id: row.id,
            project_id: row.project_id,
            status: row.status,
            message: row.message,
            requester_id: row.requester_id,
            requester_name: nameMap[row.requester_id] || null,
            project_title: row.projects?.title || null,
            created_at: row.created_at,
          })) ?? [];
        setProjectRequests(mapped);
      } catch (err) {
        console.error('Chyba načítání žádostí o přístup k projektům:', err);
        setProjectRequests([]);
        setProjectRequestsError('Nepodařilo se načíst žádosti o přístup.');
      } finally {
        setProjectRequestsLoading(false);
      }
    };

    loadBeatsProjectsCollabs();
    loadMessages();
    loadMyPosts();
    loadMyForum();
    loadProjectRequests();

    const loadCollabThreads = async () => {
      setCollabThreadsLoading(true);
      setCollabThreadsError(null);
      try {
        const { data, error } = await supabase
          .from('collab_threads')
          .select('id, title, status, updated_at, collab_participants!inner(user_id, profiles(display_name))')
          .eq('collab_participants.user_id', userId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        const mapped: CollabThread[] =
          data?.map((t: any) => ({
            id: t.id as string,
            title: t.title as string,
            status: t.status as string,
            updated_at: t.updated_at as string | null,
            participants: Array.isArray(t.collab_participants)
              ? Array.from(
                  new Set(
                    t.collab_participants
                      .map((p: any) => p.profiles?.display_name || p.user_id)
                      .filter(Boolean)
                  )
                )
              : [],
          })) ?? [];
        setCollabThreads(mapped);
      } catch (err) {
        console.error('Chyba načítání spoluprací:', err);
        setCollabThreadsError('Nepodařilo se načíst spolupráce.');
        setCollabThreads([]);
      } finally {
        setCollabThreadsLoading(false);
      }
    };
    loadCollabThreads();
  }, [supabase, userId]);

  useEffect(() => {
    if (!selectedThreadId && collabThreads.length > 0) {
      setSelectedThreadId(collabThreads[0].id);
    }
  }, [collabThreads, selectedThreadId]);

  // Vyhledávání uživatelů (UUID picker) po 3 znacích
  useEffect(() => {
    if (!newMessage.to || newMessage.to.length < 3) {
      setUserSuggestions([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setUserSuggestionsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .ilike('display_name', `%${newMessage.to}%`)
          .limit(5);
        if (error) throw error;
        if (!cancelled) {
          setUserSuggestions((data as UserSuggestion[]) ?? []);
        }
      } catch (err) {
        console.error('Chyba při vyhledávání uživatele:', err);
        if (!cancelled) setUserSuggestions([]);
      } finally {
        if (!cancelled) setUserSuggestionsLoading(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [newMessage.to, supabase]);

  // Vlákna přímých zpráv seskupená podle protistrany
  const directThreads = useMemo(() => {
    const map = new Map<string, { otherId: string; otherName: string; lastMessage: string; lastTs: number; unread: boolean; messages: DirectMessage[] }>();
    messages.forEach((m) => {
      const isFromMe = m.user_id === userId;
      const otherId = isFromMe ? m.to_user_id : m.user_id;
      if (!otherId) return;
      const otherName = isFromMe ? m.to_name || 'Neznámý' : m.from_name || 'Neznámý';
      const ts = m.created_at ? new Date(m.created_at).getTime() : 0;
      const existing = map.get(otherId) || { otherId, otherName, lastMessage: m.body || '', lastTs: ts, unread: false, messages: [] };
      existing.messages.push(m);
      if (ts > existing.lastTs) {
        existing.lastTs = ts;
        existing.lastMessage = m.body || '';
        existing.otherName = otherName;
      }
      if (m.to_user_id === userId && m.unread) existing.unread = true;
      map.set(otherId, existing);
    });
    const threads = Array.from(map.values());
    threads.forEach((t) => {
      t.messages.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
    });
    return threads.sort((a, b) => b.lastTs - a.lastTs);
  }, [messages, userId]);

  const unreadThreadCount = useMemo(
    () => directThreads.filter((thread) => thread.unread).length,
    [directThreads]
  );

  // Upload profilové fotky
  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error('Uživatel není přihlášen.');
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['jpg', 'jpeg', 'png'].includes(ext)) {
        throw new Error('Profilová fotka musí být JPG nebo PNG.');
      }

      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('Avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('Avatars')
        .getPublicUrl(path);

      setProfile((prev) => ({
        ...prev,
        avatar_url: publicData.publicUrl,
      }));

      setSuccess('Profilová fotka byla nahrána. Nezapomeň uložit profil.');
    } catch (err: any) {
      console.error('Chyba při nahrávání fotky:', err);
      setError(err?.message || 'Nepodařilo se nahrát profilovou fotku.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Upload banner
  async function handleBannerChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error('Uživatel není přihlášen.');
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        throw new Error('Banner musí být JPG, PNG nebo WEBP.');
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${user.id}/banner-${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_banners')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('profile_banners')
        .getPublicUrl(path);

      setProfile((prev) => ({
        ...prev,
        banner_url: publicData.publicUrl,
      }));

      setSuccess('Banner byl nahrán. Nezapomeň uložit profil.');
    } catch (err: any) {
      console.error('Chyba při nahrávání banneru:', err);
      setError(err?.message || 'Nepodařilo se nahrát banner.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Uložení profilu do tabulky profiles
  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error('Uživatel není přihlášen.');
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            display_name: profile.display_name.trim() || null,
            hardware: profile.hardware.trim() || null,
            bio: profile.bio.trim() || null,
            avatar_url: profile.avatar_url,
            banner_url: profile.banner_url,
          },
          { onConflict: 'id' }
        );

      if (upsertError) throw upsertError;

      setSuccess('Profil byl uložen.');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as any).message)
            : 'Neznámá chyba';
      console.error('Chyba při ukládání profilu:', message, err);
      setError('Nepodařilo se uložit profil. ' + message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(key: 'profile' | 'beatUpload' | 'projectUpload') {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handlePlayBeat(beat: BeatItem) {
    if (!beat.audio_url) {
      setPlayerMessage('Tento beat nemá nahraný audio soubor.');
      return;
    }
    setPlayerMessage(null);

    // pokud kliknu na stejný beat, toggle play/pause
    if (currentBeat?.id === beat.id) {
      setIsPlayingBeat((prev) => !prev);
    } else {
      setCurrentBeat(beat);
      setBeatTime(0);
      setBeatDuration(0);
      setIsPlayingBeat(true);
    }
  }

  async function handleDeleteBeat(id: number) {
    if (!confirm('Opravdu smazat tento beat?')) return;
    try {
      const { error } = await supabase.from('beats').delete().eq('id', id);
      if (error) throw error;
      setBeats((prev) => prev.filter((b) => b.id !== id));
      setOpenBeatMenuId(null);
      if (editingBeatId === id) {
        setEditingBeatId(null);
      }
    } catch (err) {
      console.error('Chyba při mazání beatu:', err);
      setPlayerMessage('Nepodařilo se smazat beat.');
    }
  }

  function seekBeat(beat: BeatItem, clientX: number, width: number) {
    if (!currentBeat || currentBeat.id !== beat.id || !beatDuration) return;
    const ratio = Math.min(Math.max(clientX / width, 0), 1);
    const el = audioRef.current;
    if (!el) return;
    const next = ratio * beatDuration;
    el.currentTime = next;
    setBeatTime(next);
    setIsPlayingBeat(true);
    void el.play();
  }

  function startEditBeat(beat: BeatItem) {
    setEditingBeatId(beat.id);
    setEditTitle(beat.title || '');
    setEditBpm(beat.bpm ? String(beat.bpm) : '');
    setEditMood(beat.mood || '');
    setEditCoverUrl(beat.cover_url || '');
    setOpenBeatMenuId(null);
  }

  async function handleSaveBeat() {
    if (!editingBeatId) return;
    try {
      let coverUrl = editCoverUrl.trim() || null;
      // Pokud je nahrán nový soubor, nahraj ho do bucketu beats
      if (editCoverFile) {
        const safe = editCoverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${userId}/beats/covers/${Date.now()}-${safe}`;
        const { error: uploadErr } = await supabase.storage.from('beats').upload(path, editCoverFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from('beats').getPublicUrl(path);
        coverUrl = pub.publicUrl;
      }

      const payload: Partial<BeatItem> = {
        title: editTitle.trim() || 'Untitled',
        bpm: editBpm ? Number(editBpm) : null,
        mood: editMood.trim() || null,
        cover_url: coverUrl,
      };
      const { error } = await supabase.from('beats').update(payload).eq('id', editingBeatId);
      if (error) throw error;
      setBeats((prev) =>
        prev.map((b) =>
          b.id === editingBeatId
            ? { ...b, ...payload }
            : b
        )
      );
      setEditingBeatId(null);
      setEditCoverFile(null);
    } catch (err) {
      console.error('Chyba při ukládání beatu:', err);
      setPlayerMessage('Nepodařilo se uložit beat.');
    }
  }

  const handleProjectRequestDecision = async (req: ProjectAccessRequest, approve: boolean) => {
    if (!userId) return;
    try {
      if (approve) {
        const { error: grantErr } = await supabase.from('project_access_grants').insert({
          project_id: req.project_id,
          user_id: req.requester_id,
          granted_by: userId,
        });
        if (grantErr) throw grantErr;
        const { error: updErr } = await supabase
          .from('project_access_requests')
          .update({ status: 'approved', decided_by: userId })
          .eq('id', req.id);
        if (updErr) throw updErr;
      } else {
        const { error: updErr } = await supabase
          .from('project_access_requests')
          .update({ status: 'denied', decided_by: userId })
          .eq('id', req.id);
        if (updErr) throw updErr;
      }
      setProjectRequests((prev) => prev.filter((r) => r.id !== req.id));
      setProjectRequestsError(null);
    } catch (err) {
      console.error('Chyba při schválení/odmítnutí žádosti:', err);
      setProjectRequestsError('Nepodařilo se aktualizovat žádost.');
    }
  };

  const handleUpdateProjectAccess = async (projectId: string, mode: 'public' | 'request' | 'private') => {
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ access_mode: mode })
        .eq('id', projectId)
        .eq('user_id', userId);
      if (error) throw error;
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, access_mode: mode } : p))
      );
      setProjectsError(null);
    } catch (err) {
      console.error('Chyba při změně přístupu projektu:', err);
      setProjectsError('Nepodařilo se uložit změnu přístupu.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!userId || !confirm('Opravdu chcete tento projekt smazat?')) return;
    setDeletingProjectId(projectId);
    setDeleteProjectError((prev) => ({ ...prev, [projectId]: '' }));
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId).eq('user_id', userId);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteProjectError((prev) => {
        const next = { ...prev };
        delete next[projectId];
        return next;
      });
    } catch (err) {
      console.error('Chyba při mazání projektu:', err);
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Projekt se nepodařilo smazat.';
      setDeleteProjectError((prev) => ({ ...prev, [projectId]: message }));
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleRevokeGrant = async (projectId: string, grantId: string) => {
    try {
      const { error } = await supabase.from('project_access_grants').delete().eq('id', grantId);
      if (error) throw error;
      setProjectGrants((prev) => {
        const next = { ...prev };
        next[projectId] = (next[projectId] || []).filter((g) => g.id !== grantId);
        return next;
      });
    } catch (err) {
      console.error('Chyba při odebírání přístupu:', err);
      setProjectGrantsError('Nepodařilo se odebrat přístup.');
    }
  };

  // Spolupráce – vytvoření vlákna
  const handleCreateCollabThread = async () => {
    if (!userId || !newThreadTitle.trim() || !newThreadPartner.trim()) return;
    setCreatingThread(true);
    setCollabThreadsError(null);
    try {
      const { data: partner, error: partnerErr } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', newThreadPartner.trim())
        .limit(1)
        .maybeSingle();
      if (partnerErr) throw partnerErr;
      if (!partner?.id) throw new Error('Partner nenalezen.');

      const { data: thread, error: threadErr } = await supabase
        .from('collab_threads')
        .insert({ title: newThreadTitle.trim(), created_by: userId })
        .select('id')
        .single();
      if (threadErr) throw threadErr;
      const threadId = thread?.id as string;

      const rows = [
        { thread_id: threadId, user_id: userId, role: 'owner' },
        { thread_id: threadId, user_id: partner.id, role: 'guest' },
      ];
      const { error: partErr } = await supabase.from('collab_participants').insert(rows);
      if (partErr) throw partErr;

      const ownerName = profile.display_name?.trim() || 'Ty';
      const partnerName = (partner.display_name?.trim() || newThreadPartner.trim()).trim();
      const participants = Array.from(new Set([ownerName, partnerName].filter(Boolean)));
      setCollabThreads((prev) => [
        {
          id: threadId,
          title: newThreadTitle.trim(),
          status: 'active',
          updated_at: new Date().toISOString(),
          participants,
        },
        ...prev,
      ]);
      setNewThreadTitle('');
      setNewThreadPartner('');
      setShowNewThreadForm(false);
      setSelectedThreadId(threadId);
      // Email notifikace pro partnera spolupráce
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'collab_request',
            targetUserId: partner.id,
            senderId: userId,
            threadId,
            data: {
              from: ownerName || 'MC',
              requesterName: ownerName || 'MC',
              threadTitle: newThreadTitle.trim(),
              body: `Pozvánka do spolupráce: ${newThreadTitle.trim()}`,
            },
          }),
        });
      } catch (notifyErr) {
        console.warn('Email notifikace pro novou spolupráci selhala:', notifyErr);
      }
    } catch (err) {
      console.error('Chyba při vytvoření spolupráce:', err);
      setCollabThreadsError(err instanceof Error ? err.message : 'Nepodařilo se založit spolupráci.');
    } finally {
      setCreatingThread(false);
    }
  };

  // Spolupráce – načtení detailu
  useEffect(() => {
    if (!selectedThreadId) {
      setCollabMessages([]);
      setCollabFiles([]);
      return;
    }
    const loadDetails = async () => {
      setCollabMessagesLoading(true);
      setCollabFilesLoading(true);
      try {
        const { data: msgs, error: msgErr } = await supabase
          .from('collab_messages')
          .select('id, body, user_id, created_at, profiles:profiles(display_name)')
          .eq('thread_id', selectedThreadId)
          .order('created_at', { ascending: true });
        if (msgErr) throw msgErr;
        setCollabMessages(
          ((msgs as any[]) ?? []).map((m) => ({
            id: m.id,
            body: m.body,
            user_id: m.user_id,
            created_at: m.created_at,
            author_name: m.profiles?.display_name || null,
          }))
        );
      } catch (err) {
        console.error('Chyba načítání zpráv:', err);
        setCollabMessages([]);
      } finally {
        setCollabMessagesLoading(false);
      }

      try {
        const { data: files, error: filesErr } = await supabase
          .from('collab_files')
          .select('id, file_name, file_url, user_id, created_at')
          .eq('thread_id', selectedThreadId)
          .order('created_at', { ascending: false });
        if (filesErr) throw filesErr;
        setCollabFiles((files as any[]) ?? []);
      } catch (err) {
        console.error('Chyba načítání souborů:', err);
        setCollabFiles([]);
      } finally {
        setCollabFilesLoading(false);
      }
    };
    loadDetails();
  }, [selectedThreadId, supabase]);

  const handleSendCollabMsg = async () => {
    if (!selectedThreadId || !collabMessageBody.trim() || !userId) return;
    setSendingCollabMessage(true);
    try {
      const { error } = await supabase.from('collab_messages').insert({
        thread_id: selectedThreadId,
        body: collabMessageBody.trim(),
        user_id: userId,
      });
      if (error) throw error;
      setCollabMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          body: collabMessageBody.trim(),
          user_id: userId,
          created_at: new Date().toISOString(),
          author_name: profile.display_name || 'Ty',
        },
      ]);
      setCollabThreads((prev) =>
        prev.map((t) => (t.id === selectedThreadId ? { ...t, updated_at: new Date().toISOString() } : t))
      );
      // Email notifikace pro ostatní účastníky vlákna
      try {
        const threadTitle = collabThreads.find((t) => t.id === selectedThreadId)?.title || 'Spolupráce';
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'collab_message',
            threadId: selectedThreadId,
            senderId: userId,
            fanOutCollab: true,
            data: {
              from: profile.display_name || email || 'Uživatel',
              threadTitle,
              body: collabMessageBody.trim(),
            },
          }),
        });
      } catch (notifyErr) {
        console.warn('Email notifikace pro spolupráci selhala:', notifyErr);
      }
      setCollabMessageBody('');
    } catch (err) {
      console.error('Chyba při odeslání zprávy:', err);
    } finally {
      setSendingCollabMessage(false);
    }
  };

  const handleUploadCollab = async () => {
    if (!selectedThreadId || !collabFile || !userId) return;
    setUploadingCollabFile(true);
    try {
      const safe = collabFile.name.replace(/[^a-zA-Z0-9.\\-_]/g, '_');
      const path = `${userId}/${selectedThreadId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from('collabs').upload(path, collabFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('collabs').getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from('collab_files')
        .insert({ thread_id: selectedThreadId, user_id: userId, file_url: pub.publicUrl, file_name: collabFile.name });
      if (dbErr) throw dbErr;
      setCollabFiles((prev) => [
        { id: crypto.randomUUID(), file_name: collabFile.name, file_url: pub.publicUrl, user_id: userId, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setCollabThreads((prev) =>
        prev.map((t) => (t.id === selectedThreadId ? { ...t, updated_at: new Date().toISOString() } : t))
      );
      setCollabFile(null);
    } catch (err) {
      console.error('Chyba při uploadu souboru:', err);
    } finally {
      setUploadingCollabFile(false);
    }
  };

  function handleReplyToCollab(msg: DirectMessage) {
    setOpenSections((prev) => ({ ...prev, messages: true }));
    const senderName = msg.user_id === userId ? msg.to_name || 'uživatel' : msg.from_name || 'uživatel';
    setNewMessage({
      to: senderName,
      toUserId: '',
      body: `@${senderName} `,
    });
    const el = document.getElementById('messages');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function resolveRecipientId(name: string, explicitId?: string) {
    const trimmed = explicitId?.trim();
    if (trimmed) return trimmed;
    const { data: target, error: targetErr } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', name)
      .limit(1)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target?.id) {
      throw new Error('Profil příjemce nebyl nalezen.');
    }
    return target.id as string;
  }

  async function sendDirectMessage(targetUserId: string, targetName: string, body: string) {
    if (!userId) {
      throw new Error('Chybí přihlášený uživatel.');
    }
    const payload = {
      from_name: profile.display_name || email || 'Neznámý',
      to_name: targetName || 'Neznámý',
      body,
      user_id: userId,
      to_user_id: targetUserId,
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select('id, user_id, to_user_id, from_name, to_name, body, created_at, unread')
      .single();

    if (error) throw error;

    const created: DirectMessage =
      data || {
        id: Date.now(),
        user_id: payload.user_id,
        to_user_id: payload.to_user_id,
        from_name: payload.from_name,
        to_name: payload.to_name,
        body: payload.body,
        created_at: new Date().toISOString(),
        unread: false,
      };

    setMessages((prev) => [{ ...created, unread: false }, ...prev]);

    // best-effort notifikace
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct_message',
          targetUserId,
          data: { from: payload.from_name, body: payload.body },
        }),
      });
    } catch (notifyErr) {
      console.warn('Notifikační webhook selhal:', notifyErr);
    }

    return created;
  }

  async function handleThreadReply(otherId: string, otherName: string) {
    const body = threadReplies[otherId]?.trim() || '';
    if (!body) return;
    setSendingMessage(true);
    setMessagesError(null);
    try {
      await sendDirectMessage(otherId, otherName, body);
      setThreadReplies((prev) => ({ ...prev, [otherId]: '' }));
      setSelectedThreadId(otherId);
    } catch (err) {
      console.error('Chyba při odeslání zprávy:', err);
      setMessagesError(err instanceof Error ? err.message : 'Nepodařilo se odeslat zprávu.');
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleSendDirectMessage(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!newMessage.body.trim()) {
      setMessagesError('Zpráva je prázdná.');
      return;
    }
    if (!newMessage.to.trim()) {
      setMessagesError('Vyplň název profilu příjemce.');
      return;
    }
    setSendingMessage(true);
    setMessagesError(null);
    try {
      const targetUserId = await resolveRecipientId(newMessage.to, newMessage.toUserId);
      await sendDirectMessage(targetUserId, newMessage.to.trim(), newMessage.body.trim());
      setSelectedThreadId(targetUserId);
      setNewMessage({ to: '', toUserId: '', body: '' });
    } catch (err) {
      console.error('Chyba při odeslání zprávy:', err);
      setMessagesError(err instanceof Error ? err.message : 'Nepodařilo se odeslat zprávu.');
    } finally {
      setSendingMessage(false);
    }
  }

  function handleBlogFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setBlogCoverFile(file);
  }

  async function uploadBlogCover(file: File) {
    setBlogError(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `covers/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('blog_covers')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (uploadError) {
      throw uploadError;
    }
    const { data } = supabase.storage.from('blog_covers').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleCreateBlogPost(e: FormEvent) {
    e.preventDefault();
    setBlogError(null);
    setBlogSuccess(null);
    if (!blogForm.title.trim()) {
      setBlogError('Vyplň název článku.');
      return;
    }
    if (!blogForm.excerpt.trim()) {
      setBlogError('Přidej krátký perex článku.');
      return;
    }
    if (!blogForm.body.trim()) {
      setBlogError('Doplň celý text článku.');
      return;
    }

    // pokud není vyplněná EN varianta, nakopíruj CZ (dočasný fallback místo autom. překladu)
    const fallbackTitleEn = blogForm.titleEn.trim() || blogForm.title.trim();
    const fallbackExcerptEn = blogForm.excerptEn.trim() || blogForm.excerpt.trim();
    const fallbackBodyEn = blogForm.bodyEn.trim() || blogForm.body.trim();

    setBlogSaving(true);
    try {
      let coverUrl = blogForm.coverUrl.trim() || '';
      if (blogCoverFile) {
        coverUrl = await uploadBlogCover(blogCoverFile);
      }
      const payload = {
        title: blogForm.title.trim(),
        title_en: fallbackTitleEn || null,
        excerpt: blogForm.excerpt.trim(),
        excerpt_en: fallbackExcerptEn || null,
        body: blogForm.body.trim(),
        body_en: fallbackBodyEn || null,
        author: blogForm.author.trim() || profile.display_name || 'Anonym',
        date: blogForm.date || new Date().toISOString(),
        cover_url: coverUrl || null,
        embed_url: blogForm.embedUrl.trim() || null,
      };
      if (editingPostId) {
        const { data: upd, error } = await supabase
          .from('posts')
          .update(payload)
          .eq('id', editingPostId)
          .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url, published')
          .single();
        if (error) throw error;
        if (upd) {
          setMyPosts((prev) =>
            prev.map((p) =>
              p.id === editingPostId
                ? { ...(upd as any) }
                : p
            )
          );
        }
        setBlogSuccess('Článek byl upraven.');
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const user_id = authData?.user?.id;
        const { error } = await supabase.from('posts').insert({ ...payload, user_id });
        if (error) throw error;
        setBlogSuccess('Článek byl přidán.');
      }
      // refresh moje články
      if (userId) {
        const { data: postsData, error: postsErr } = await supabase
          .from('posts')
          .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url, published')
          .eq('user_id', userId);
        if (!postsErr && postsData) setMyPosts(postsData as BlogPost[]);
      }
      setBlogForm({
        title: '',
        titleEn: '',
        excerpt: '',
        excerptEn: '',
        body: '',
        bodyEn: '',
        author: '',
        date: '',
        coverUrl: '',
        embedUrl: '',
      });
      setBlogCoverFile(null);
      setEditingPostId(null);
      setBlogFormOpen(false);
    } catch (err: any) {
      console.error('Chyba při přidání článku:', err);
      const message =
        err?.message ||
        'Nepodařilo se uložit článek.';
      setBlogError(message);
    } finally {
      setBlogSaving(false);
    }
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentBeat?.audio_url) return;
    el.src = currentBeat.audio_url;
    const playAudio = async () => {
      try {
        if (isPlayingBeat) {
          await el.play();
        } else {
          el.pause();
        }
      } catch (err) {
        console.error('Audio play error:', err);
        setPlayerMessage('Nepodařilo se spustit audio.');
      }
    };
    playAudio();
  }, [currentBeat, isPlayingBeat]);

  async function handleSignOut() {
    try {
      // Odhlášení lokální session
      await supabase.auth.signOut({ scope: 'local' });
      // Pro jistotu vyčisti případné zbývající tokeny
      if (typeof window !== 'undefined') {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
          .forEach((k) => window.localStorage.removeItem(k));
      }
    } catch (err) {
      console.error('Chyba při odhlášení:', err);
    } finally {
      router.replace('/');
    }
  }

  const activeThread = selectedThreadId
    ? collabThreads.find((t) => t.id === selectedThreadId) ?? null
    : null;
  const activeThreadLabel = activeThread ? buildCollabLabel(activeThread.participants) : '';

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="border-4 border-black bg-[var(--mpc-panel)] p-6 shadow-[8px_8px_0_#000]">
            <p className="text-sm text-neutral-800">Načítám profil…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => setIsPlayingBeat(false)}
        onPause={() => setIsPlayingBeat(false)}
        onPlay={() => setIsPlayingBeat(true)}
        onTimeUpdate={(e) => setBeatTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setBeatDuration((e.target as HTMLAudioElement).duration || 0)}
      />

      {/* Hero / cover */}
      <section
        className="relative overflow-hidden border-b border-[var(--mpc-dark)]"
        style={{
          backgroundImage: profile.banner_url
            ? `url(${profile.banner_url})`
            : 'url("/mpc-hero.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/25" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:h-28 md:w-28">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profilová fotka"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--mpc-light)]">
                    {profile.display_name
                      ? profile.display_name.charAt(0).toUpperCase()
                      : 'MPC'}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/70 bg-black/75 px-4 py-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur">
                    <span className="text-2xl font-black uppercase tracking-[0.12em] md:text-3xl">
                      {profile.display_name || 'Nový uživatel'}
                    </span>
                  </div>
                  {profile.hardware && (
                    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur">
                      <span className="text-[13px] font-semibold tracking-[0.08em]">
                        {t('profile.hardware', 'Hardware')}:
                      </span>
                      <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                        {profile.hardware}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mt-3 border-b border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/60 py-3 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-6 text-sm uppercase tracking-[0.15em]">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-black/60 bg-black/80 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:bg-black"
            >
              <span className="text-[14px]">←</span>
              <span>Zpět</span>
            </Link>
            <a href="#feed" className="pb-3 text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold">
              {t('profile.tab.all', 'Vše')}
            </a>
            <a href="#beats-feed" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              {t('profile.tab.beats', 'Beaty')}
            </a>
            <a href="#projects-feed" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              {t('profile.tab.projects', 'Projekty')}
            </a>
            <a href="#collabs" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              {t('profile.tab.collabs', 'Spolupráce')}
            </a>
            <a href="#messages" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              {t('profile.tab.messages', 'Zprávy')}
            </a>
            <a href="#my-forum" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              Moje fórum
            </a>
            <a href="#my-posts" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
              {t('profile.tab.posts', 'Moje články')}
            </a>
          </div>
        </div>
      </section>

      {/* Obsah */}
      <section className="mx-auto max-w-6xl px-4 py-8" id="feed">
        <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          {/* Levý sloupec: releasy */}
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]" id="beats-feed">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
                    {t('profile.beats.title', 'Moje beaty')}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{beats.length} {t('profile.items', 'položek')}</p>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-[var(--mpc-muted)]">
                  <span className="hover:text-[var(--mpc-light)] cursor-pointer">Podle data</span>
                  <span className="text-[var(--mpc-dark)]">•</span>
                  <span className="hover:text-[var(--mpc-light)] cursor-pointer">Podle BPM</span>
                </div>
              </div>
              {beatsError && (
                <div className="mb-2 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                  {beatsError}
                </div>
              )}
              {beats.length === 0 ? (
                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-6 text-sm text-[var(--mpc-muted)]">
                  Zatím žádné beaty. Nahraj první beat a ukaž se.
                </div>
              ) : (
                <div className="space-y-3">
                  {beats.map((beat) => (
                    <div
                      key={beat.id}
                      className={`rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3 text-sm text-[var(--mpc-light)] transition hover:border-[var(--mpc-accent)] ${currentBeat?.id === beat.id ? 'bg-[var(--mpc-panel)]/80' : ''}`}
                      style={
                        beat.cover_url
                          ? {
                              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url(${beat.cover_url})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: '16px',
                              overflow: 'hidden',
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[var(--mpc-light)]">{beat.title}</p>
                          <p className="text-[12px] text-[var(--mpc-muted)]">
                            {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                          </p>
                        </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePlayBeat(beat)}
                          disabled={!beat.audio_url}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mpc-accent)] text-[var(--mpc-light)] transition ${currentBeat?.id === beat.id && isPlayingBeat ? 'bg-[var(--mpc-accent)]' : 'bg-transparent'} disabled:opacity-40`}
                        >
                          {currentBeat?.id === beat.id && isPlayingBeat ? '▮▮' : '▶'}
                        </button>
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenBeatMenuId((prev) => (prev === beat.id ? null : beat.id))
                            }
                            className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                          >
                            •••
                          </button>
                          {openBeatMenuId === beat.id && (
                            <div className="absolute right-0 top-10 z-20 min-w-[140px] rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] text-[12px] text-[var(--mpc-light)] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                              <button
                                onClick={() => startEditBeat(beat)}
                                className="block w-full px-3 py-2 text-left hover:bg-[var(--mpc-deck)]"
                              >
                                Upravit beat
                              </button>
                              <button
                                onClick={() => handleDeleteBeat(beat.id)}
                                className="block w-full px-3 py-2 text-left hover:bg-[var(--mpc-deck)] text-red-400"
                              >
                                Smazat beat
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {editingBeatId === beat.id && (
                        <div className="mt-3 space-y-3 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                Název
                              </label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                BPM
                              </label>
                              <input
                                type="number"
                                value={editBpm}
                                onChange={(e) => setEditBpm(e.target.value)}
                                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                Mood
                              </label>
                              <input
                                type="text"
                                value={editMood}
                                onChange={(e) => setEditMood(e.target.value)}
                                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                Cover URL
                              </label>
                              <input
                                type="text"
                                value={editCoverUrl}
                                onChange={(e) => setEditCoverUrl(e.target.value)}
                                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                Nahrát nový cover
                              </label>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => setEditCoverFile(e.target.files?.[0] ?? null)}
                                className="mt-1 w-full text-[12px] text-[var(--mpc-light)]"
                              />
                              <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">Nahraje se do bucketu beats.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleSaveBeat}
                              className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-white"
                            >
                              Uložit
                            </button>
                            <button
                              onClick={() => setEditingBeatId(null)}
                              className="rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                            >
                              Zrušit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                      {/* pseudo-waveform */}
                      <div
                        className="mt-3 h-[70px] cursor-pointer overflow-hidden rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-deck)]"
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          seekBeat(beat, e.clientX - rect.left, rect.width);
                        }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width:
                              currentBeat?.id === beat.id && beatDuration
                                ? `${Math.min((beatTime / beatDuration) * 100, 100)}%`
                                : '0%',
                            background:
                              'repeating-linear-gradient(to right, rgba(0,86,63,0.95) 0, rgba(0,86,63,0.95) 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)',
                            boxShadow: '0 4px 12px rgba(0,224,150,0.35)',
                            transition: 'width 0.1s linear',
                          }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                        <span>{beat.audio_url ? 'Audio připojeno' : 'Bez audia'}</span>
                        {currentBeat?.id === beat.id && playerMessage && (
                          <span className="text-[var(--mpc-accent)]">{playerMessage}</span>
                        )}
                        {currentBeat?.id === beat.id && isPlayingBeat && (
                          <span className="rounded-full bg-[var(--mpc-accent)]/15 px-2 py-[2px] text-[10px] text-[var(--mpc-accent)]">
                            Přehrává se
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {editingProject && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Upravit projekt</h3>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">{editingProject.title}</p>
                        </div>
                  <button
                    onClick={() => setEditingProject(null)}
                    className="text-[11px] text-[var(--mpc-muted)] hover:text-white"
                  >
                    Zavřít
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Název</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      value={projectEditTitle}
                      onChange={(e) => setProjectEditTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Popis</label>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={3}
                      value={projectEditDescription}
                      onChange={(e) => setProjectEditDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                        Cover URL (volitelné)
                      </label>
                      <input
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="https://..."
                        value={projectEditCover.url || editingProject.cover_url || ''}
                        onChange={(e) =>
                          setProjectEditCover((prev) => ({ ...prev, url: e.target.value }))
                        }
                      />
                      {editingProject.cover_url && !projectEditCover.file && (
                        <p className="text-[11px] text-[var(--mpc-muted)] break-all">
                          Aktuální: {editingProject.cover_url}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                        Nahrát nový cover
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) =>
                          setProjectEditCover((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))
                        }
                        className="w-full text-[12px] text-[var(--mpc-light)]"
                      />
                      <p className="text-[11px] text-[var(--mpc-muted)]">
                        Nahraj obrázek (JPG/PNG/WEBP) nebo použij URL vlevo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[var(--mpc-light)]">Skladby</h4>
                    <button
                      type="button"
                      onClick={() =>
                        setProjectEditTracks((prev) =>
                          prev.length >= 30 ? prev : [...prev, { name: '', url: '', file: null }]
                        )
                      }
                      className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                      disabled={projectEditTracks.length >= 30}
                    >
                      Další skladba
                    </button>
                  </div>
                  <div className="space-y-2">
                    {projectEditTracks.map((tr, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-[var(--mpc-muted)]">Skladba #{idx + 1}</span>
                          {projectEditTracks.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setProjectEditTracks((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-[11px] text-red-300 hover:text-red-200"
                            >
                              Odebrat
                            </button>
                          )}
                        </div>
                        <input
                          className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-[13px] text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                          placeholder="Název skladby"
                          value={tr.name}
                          onChange={(e) =>
                            setProjectEditTracks((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p))
                            )
                          }
                        />
                        <div className="mt-2 flex flex-col gap-2">
                          {tr.url && (
                            <div className="text-[11px] text-[var(--mpc-muted)] break-all">
                              Aktuální: <span className="text-[var(--mpc-light)]">{tr.url}</span>
                            </div>
                          )}
                          <input
                            type="file"
                            accept=".wav,.mp3,audio/wav,audio/mpeg"
                            onChange={(e) =>
                              setProjectEditTracks((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, file: e.target.files?.[0] ?? null } : p))
                              )
                            }
                            className="block w-full text-[12px] text-[var(--mpc-light)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={projectSaving}
                    onClick={async () => {
                      if (!editingProject) return;
                      if (!projectEditTitle.trim()) {
                        setProjectsError('Zadej název projektu.');
                        return;
                      }
                      setProjectSaving(true);
                      setProjectsError(null);
                      try {
                        const uploads: Array<{ name: string; url: string }> = [];
                        const finalTracks: Array<{ name: string; url: string }> = [];

                        // Cover upload (pokud je vybrán nový soubor)
                        let coverUrl = editingProject.cover_url || null;
                        if (projectEditCover.file) {
                          const safeCover = projectEditCover.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                          const coverPath = `${userId}/projects/covers/${Date.now()}-${safeCover}`;
                          const { error: coverErr } = await supabase.storage
                            .from('projects')
                            .upload(coverPath, projectEditCover.file, { upsert: true });
                          if (coverErr) throw coverErr;
                          const { data: pubCover } = supabase.storage.from('projects').getPublicUrl(coverPath);
                          coverUrl = pubCover.publicUrl;
                        } else if (projectEditCover.url && projectEditCover.url.trim()) {
                          coverUrl = projectEditCover.url.trim();
                        }

                        for (const tr of projectEditTracks) {
                          if (tr.file) {
                            const ext = tr.file.name.split('.').pop()?.toLowerCase();
                            if (ext && !['wav', 'mp3'].includes(ext)) {
                              throw new Error('Audio musí být WAV nebo MP3.');
                            }
                            const safe = tr.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                            const path = `${userId}/projects/audio/${Date.now()}-${safe}`;
                            const { error: uploadErr } = await supabase.storage
                              .from('projects')
                              .upload(path, tr.file, { upsert: true });
                            if (uploadErr) throw uploadErr;
                            const { data: pub } = supabase.storage.from('projects').getPublicUrl(path);
                            uploads.push({ name: tr.name.trim() || tr.file.name, url: pub.publicUrl });
                            finalTracks.push({ name: tr.name.trim() || tr.file.name, url: pub.publicUrl });
                          } else if (tr.url) {
                            finalTracks.push({ name: tr.name.trim() || tr.url, url: tr.url });
                          }
                        }

                        const firstUrl = finalTracks[0]?.url || editingProject.project_url || null;

                        const { error: updateErr } = await supabase
                          .from('projects')
                          .update({
                            title: projectEditTitle.trim(),
                            description: projectEditDescription.trim() || null,
                            project_url: firstUrl,
                            tracks_json: finalTracks,
                            cover_url: coverUrl,
                          })
                          .eq('id', editingProject.id);
                        if (updateErr) throw updateErr;

                        setProjects((prev) =>
                          prev.map((p) =>
                            p.id === editingProject.id
                              ? {
                                  ...p,
                                  title: projectEditTitle.trim(),
                                  description: projectEditDescription.trim() || null,
                                  project_url: firstUrl,
                                  tracks_json: finalTracks,
                                  cover_url: coverUrl,
                                }
                              : p
                          )
                        );
                        setEditingProject(null);
                      } catch (err) {
                        console.error('Chyba při úpravě projektu:', err);
                        setProjectsError('Nepodařilo se uložit projekt.');
                      } finally {
                        setProjectSaving(false);
                      }
                    }}
                    className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_8px_20px_rgba(255,75,129,0.35)] disabled:opacity-60"
                  >
                    {projectSaving ? 'Ukládám…' : 'Uložit změny'}
                  </button>
                  <button
                    type="button"
                    disabled={projectSaving}
                    onClick={async () => {
                      if (!editingProject || !confirm('Opravdu chcete projekt smazat?')) return;
                      setProjectSaving(true);
                      setProjectsError(null);
                      try {
                        const { error } = await supabase.from('projects').delete().eq('id', editingProject.id);
                        if (error) throw error;
                        setProjects((prev) => prev.filter((p) => p.id !== editingProject.id));
                        setEditingProject(null);
                      } catch (err) {
                        console.error('Chyba při mazání projektu:', err);
                        setProjectsError('Projekt se nepodařilo smazat.');
                      } finally {
                        setProjectSaving(false);
                      }
                    }}
                    className="rounded-full border border-red-400 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Smazat projekt
                  </button>
                  <button
                    onClick={() => setEditingProject(null)}
                    className="rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]" id="projects-feed">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
                    {t('profile.projects.title', 'Moje projekty')}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{projects.length} {t('profile.items', 'položek')}</p>
                </div>
              </div>
              {projectsError && (
                <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                  {projectsError}
                </div>
              )}
              {projects.length === 0 ? (
                <div className="flex flex-col items-start gap-3 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-4 py-6">
                  <div className="rounded-md bg-[var(--mpc-panel)] px-3 py-2 text-[var(--mpc-muted)]">📂</div>
                  <p className="text-sm text-[var(--mpc-light)]">Zatím žádné projekty</p>
                  <p className="text-xs text-[var(--mpc-muted)]">
                    Spoj své beaty do projektů – vytvoř první projekt.
                  </p>
                  <button
                    onClick={() => toggleSection('projectUpload')}
                    className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_8px_20px_rgba(255,75,129,0.35)]"
                  >
                    Nahrát projekt
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const projectStyle = project.cover_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.9)), url(${project.cover_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined;
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3 text-sm text-[var(--mpc-light)]"
                        style={projectStyle}
                      >
                        <div>
                          <p className="font-semibold">{project.title}</p>
                          <p className="text-[12px] text-[var(--mpc-muted)]">
                            {project.description || 'Bez popisu'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px] text-[var(--mpc-muted)]">
                          <span>Projekt</span>
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setProjectEditTitle(project.title || '');
                              setProjectEditDescription(project.description || '');
                              const tracks = Array.isArray(project.tracks_json)
                                ? project.tracks_json.map((t: any) => ({ name: t.name || '', url: t.url || '' }))
                                : [];
                              setProjectEditTracks(tracks.length > 0 ? tracks : [{ name: '', url: '', file: null }]);
                            }}
                            className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                          >
                            Upravit
                          </button>
                          <button
                            onClick={() => void handleDeleteProject(project.id)}
                            disabled={deletingProjectId === project.id}
                            className="rounded-full border border-red-400 px-3 py-1 text-[var(--mpc-accent)] hover:bg-red-500/10 disabled:opacity-50"
                          >
                            {deletingProjectId === project.id ? 'Mažu…' : 'Odebrat'}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--mpc-light)]">
                            <label className="text-[var(--mpc-muted)]">Přístup</label>
                            <select
                              value={project.access_mode || 'public'}
                              onChange={(e) => handleUpdateProjectAccess(project.id, e.target.value as 'public' | 'request' | 'private')}
                              className="rounded border border-[var(--mpc-dark)] bg-black/70 px-2 py-1 text-[11px] text-[var(--mpc-light)]"
                            >
                              <option value="public">Veřejný</option>
                              <option value="request">Na žádost</option>
                              <option value="private">Soukromý</option>
                            </select>
                          </div>
                          {deleteProjectError[project.id] && (
                            <p className="mt-1 text-[11px] text-red-300">{deleteProjectError[project.id]}</p>
                          )}
                          {projectGrantsError && (
                            <p className="text-[11px] text-red-300">{projectGrantsError}</p>
                          )}
                          {projectGrants[project.id] && projectGrants[project.id].length > 0 && (
                            <div className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-2 py-1 text-left text-[11px]">
                              <p className="mb-1 text-[var(--mpc-muted)]">Aktivní přístupy:</p>
                              <div className="space-y-1">
                                {projectGrants[project.id].map((g) => (
                                  <div key={g.id} className="flex items-center justify-between">
                                    <span>{g.display_name || `${g.user_id.slice(0, 6)}…`}</span>
                                    <button
                                      onClick={() => void handleRevokeGrant(project.id, g.id)}
                                      className="text-[10px] text-red-300 hover:text-white"
                                    >
                                      Odebrat
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Žádosti o přístup k projektům</h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Příchozí žádosti na tvoje projekty
                  </p>
                </div>
              </div>
              {projectRequestsLoading && <p className="text-[11px] text-[var(--mpc-muted)]">Načítám žádosti…</p>}
              {projectRequestsError && (
                <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {projectRequestsError}
                </div>
              )}
              {projectRequests.length === 0 ? (
                <p className="text-[12px] text-[var(--mpc-muted)]">Nemáš žádné čekající žádosti.</p>
              ) : (
                <div className="space-y-2">
                  {projectRequests.map((req) => (
                    <div key={req.id} className="flex flex-col gap-2 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{req.requester_name || 'Neznámý uživatel'}</p>
                          <p className="text-[11px] text-[var(--mpc-muted)]">
                            Projekt: {req.project_title || req.project_id}
                          </p>
                        </div>
                        <p className="text-[11px] text-[var(--mpc-muted)]">{formatRelativeTime(req.created_at)}</p>
                      </div>
                      {req.message && (
                        <p className="text-[12px] text-[var(--mpc-light)]">„{req.message}“</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void handleProjectRequestDecision(req, true)}
                          className="rounded-full bg-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
                        >
                          Schválit
                        </button>
                        <button
                          onClick={() => void handleProjectRequestDecision(req, false)}
                          className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-light)] hover:border-red-400 hover:text-white"
                        >
                          Zamítnout
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]" id="collabs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
                    {t('profile.collabs.title', 'Spolupráce')}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    {collabThreads.length} {t('profile.collabs.count', 'spoluprací')}
                  </p>
                </div>
                <button
                  onClick={() => setShowNewThreadForm((prev) => !prev)}
                  className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                >
                  {showNewThreadForm ? 'Zavřít' : 'Nová spolupráce'}
                </button>
              </div>
              {collabThreadsError && (
                <div className="mb-3 rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {collabThreadsError}
                </div>
              )}

              {showNewThreadForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleCreateCollabThread();
                  }}
                  className="mb-4 space-y-3 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-4 py-3"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Název spolupráce</label>
                      <input
                        className="w-full rounded-md border border-[var(--mpc-dark)] bg-black/50 px-3 py-2 text-sm text-[var(--mpc-light)] focus:border-[var(--mpc-accent)] focus:outline-none"
                        placeholder="Např. Nový beat"
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Partner (display_name)</label>
                      <input
                        className="w-full rounded-md border border-[var(--mpc-dark)] bg-black/50 px-3 py-2 text-sm text-[var(--mpc-light)] focus:border-[var(--mpc-accent)] focus:outline-none"
                        placeholder="Jméno profilu"
                        value={newThreadPartner}
                        onChange={(e) => setNewThreadPartner(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={creatingThread || !newThreadTitle.trim() || !newThreadPartner.trim()}
                      className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-60"
                    >
                      {creatingThread ? 'Zakládám…' : 'Vytvořit'}
                    </button>
                    <p className="text-[11px] text-[var(--mpc-muted)]">Vyhledej partnera podle display_name.</p>
                  </div>
                </form>
              )}

              <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
                <div className="space-y-2">
                  {collabThreadsLoading ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Načítám spolupráce…</p>
                  ) : collabThreads.length === 0 ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádná vlákna. Založ novou spolupráci.</p>
                  ) : (
                    collabThreads.map((thread) => {
                      const displayTitle = buildCollabLabel(thread.participants);
                      const isActive = thread.id === selectedThreadId;
                      return (
                        <button
                          type="button"
                          key={thread.id}
                          onClick={() => setSelectedThreadId(thread.id)}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                            isActive
                              ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/15'
                              : 'border-[var(--mpc-dark)] bg-[var(--mpc-panel)] hover:border-[var(--mpc-accent)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--mpc-light)]">{displayTitle}</p>
                              <p className="text-[11px] text-[var(--mpc-muted)]">
                                {formatRelativeTime(thread.updated_at)}
                              </p>
                            </div>
                            <span className="rounded-full border border-[var(--mpc-dark)] bg-black/40 px-2 py-[2px] text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-light)]">
                              {thread.status}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 text-sm text-[var(--mpc-light)]">
                  {!activeThread ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Vyber vlákno vlevo.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold">{activeThreadLabel}</p>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                            Status: {activeThread.status}
                          </p>
                        </div>
                        <p className="text-[11px] text-[var(--mpc-muted)]">
                          Aktualizováno {formatRelativeTime(activeThread.updated_at)}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3">
                          <div className="mb-2 text-sm font-semibold">Zprávy</div>
                          {collabMessagesLoading ? (
                            <p className="text-[12px] text-[var(--mpc-muted)]">Načítám…</p>
                          ) : collabMessages.length === 0 ? (
                            <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné zprávy.</p>
                          ) : (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {collabMessages.map((msg) => (
                                <div key={msg.id} className="rounded border border-[var(--mpc-dark)] bg-black/40 px-3 py-2">
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                                    <span>{msg.author_name || 'Neznámý'}</span>
                                    <span>{formatRelativeTime(msg.created_at)}</span>
                                  </div>
                                  <p className="whitespace-pre-line text-sm text-[var(--mpc-light)]">{msg.body}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 space-y-2">
                            <textarea
                              className="w-full rounded-md border border-[var(--mpc-dark)] bg-black/60 px-3 py-2 text-sm text-[var(--mpc-light)] focus:border-[var(--mpc-accent)] focus:outline-none"
                              rows={3}
                              placeholder="Napiš zprávu…"
                              value={collabMessageBody}
                              onChange={(e) => setCollabMessageBody(e.target.value)}
                            />
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void handleSendCollabMsg()}
                                disabled={sendingCollabMessage || !collabMessageBody.trim()}
                                className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-60"
                              >
                                {sendingCollabMessage ? 'Odesílám…' : 'Odeslat'}
                              </button>
                              {sendingCollabMessage && <span className="text-[11px] text-[var(--mpc-muted)]">Probíhá odesílání…</span>}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold">Soubory</div>
                            <label className="cursor-pointer rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)]">
                              Vybrat soubor
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => setCollabFile(e.target.files?.[0] ?? null)}
                              />
                            </label>
                          </div>
                          {collabFilesLoading ? (
                            <p className="text-[12px] text-[var(--mpc-muted)]">Načítám soubory…</p>
                          ) : collabFiles.length === 0 ? (
                            <p className="text-[12px] text-[var(--mpc-muted)]">Žádné soubory zatím nejsou.</p>
                          ) : (
                            <div className="space-y-2">
                              {collabFiles.map((file) => (
                                <div key={file.id} className="flex items-center justify-between rounded border border-[var(--mpc-dark)] bg-black/40 px-3 py-2 text-sm">
                                  <div>
                                    <a
                                      href={file.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold text-[var(--mpc-light)] hover:text-[var(--mpc-accent)]"
                                    >
                                      {file.file_name || 'soubor'}
                                    </a>
                                    <p className="text-[11px] text-[var(--mpc-muted)]">{formatRelativeTime(file.created_at)}</p>
                                  </div>
                                  <span className="text-[11px] text-[var(--mpc-muted)]">uploader: {file.user_id.slice(0, 6)}…</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {collabFile && (
                            <div className="mt-3 flex items-center gap-3">
                              <span className="text-[12px] text-[var(--mpc-light)]">{collabFile.name}</span>
                              <button
                                type="button"
                                onClick={() => void handleUploadCollab()}
                                disabled={uploadingCollabFile}
                                className="rounded-full bg-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60"
                              >
                                {uploadingCollabFile ? 'Nahrávám…' : 'Nahrát'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3" id="my-forum">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Moje fórum</h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Tvé kategorie, podkategorie a vlákna
                  </p>
                </div>
              </div>
              {myForumLoading && <p className="text-[11px] text-[var(--mpc-muted)]">Načítám…</p>}
              {myForumError && (
                <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {myForumError}
                </div>
              )}

              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-4 py-3">
                  <div className="mb-2 text-sm font-semibold text-[var(--mpc-light)]">Kategorie / subkategorie</div>
                  {myForumCategories.length === 0 ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné kategorie.</p>
                  ) : (
                    <div className="space-y-2">
                      {myForumCategories.map((cat) => (
                        <div key={cat.id} className="flex items-start justify-between rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)]">
                          <div>
                            <p className="font-semibold">{cat.name}</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">{cat.description || 'Bez popisu'}</p>
                            {cat.parent_id && <p className="text-[11px] text-[var(--mpc-muted)]">Subkategorie</p>}
                          </div>
                          <div className="flex flex-col gap-1 text-[11px]">
                            <button
                              onClick={async () => {
                                const name = prompt('Upravit název kategorie', cat.name) ?? cat.name;
                                const desc = prompt('Upravit popis', cat.description || '') ?? cat.description;
                                try {
                                  const { error } = await supabase
                                    .from('forum_categories')
                                    .update({ name, description: desc || null })
                                    .eq('id', cat.id)
                                    .eq('user_id', userId);
                                  if (error) throw error;
                                  setMyForumCategories((prev) =>
                                    prev.map((c) => (c.id === cat.id ? { ...c, name, description: desc || null } : c))
                                  );
                                } catch (err) {
                                  console.error('Chyba při úpravě kategorie:', err);
                                  setMyForumError('Nepodařilo se upravit kategorii.');
                                }
                              }}
                              className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                            >
                              Upravit
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('forum_categories')
                                    .delete()
                                    .eq('id', cat.id)
                                    .eq('user_id', userId);
                                  if (error) throw error;
                                  setMyForumCategories((prev) => prev.filter((c) => c.id !== cat.id));
                                } catch (err) {
                                  console.error('Chyba při mazání kategorie:', err);
                                  setMyForumError('Nepodařilo se smazat kategorii.');
                                }
                              }}
                              className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-red-300 hover:border-red-400 hover:text-white"
                            >
                              Smazat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-4 py-3">
                  <div className="mb-2 text-sm font-semibold text-[var(--mpc-light)]">Vlákna</div>
                  {myForumThreads.length === 0 ? (
                    <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádná vlákna.</p>
                  ) : (
                    <div className="space-y-2">
                      {myForumThreads.map((thr) => (
                        <div key={thr.id} className="flex items-start justify-between rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)]">
                          <div>
                            <p className="font-semibold">{thr.title}</p>
                            <p className="text-[11px] text-[var(--mpc-muted)]">Kategorie: {thr.category_id}</p>
                          </div>
                          <div className="flex flex-col gap-1 text-[11px]">
                            <button
                              onClick={async () => {
                                const title = prompt('Upravit název vlákna', thr.title) ?? thr.title;
                                try {
                                  const { error } = await supabase
                                    .from('forum_threads')
                                    .update({ title })
                                    .eq('id', thr.id)
                                    .eq('user_id', userId);
                                  if (error) throw error;
                                  setMyForumThreads((prev) => prev.map((t) => (t.id === thr.id ? { ...t, title } : t)));
                                } catch (err) {
                                  console.error('Chyba při úpravě vlákna:', err);
                                  setMyForumError('Nepodařilo se upravit vlákno.');
                                }
                              }}
                              className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                            >
                              Upravit
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('forum_threads')
                                    .delete()
                                    .eq('id', thr.id)
                                    .eq('user_id', userId);
                                  if (error) throw error;
                                  setMyForumThreads((prev) => prev.filter((t) => t.id !== thr.id));
                                } catch (err) {
                                  console.error('Chyba při mazání vlákna:', err);
                                  setMyForumError('Nepodařilo se smazat vlákno.');
                                }
                              }}
                              className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-red-300 hover:border-red-400 hover:text-white"
                            >
                              Smazat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/forum"
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
              >
                Otevřít fórum
              </Link>
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3" id="my-posts">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Moje články</h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Publikace do News from Beats
                  </p>
                </div>
              </div>
              {myPostsLoading && <p className="text-[11px] text-[var(--mpc-muted)]">Načítám…</p>}
              {myPostsError && (
                <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {myPostsError}
                </div>
              )}
              <div className="space-y-3">
                {myPosts.length === 0 && !myPostsLoading ? (
                  <p className="text-sm text-[var(--mpc-muted)]">Zatím žádné články.</p>
                ) : (
                  myPosts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-[var(--mpc-light)]">{post.title}</p>
                          <p className="text-[12px] text-[var(--mpc-muted)]">{post.excerpt}</p>
                          <p className="text-[11px] text-[var(--mpc-muted)]">{post.date}</p>
                        </div>
                        <div className="flex flex-col gap-2 text-[11px]">
                          <button
                            onClick={async () => {
                              try {
                                const { error } = await supabase
                                  .from('posts')
                                  .update({ published: true })
                                  .eq('id', post.id);
                                if (error) throw error;
                                setMyPosts((prev) =>
                                  prev.map((p) =>
                                    p.id === post.id ? { ...p, published: true } : p
                                  )
                                );
                              } catch (err) {
                                console.error('Chyba publikace:', err);
                                setMyPostsError('Nepodařilo se publikovat článek. Zkontroluj sloupec published v tabulce.');
                              }
                            }}
                            className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                          >
                            {post.published ? 'Publikováno' : 'Publikovat'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingPostId(post.id);
                              setBlogForm({
                                title: post.title || '',
                                titleEn: post.title_en || '',
                                excerpt: post.excerpt || '',
                                excerptEn: post.excerpt_en || '',
                                body: post.body || '',
                                bodyEn: post.body_en || '',
                                author: post.author || '',
                                date: post.date || '',
                                coverUrl: post.cover_url || '',
                                embedUrl: post.embed_url || '',
                              });
                              setBlogFormOpen(true);
                              const el = document.getElementById('blog-form-card');
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                          >
                            Upravit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setEditingPostId(null);
                    setBlogForm({
                      title: '',
                      titleEn: '',
                      excerpt: '',
                      excerptEn: '',
                      body: '',
                      bodyEn: '',
                      author: profile.display_name || '',
                      date: '',
                      coverUrl: '',
                      embedUrl: '',
                    });
                    setBlogFormOpen(true);
                    const el = document.getElementById('blog-form-card');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="w-full rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                >
                  Vytvořit nový článek
                </button>
              </div>
            </div>

          </div>

          {/* Pravý sloupec: akce */}
          <div className="space-y-4" id="profile-settings">
            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <button
                onClick={() => toggleSection('beatUpload')}
                className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)]"
              >
                {openSections.beatUpload ? 'Schovat formulář' : 'Nahrát beat'}
              </button>
              {openSections.beatUpload && (
                <div className="mt-4">
                  <BeatUploadForm />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <button
                onClick={() => toggleSection('projectUpload')}
                className="w-full rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
              >
                {openSections.projectUpload ? 'Schovat formulář' : 'Nahrát projekt'}
              </button>
              {openSections.projectUpload && (
                <div className="mt-4">
                  <ProjectUploadForm />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <button
                onClick={() => toggleSection('profile')}
                className="w-full rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                {openSections.profile ? 'Schovat' : 'Upravit profil'}
              </button>
              {openSections.profile && (
                <div className="mt-4 space-y-4">
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                        Jméno / producent
                      </label>
                      <input
                        type="text"
                        value={profile.display_name}
                        onChange={(e) =>
                          handleFieldChange('display_name', e.target.value)
                        }
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="Např. Northside, LoFi Karel…"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                        Změnit avatar
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleAvatarChange}
                        className="mt-1 block w-full text-[11px] text-[var(--mpc-light)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                        Banner (pozadí profilu)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBannerChange}
                        className="mt-1 block w-full text-[11px] text-[var(--mpc-light)]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                        Hardware / setup
                      </label>
                      <input
                        type="text"
                        value={profile.hardware}
                        onChange={(e) =>
                          handleFieldChange('hardware', e.target.value)
                        }
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="MPC, SP-404, Ableton, mikrofon…"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                        Krátké info o sobě
                      </label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) =>
                          handleFieldChange('bio', e.target.value)
                        }
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        rows={4}
                        placeholder="Krátký popis, odkud jsi, jaký děláš zvuk…"
                      />
                    </div>

                    {error && (
                      <p className="text-[11px] text-red-400">{error}</p>
                    )}
                    {success && (
                      <p className="text-[11px] text-[var(--mpc-accent)]">{success}</p>
                    )}

                    {uploadingAvatar && (
                      <p className="text-[11px] text-[var(--mpc-muted)]">Nahrávám fotku…</p>
                    )}

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60"
                    >
                      {saving ? 'Ukládám…' : 'Uložit profil'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                Odhlásit se
              </button>
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-4" id="messages">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--mpc-light)]">{t('profile.messages.title', 'Zprávy')}</h3>
                  {unreadThreadCount > 0 && (
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      {unreadThreadCount} {t('profile.messages.new', 'nových zpráv')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('collab-new-message');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px]"
                >
                  {t('profile.messages.new', 'Nová zpráva')}
                </button>
              </div>

              {messagesLoading && (
                <p className="text-[11px] text-[var(--mpc-muted)]">Načítám…</p>
              )}
              {messagesError && (
                <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                  {messagesError}
                </div>
              )}

              <div className="space-y-3">
                {messages.map((msg) => {
                  const isFromMe = msg.user_id === userId;
                  const senderName = isFromMe ? msg.to_name || 'Neznámý' : msg.from_name || 'Neznámý';
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-lg border px-4 py-3 text-sm transition ${msg.unread ? 'border-[var(--mpc-accent)] bg-[var(--mpc-deck)]' : 'border-[var(--mpc-dark)] bg-[var(--mpc-panel)]'}`}
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--mpc-light)]">{senderName}</span>
                          {msg.unread && (
                            <span className="rounded-full bg-[var(--mpc-accent)]/20 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)]">
                              Nové
                            </span>
                          )}
                        </div>
                        <span className="text-[var(--mpc-muted)]">{formatRelativeTime(msg.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[var(--mpc-muted)]">{msg.body}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        <button
                          onClick={() => handleReplyToCollab(msg)}
                          className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                        >
                          Odpovědět
                        </button>
                        <button className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-light)]">
                          Otevřít vlákno
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={(e) => { e.preventDefault(); void handleSendCollabMsg(); }} id="collab-new-message" className="mt-4 space-y-3 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Komu
                    </label>
                    <input
                      type="text"
                      value={newMessage.to}
                      onChange={(e) => setNewMessage((prev) => ({ ...prev, to: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      placeholder="Např. MC Panel, Blockboy…"
                    />
                    {userSuggestionsLoading && (
                      <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">Hledám uživatele…</p>
                    )}
                    {!userSuggestionsLoading && userSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-2 text-[11px]">
                        {userSuggestions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() =>
                              setNewMessage((prev) => ({
                                ...prev,
                                to: u.display_name || 'Neznámý',
                                toUserId: u.id,
                              }))
                            }
                            className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-[var(--mpc-panel)]"
                          >
                            <span className="text-[var(--mpc-light)]">{u.display_name || 'Bez jména'}</span>
                            <span className="text-[var(--mpc-muted)] text-[10px]">{u.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      ID příjemce (UUID)
                    </label>
                    <input
                      type="text"
                      value={newMessage.toUserId}
                      onChange={(e) => setNewMessage((prev) => ({ ...prev, toUserId: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      placeholder="uuid příjemce z auth.users"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Zpráva
                    </label>
                    <textarea
                      value={newMessage.body}
                      onChange={(e) => setNewMessage((prev) => ({ ...prev, body: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={4}
                      placeholder="Napiš detail spolupráce, tempo, mood, deadline…"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    Zprávy se ukládají do Supabase tabulky messages (user_id → odesílatel, to_user_id → příjemce). Pokud backend chybí, zůstanou lokálně.
                  </p>
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white disabled:opacity-60"
                  >
                    {sendingMessage ? 'Odesílám…' : 'Odeslat'}
                  </button>
                </div>
              </form>
              <p className="text-[11px] text-[var(--mpc-muted)]">
                Tady se sbíhají domluvy na spolupráci i soukromé zprávy. Brzy přidáme realtime a e-mail notifikace.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3" id="blog-form-card">
              {!blogFormOpen && (
                <div className="text-center text-[11px] text-[var(--mpc-muted)]">
                  Formulář pro článek otevřeš tlačítkem výše v sekci Moje články.
                </div>
              )}
              {blogFormOpen && (
                <form className="space-y-3" onSubmit={handleCreateBlogPost}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Název
                      </label>
                      <input
                        type="text"
                        value={blogForm.title}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Autor
                      </label>
                      <input
                        type="text"
                        value={blogForm.author}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, author: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder={profile.display_name || 'Autor'}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Název (English)
                      </label>
                      <input
                        type="text"
                        value={blogForm.titleEn}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="English title"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Datum
                      </label>
                      <input
                        type="date"
                        value={blogForm.date}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Embed (YouTube / Bandcamp / SoundCloud)
                      </label>
                      <input
                        type="text"
                        value={blogForm.embedUrl}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, embedUrl: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="https://youtu.be/..., https://bandcamp.com/..., https://soundcloud.com/..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Perex / úvod
                    </label>
                    <textarea
                      value={blogForm.excerpt}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Perex / úvod (English)
                    </label>
                    <textarea
                      value={blogForm.excerptEn}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, excerptEn: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={3}
                      placeholder="English excerpt"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Celý text článku
                    </label>
                    <textarea
                      value={blogForm.body}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, body: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                      Celý text článku (English)
                    </label>
                    <textarea
                      value={blogForm.bodyEn}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, bodyEn: e.target.value }))}
                      className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                      rows={6}
                      placeholder="Full article in English"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Cover URL (volitelné)
                      </label>
                      <input
                        type="text"
                        value={blogForm.coverUrl}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, coverUrl: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="https://…"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Nebo nahrát obrázek
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBlogFileChange}
                        className="mt-1 block w-full text-[11px] text-[var(--mpc-light)]"
                      />
                    </div>
                  </div>
                  {blogError && (
                    <div className="rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                      {blogError}
                    </div>
                  )}
                  {blogSuccess && (
                    <div className="rounded-md border border-emerald-700/40 bg-emerald-900/25 px-3 py-2 text-xs text-emerald-200">
                      {blogSuccess}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 text-[11px] text-[var(--mpc-muted)]">
                    <span>Uloží se do tabulky posts a cover do bucketu blog_covers.</span>
                    <span>Po úspěchu se objeví na homepage v sekci News from Beats.</span>
                  </div>
                  <button
                    type="submit"
                    disabled={blogSaving}
                    className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)] disabled:opacity-60"
                  >
                    {blogSaving ? 'Ukládám…' : editingPostId ? 'Uložit změny' : 'Publikovat článek'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
