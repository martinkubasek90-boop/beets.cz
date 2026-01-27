'use client';

import { useEffect, useMemo, useState, FormEvent, ChangeEvent, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { resizeImageFile } from '../lib/image-utils';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';
import BeatUploadForm from './beat-upload-form';
import ProjectUploadForm from './project-upload-form';
import AcapellaUploadForm from './acapella-upload-form';
import { useGlobalPlayer } from './global-player-provider';
import { NotificationBell } from './notification-bell';

type Profile = {
  display_name: string;
  hardware: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  region?: string | null;
  role?: 'superadmin' | 'admin' | 'creator' | 'mc' | 'curator' | null;
  seeking_signals?: string[] | null;
  offering_signals?: string[] | null;
  seeking_custom?: string | null;
  offering_custom?: string | null;
};

type BeatItem = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  sort_order?: number | null;
};

type AcapellaItem = {
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
  embed_html?: string | null;
  release_formats?: string[] | null;
  purchase_url?: string | null;
  access_mode?: 'public' | 'request' | 'private';
  tracks_json?: Array<{ name: string; url: string; path?: string | null }>;
  sort_order?: number | null;
};

type ImportMetadata = {
  title: string;
  artist?: string | null;
  cover?: string | null;
  link: string;
  provider?: string | null;
  embed_html?: string | null;
};

type PlayerMeta = {
  projectId?: string;
  trackIndex?: number;
};

type PlayerTrack = {
  id: string;
  title: string;
  url: string;
  cover_url?: string | null;
  artist?: string | null;
  item_type: 'beat' | 'project' | 'acapella';
  meta?: PlayerMeta;
};

const SEEKING_OPTIONS = ['BEAT', 'RAP', 'SCRATCH', 'MIX', 'MASTER', 'GRAFIKA', 'VIDEO', 'STUDIO'];
const OFFERING_OPTIONS = ['BEAT', 'RAP', 'SCRATCH', 'MIX', 'MASTER', 'STUDIO', 'GRAFIKA', 'VIDEO'];
const SIGNAL_CACHE_KEY = 'beets-signals-cache';
const SHOW_SHARE_FEATURE = false;
const FALLBACK_SITE_URL = 'https://beets.cz';

const slugifyName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const extractIframeHtml = (value: string) => {
  const match = value.match(/<iframe[\s\S]*?<\/iframe>/i);
  if (match) return match[0];
  const openTag = value.match(/<iframe[^>]*>/i);
  return openTag ? `${openTag[0]}</iframe>` : '';
};

const extractIframeAnchorHref = (value: string) => {
  const match = value.match(/<a[^>]+href=["']([^"']+)["']/i);
  return match ? match[1] : '';
};

const extractIframeSrc = (value: string) => {
  const match = value.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : '';
};

const getEmbedDefaultTitle = (src: string) => {
  if (!src) return '';
  if (src.includes('open.spotify.com')) return 'Spotify projekt';
  if (src.includes('soundcloud.com')) return 'SoundCloud projekt';
  if (src.includes('bandcamp.com')) return 'Bandcamp projekt';
  if (src.includes('music.apple.com') || src.includes('embed.music.apple.com')) return 'Apple Music projekt';
  return '';
};

const getEmbedProviderFromUrl = (value: string) => {
  if (!value) return '';
  if (value.includes('spotify.com')) return 'Spotify';
  if (value.includes('soundcloud.com')) return 'SoundCloud';
  if (value.includes('bandcamp.com')) return 'Bandcamp';
  if (value.includes('music.apple.com')) return 'Apple Music';
  return '';
};

const getProjectUrlFromEmbedSrc = (src: string) => {
  if (!src) return '';
  if (src.includes('open.spotify.com/embed/')) {
    return src.replace('open.spotify.com/embed/', 'open.spotify.com/');
  }
  if (src.includes('w.soundcloud.com/player/')) {
    try {
      const url = new URL(src);
      const raw = url.searchParams.get('url');
      return raw ? decodeURIComponent(raw) : '';
    } catch {
      return '';
    }
  }
  if (src.includes('embed.music.apple.com')) {
    return src.replace('embed.music.apple.com', 'music.apple.com');
  }
  if (src.includes('soundcloud.com') || src.includes('spotify.com') || src.includes('bandcamp.com')) {
    return src;
  }
  return '';
};

const getProjectUrlFromEmbedHtml = (value: string) => {
  const href = extractIframeAnchorHref(value);
  if (href) return href;
  const src = extractIframeSrc(value);
  const fromSrc = getProjectUrlFromEmbedSrc(src);
  if (fromSrc) return fromSrc;
  const rawUrl = value.match(/https?:\/\/[^\s"']+/i)?.[0] || '';
  return getProjectUrlFromEmbedSrc(rawUrl) || rawUrl;
};

const resolveProjectCoverUrl = (cover: string | null) => {
  if (!cover) return null;
  if (cover.startsWith('http')) return cover;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${cover}`;
};

const normalizeProjectTracks = (raw?: ProjectItem['tracks_json']) => {
  if (!Array.isArray(raw)) return [] as { name: string; url: string }[];
  return raw
    .map((t, idx) => {
      const url =
        t?.url && t.url.startsWith('http')
          ? t.url
          : t?.path
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${t.path}`
            : '';
      return {
        name: t?.name || `Track ${idx + 1}`,
        url,
      };
    })
    .filter((t) => Boolean(t.url));
};

const TOOL_GROUPS = [
  {
    label: 'Audio',
    items: [
      { href: '/beat-maker', label: 'Beat Maker' },
      { href: '/konvertor', label: 'Konvertor MP3' },
      { href: '/mpc-3000/konvertor', label: 'MPC 3000 Konvertor' },
      { href: '/mix-checklist', label: 'AI Mix Checklist' },
      { href: '/reference-match', label: 'Reference Match' },
      { href: '/drum-analyzer', label: 'Drum Analyzer' },
      { href: '/mix-master', label: 'Mix + Master' },
    ],
  },
  {
    label: 'Grafika',
    items: [
      { href: '/cover-generator', label: 'AI Cover Generator' },
      { href: '/preview-generator', label: 'IG/TikTok Preview' },
    ],
  },
];

const normalizePurchaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getProjectPasswordKey = (projectId?: string | number | null) =>
  projectId ? `project_password_${projectId}` : null;

const hashProjectPassword = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

type CollabThread = {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'rejected' | string;
  updated_at: string | null;
  participants: string[];
  partner_id?: string | null;
  partner_name?: string | null;
  partner_avatar?: string | null;
  creator_id?: string | null;
  deadline?: string | null;
  last_activity?: string | null;
  milestones?: { id: string; title: string; due?: string | null; done?: boolean }[];
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

type NotifyPayload = {
  user_id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  item_type?: string | null;
  item_id?: string | null;
  targetEmail?: string | null;
  senderId?: string | null;
  data?: Record<string, any>;
};

async function sendNotificationSafe(supabase: ReturnType<typeof createClient>, payload: NotifyPayload) {
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
      const { user_id, type, title, body, item_type, item_id } = payload;
      await supabase.from('notifications').insert({ user_id, type, title, body, item_type, item_id, read: false });
    } catch (inner) {
      console.warn('Notifikaci se nepodařilo uložit:', inner);
    }
  }
}

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

type DirectMessage = {
  id: number;
  user_id: string;
  to_user_id: string;
  from_name?: string | null;
  to_name?: string | null;
  body: string;
  created_at: string;
  unread?: boolean;
};

type UserSuggestion = {
  id: string;
  display_name: string | null;
};

type ProfileClientProps = {
  view?: 'full' | 'messages' | 'collabs';
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

type IncomingCall = {
  id: string;
  room_name: string;
  caller_id: string;
};

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

  function formatTime(sec?: number) {
  if (!sec || Number.isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export default function ProfileClient({ view = 'full' }: ProfileClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    hardware: '',
    bio: '',
    avatar_url: null,
    banner_url: null,
    region: null,
    role: 'creator',
    seeking_signals: [],
    offering_signals: [],
    seeking_custom: '',
    offering_custom: '',
  });
  const [editRegion, setEditRegion] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [defaultRole, setDefaultRole] = useState<'superadmin' | 'admin' | 'creator' | 'mc' | 'curator' | null>('creator');
  const [beats, setBeats] = useState<BeatItem[]>([]);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [dragBeatId, setDragBeatId] = useState<number | null>(null);
  const [dragOverBeatId, setDragOverBeatId] = useState<number | null>(null);
  const [beatsOrderSaved, setBeatsOrderSaved] = useState(false);
  const [acapellas, setAcapellas] = useState<AcapellaItem[]>([]);
  const [acapellasError, setAcapellasError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [dragProjectId, setDragProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [projectsOrderSaved, setProjectsOrderSaved] = useState(false);
  const [copiedProjectLinkId, setCopiedProjectLinkId] = useState<string | null>(null);
  const beatsListRef = useRef<HTMLDivElement | null>(null);
  const projectsListRef = useRef<HTMLDivElement | null>(null);
  const scrollListBy = (ref: React.RefObject<HTMLDivElement | null>, direction: 'up' | 'down') => {
    const node = ref.current;
    if (!node) return;
    const offset = direction === 'up' ? -260 : 260;
    node.scrollBy({ top: offset, behavior: 'smooth' });
  };
  const handleCopyProjectUrl = useCallback(async (url: string, projectId: string) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedProjectLinkId(projectId);
      window.setTimeout(() => {
        setCopiedProjectLinkId((prev) => (prev === projectId ? null : prev));
      }, 1600);
    } catch (err) {
      console.error('Nepodařilo se zkopírovat odkaz projektu:', err);
    }
  }, []);
  const [importProjectOpen, setImportProjectOpen] = useState(false);
  const [importProjectUrl, setImportProjectUrl] = useState('');
  const [importMetadata, setImportMetadata] = useState<ImportMetadata | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const [importArtist, setImportArtist] = useState('');
  const [importEmbedHtml, setImportEmbedHtml] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const autoEmbedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoEmbedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (importTitle.trim()) return;
    const src = extractIframeSrc(importEmbedHtml);
    const fallbackTitle = getEmbedDefaultTitle(src);
    if (fallbackTitle) {
      setImportTitle(fallbackTitle);
    }
  }, [importEmbedHtml, importTitle]);

  useEffect(() => {
    if (!importProjectOpen) return;
    const trimmed = importProjectUrl.trim();
    if (!trimmed) {
      lastAutoEmbedUrlRef.current = null;
      return;
    }
    if (importEmbedHtml.trim()) return;
    if (lastAutoEmbedUrlRef.current === trimmed) return;
    if (autoEmbedTimerRef.current) {
      clearTimeout(autoEmbedTimerRef.current);
    }
    autoEmbedTimerRef.current = setTimeout(async () => {
      if (importEmbedHtml.trim()) return;
      setImportLoading(true);
      setImportError(null);
      setImportSuccess(null);
      try {
        const response = await fetch(`/api/external-metadata?url=${encodeURIComponent(trimmed)}`);
        if (response.ok) {
          const meta = (await response.json()) as ImportMetadata;
          const fallback = meta.embed_html || buildEmbedFromUrl(trimmed);
          if (fallback) {
            setImportEmbedHtml(fallback);
            setImportMetadata({ ...meta, embed_html: fallback });
            if (!importTitle.trim() && meta.title) setImportTitle(meta.title);
            if (!importArtist.trim() && meta.artist) setImportArtist(meta.artist);
            setImportSuccess('Embed připraven.');
            lastAutoEmbedUrlRef.current = trimmed;
            return;
          }
        }
        const fallback = buildEmbedFromUrl(trimmed);
        if (fallback) {
          setImportEmbedHtml(fallback);
          setImportMetadata((prev) =>
            prev ?? {
              title: importTitle.trim() || getEmbedDefaultTitle(trimmed),
              artist: importArtist.trim(),
              provider: getEmbedProviderFromUrl(trimmed) || null,
              link: trimmed,
              cover: null,
              embed_html: fallback,
            }
          );
          setImportSuccess('Embed připraven.');
          lastAutoEmbedUrlRef.current = trimmed;
        }
      } catch {
        const fallback = buildEmbedFromUrl(trimmed);
        if (fallback) {
          setImportEmbedHtml(fallback);
          setImportMetadata((prev) =>
            prev ?? {
              title: importTitle.trim() || getEmbedDefaultTitle(trimmed),
              artist: importArtist.trim(),
              provider: getEmbedProviderFromUrl(trimmed) || null,
              link: trimmed,
              cover: null,
              embed_html: fallback,
            }
          );
          setImportSuccess('Embed připraven.');
          lastAutoEmbedUrlRef.current = trimmed;
        }
      } finally {
        setImportLoading(false);
      }
    }, 700);

    return () => {
      if (autoEmbedTimerRef.current) clearTimeout(autoEmbedTimerRef.current);
    };
  }, [importProjectOpen, importProjectUrl, importEmbedHtml, importTitle, importArtist]);
  const [myAccessRequests, setMyAccessRequests] = useState<ProjectAccessRequest[]>([]);
  const [myAccessRequestsError, setMyAccessRequestsError] = useState<string | null>(null);
  const [myAccessRequestsLoading, setMyAccessRequestsLoading] = useState(false);
  const [projectGrants, setProjectGrants] = useState<Record<string, ProjectAccessGrant[]>>({});
  const [projectGrantsError, setProjectGrantsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [threadReplies, setThreadReplies] = useState<Record<string, string>>({});
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [profileAvatarsById, setProfileAvatarsById] = useState<Record<string, string>>({});
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(true);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
  const [seekingSignals, setSeekingSignals] = useState<string[]>([]);
  const [offeringSignals, setOfferingSignals] = useState<string[]>([]);
  const [seekingCustom, setSeekingCustom] = useState('');
  const [offeringCustom, setOfferingCustom] = useState('');
  const toggleSignal = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };
  const loadCachedSignals = () => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(SIGNAL_CACHE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        seeking_signals: (parsed?.seeking_signals as string[]) || [],
        offering_signals: (parsed?.offering_signals as string[]) || [],
        seeking_custom: (parsed?.seeking_custom as string) || '',
        offering_custom: (parsed?.offering_custom as string) || '',
      };
    } catch {
      return null;
    }
  };

const currentRole = profile.role ?? 'creator';
const isSuperAdmin = currentRole === 'superadmin';
const isCurator = currentRole === 'curator';
const isAdmin = currentRole === 'admin' || isSuperAdmin || isCurator;
const isMcOnly = currentRole === 'mc';
const canUpload = !isMcOnly;
const canUploadAcapellas = currentRole === 'mc';
const canWriteArticles = isAdmin;
const canImportExternal = currentRole !== 'mc';
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
  const [collabStatusUpdating, setCollabStatusUpdating] = useState<string | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDue, setNewMilestoneDue] = useState('');
  const [savingMilestone, setSavingMilestone] = useState(false);
  const collabSummary = useMemo(() => {
    const counts = { active: 0, pending: 0, done: 0, cancelled: 0, paused: 0, rejected: 0 };
    collabThreads.forEach((t) => {
      if (t.status === 'active') counts.active += 1;
      else if (t.status === 'pending') counts.pending += 1;
      else if (t.status === 'done') counts.done += 1;
      else if (t.status === 'cancelled') counts.cancelled += 1;
      else if (t.status === 'paused') counts.paused += 1;
      else if (t.status === 'rejected') counts.rejected += 1;
    });
    return counts;
  }, [collabThreads]);
  const [startingCollabCall, setStartingCollabCall] = useState(false);
  const profileCompleteness = useMemo(() => {
    const missing: string[] = [];
    const regionValue = editRegion.trim() || profile.region?.trim() || '';
    if (!profile.avatar_url) missing.push('avatar');
    if (!profile.bio?.trim()) missing.push('bio');
    if (!regionValue) missing.push('kraj');
    if (!profile.role) missing.push('role');
    if (!(profile.seeking_signals?.length || profile.offering_signals?.length)) missing.push('tagy');

    const requireBeat = profile.role !== 'mc';
    const requireAcapella = profile.role === 'mc';
    if (requireBeat && !beats.length) missing.push('nahraný beat');
    if (requireAcapella && !acapellas.length) missing.push('nahraná akapela');

    const total = 5 + (requireBeat ? 1 : 0) + (requireAcapella ? 1 : 0);
    const done = total - missing.length;
    const percent = Math.round((done / total) * 100);
    return { missing, percent };
  }, [acapellas.length, beats.length, editRegion, profile.avatar_url, profile.bio, profile.region, profile.role, profile.seeking_signals, profile.offering_signals]);
  const siteUrl = useMemo(() => {
    const raw =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return (raw || FALLBACK_SITE_URL).replace(/\/$/, '');
  }, []);
  const profileSlug = useMemo(() => slugifyName(profile.display_name || ''), [profile.display_name]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadPartner, setNewThreadPartner] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);
  const [collabMessageBody, setCollabMessageBody] = useState('');
  const [sendingCollabMessage, setSendingCollabMessage] = useState(false);
  const [uploadingCollabFile, setUploadingCollabFile] = useState(false);
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
    acapellaUpload: false,
    messages: false,
  });
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectEditTitle, setProjectEditTitle] = useState('');
  const [projectEditDescription, setProjectEditDescription] = useState('');
  const [projectEditReleaseFormats, setProjectEditReleaseFormats] = useState<string[]>([]);
  const [projectEditPurchaseUrl, setProjectEditPurchaseUrl] = useState('');
  const [projectEditPassword, setProjectEditPassword] = useState('');
  const [projectEditTracks, setProjectEditTracks] = useState<
    Array<{ name: string; url?: string; path?: string | null; file?: File | null }>
  >([]);
  const [projectEditCover, setProjectEditCover] = useState<{ url?: string; file?: File | null }>({});
  const [projectSaving, setProjectSaving] = useState(false);
  const [currentBeat, setCurrentBeat] = useState<BeatItem | null>(null);
  const [currentAcapella, setCurrentAcapella] = useState<AcapellaItem | null>(null);
  const [playerMessage, setPlayerMessage] = useState<string | null>(null);
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
  const [editAcapellaAccess, setEditAcapellaAccess] = useState<'public' | 'request' | 'private'>('public');
  const [acapellaSaving, setAcapellaSaving] = useState(false);
  const [deletingAcapellaId, setDeletingAcapellaId] = useState<number | null>(null);
  const [updatingAcapellaAccessId, setUpdatingAcapellaAccessId] = useState<number | null>(null);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  type OverviewSectionKey = 'beats' | 'projects' | 'collabs' | 'messages' | 'access' | 'posts' | 'forum';
  const [overviewExpanded, setOverviewExpanded] = useState<Record<OverviewSectionKey, boolean>>({
    beats: false,
    projects: false,
    collabs: false,
    messages: false,
    access: false,
    posts: false,
    forum: false,
  });
  const toggleOverviewExpanded = (key: OverviewSectionKey) => {
    setOverviewExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [activeTab, setActiveTab] = useState<
    'all' | 'beats' | 'projects' | 'collabs' | 'acapellas' | 'messages' | 'forum' | 'posts'
  >('all');
  const {
    play: gpPlay,
    toggle: gpToggle,
    seek: gpSeek,
    current: gpCurrent,
    isPlaying: gpIsPlaying,
    currentTime: gpTime,
    duration: gpDuration,
    setOnEnded: gpSetOnEnded,
    setOnNext: gpSetOnNext,
    setOnPrev: gpSetOnPrev,
  } = useGlobalPlayer();
  const beatPlayerTracks = useMemo<PlayerTrack[]>(
    () =>
      beats
        .filter((beat) => Boolean(beat.audio_url))
        .map((beat) => ({
          id: `beat-${beat.id}`,
          title: beat.title,
          url: beat.audio_url || '',
          cover_url: beat.cover_url ?? null,
          artist: profile.display_name || 'Profil',
          item_type: 'beat' as const,
        })),
    [beats, profile.display_name]
  );

  const acapellaPlayerTracks = useMemo<PlayerTrack[]>(
    () =>
      acapellas
        .filter((item) => Boolean(item.audio_url))
        .map((item) => ({
          id: `acapella-${item.id}`,
          title: item.title,
          url: item.audio_url || '',
          cover_url: item.cover_url ?? null,
          artist: profile.display_name || 'Profil',
          item_type: 'acapella' as const,
        })),
    [acapellas, profile.display_name]
  );

  const projectPlayerTracksMap = useMemo<Record<string, PlayerTrack[]>>(() => {
    const map: Record<string, PlayerTrack[]> = {};
    projects.forEach((project) => {
      const tracks: PlayerTrack[] = [];
      normalizeProjectTracks(project.tracks_json).forEach((track, idx) => {
        tracks.push({
          id: `project-${project.id}-${idx}`,
          title: track.name,
          url: track.url,
          cover_url: project.cover_url ?? null,
          artist: profile.display_name || project.title || 'Projekt',
          item_type: 'project',
          meta: { projectId: project.id, trackIndex: idx },
        });
      });
      if (tracks.length === 0 && project.project_url) {
        tracks.push({
          id: `project-${project.id}`,
          title: project.title || 'Projekt',
          url: project.project_url,
          cover_url: project.cover_url ?? null,
          artist: profile.display_name || project.title || 'Projekt',
          item_type: 'project',
          meta: { projectId: project.id, trackIndex: -1 },
        });
      }
      if (tracks.length) {
        map[project.id] = tracks;
      }
    });
    return map;
  }, [projects, profile.display_name]);

  // Heartbeat pro last_seen_at každých 60 s
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const ping = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', auth.user.id);
    };
    void ping();
    timer = setInterval(ping, 60_000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [supabase]);

  const startPlayerTrack = useCallback(
    (track: PlayerTrack) => {
      if (!track.url) return;
      gpPlay({
        id: track.id,
        title: track.title,
        url: track.url,
        cover_url: track.cover_url || undefined,
        artist: track.artist || profile.display_name || 'Profil',
        item_type: track.item_type,
        meta: track.meta,
      });
    },
    [gpPlay, profile.display_name]
  );

  useEffect(() => {
    if (!gpSetOnNext || !gpSetOnPrev) return;

    const cycleTracks = (items: PlayerTrack[], direction: 1 | -1) => {
      if (!items.length) return;
      const currentId = gpCurrent?.id;
      const idx = items.findIndex((item) => item.id === currentId);
      const nextIndex =
        idx === -1
          ? direction === 1
            ? 0
            : items.length - 1
          : (idx + direction + items.length) % items.length;
      startPlayerTrack(items[nextIndex]);
    };

    const handleNext = () => {
      if (!gpCurrent) {
        if (acapellaPlayerTracks.length) {
          startPlayerTrack(acapellaPlayerTracks[0]);
          return;
        }
        if (beatPlayerTracks.length) {
          startPlayerTrack(beatPlayerTracks[0]);
        }
        return;
      }
      if (gpCurrent.item_type === 'beat') {
        cycleTracks(beatPlayerTracks, 1);
        return;
      }
      if (gpCurrent.item_type === 'acapella') {
        cycleTracks(acapellaPlayerTracks, 1);
        return;
      }
      if (gpCurrent.item_type === 'project') {
        const projectId = gpCurrent.meta?.projectId;
        if (projectId) {
          const queue = projectPlayerTracksMap[projectId];
          if (queue?.length) {
            cycleTracks(queue, 1);
            return;
          }
        }
      }
    };

    const handlePrev = () => {
      if (!gpCurrent) {
        if (acapellaPlayerTracks.length) {
          startPlayerTrack(acapellaPlayerTracks[acapellaPlayerTracks.length - 1]);
          return;
        }
        if (beatPlayerTracks.length) {
          startPlayerTrack(beatPlayerTracks[beatPlayerTracks.length - 1]);
        }
        return;
      }
      if (gpCurrent.item_type === 'beat') {
        cycleTracks(beatPlayerTracks, -1);
        return;
      }
      if (gpCurrent.item_type === 'acapella') {
        cycleTracks(acapellaPlayerTracks, -1);
        return;
      }
      if (gpCurrent.item_type === 'project') {
        const projectId = gpCurrent.meta?.projectId;
        if (projectId) {
          const queue = projectPlayerTracksMap[projectId];
          if (queue?.length) {
            cycleTracks(queue, -1);
            return;
          }
        }
      }
    };

    gpSetOnNext(handleNext);
    gpSetOnPrev(handlePrev);
    gpSetOnEnded(handleNext);

    return () => {
      gpSetOnNext(null);
      gpSetOnPrev(null);
      gpSetOnEnded(null);
    };
  }, [acapellaPlayerTracks, beatPlayerTracks, gpCurrent, gpSetOnEnded, gpSetOnNext, gpSetOnPrev, projectPlayerTracksMap, startPlayerTrack]);

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
        const metaRole = (user.user_metadata as any)?.role ?? 'creator';
        setDefaultRole(metaRole as any);

        // Nejprve zkusíme načíst nová pole; pokud nejsou ve schématu (prod), spadneme do fallbacku
        let data: any | null = null;
        const baseSelect =
          'display_name, hardware, bio, avatar_url, banner_url, region, role, seeking_signals, offering_signals, seeking_custom, offering_custom';
        const { data: fullData, error: profileError } = await supabase
          .from('profiles')
          .select(baseSelect)
          .eq('id', user.id)
          .maybeSingle();
        if (profileError && typeof profileError.message === 'string' && profileError.message.includes('column')) {
          const { data: fallbackData, error: fbError } = await supabase
            .from('profiles')
            .select('display_name, hardware, bio, avatar_url, banner_url, region, role')
            .eq('id', user.id)
            .maybeSingle();
          if (fbError) throw fbError;
          data = fallbackData;
        } else if (profileError) {
          throw profileError;
        } else {
          data = fullData;
        }

        if (data) {
          const cachedSignals = loadCachedSignals();
          const hasDbSignals =
            Array.isArray((data as any).seeking_signals) ||
            Array.isArray((data as any).offering_signals) ||
            Boolean((data as any).seeking_custom) ||
            Boolean((data as any).offering_custom);
          const mergedSeeking = hasDbSignals ? (data as any).seeking_signals ?? [] : cachedSignals?.seeking_signals ?? [];
          const mergedOffering = hasDbSignals ? (data as any).offering_signals ?? [] : cachedSignals?.offering_signals ?? [];
          const mergedSeekingCustom = hasDbSignals ? (data as any).seeking_custom ?? '' : cachedSignals?.seeking_custom ?? '';
          const mergedOfferingCustom = hasDbSignals ? (data as any).offering_custom ?? '' : cachedSignals?.offering_custom ?? '';

          setProfile({
            display_name: data.display_name ?? '',
            hardware: data.hardware ?? '',
            bio: data.bio ?? '',
            avatar_url: data.avatar_url ?? null,
            banner_url: (data as any).banner_url ?? null,
            region: (data as any).region ?? null,
            role: (data as any).role ?? (metaRole as any),
            seeking_signals: mergedSeeking,
            offering_signals: mergedOffering,
            seeking_custom: mergedSeekingCustom,
            offering_custom: mergedOfferingCustom,
          });
          setEditRegion((data as any).region ?? '');
          setSeekingSignals(mergedSeeking);
          setOfferingSignals(mergedOffering);
          setSeekingCustom(mergedSeekingCustom);
          setOfferingCustom(mergedOfferingCustom);
        } else {
          // Pokud profil neexistuje, založ ho s rolí z metadata
          try {
            await supabase.from('profiles').insert({
              id: user.id,
              display_name: user.email?.split('@')[0] || null,
              role: metaRole,
            });
            setProfile((prev) => ({
              ...prev,
              display_name: user.email?.split('@')[0] || '',
              role: metaRole as any,
            }));
          } catch (insertErr) {
            console.warn('Nepodařilo se založit profil:', insertErr);
          }
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

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('calls-listener-profile')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `callee_id=eq.${userId}` },
        async (payload) => {
          const row: any = payload.new;
          if (!row || row.status !== 'ringing') return;
          setIncomingCall({ id: row.id, room_name: row.room_name, caller_id: row.caller_id });
          if (row.caller_id) {
            const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', row.caller_id).maybeSingle();
            setIncomingCallerName(prof?.display_name || null);
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
            setIncomingCallerName(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingCall, supabase, userId]);

  
  // Vlákna přímých zpráv seskupená podle protistrany
  const directThreads = useMemo(() => {
    const map = new Map<string, { otherId: string; otherName: string; lastMessage: string; lastTs: number; unread: boolean; messages: DirectMessage[] }>();
    messages.forEach((m) => {
      const isFromMe = m.user_id === userId;
      const otherId = isFromMe ? m.to_user_id : m.user_id;
      if (!otherId) return;
      const otherName = isFromMe
        ? profilesById[m.to_user_id || ''] || m.to_name || 'Neznámý'
        : profilesById[m.user_id || ''] || m.from_name || 'Neznámý';
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
  }, [messages, userId, profilesById]);

  const activeDmThreadId = expandedThread ?? directThreads[0]?.otherId ?? null;
  const activeDmThread = directThreads.find((thread) => thread.otherId === activeDmThreadId) ?? null;
  const visibleDmMessages = useMemo(() => {
    if (!activeDmThread) return [];
    if (activeDmThread.messages.length <= 40) return activeDmThread.messages;
    return activeDmThread.messages.slice(-40);
  }, [activeDmThread]);
  const hiddenDmCount = activeDmThread ? Math.max(0, activeDmThread.messages.length - visibleDmMessages.length) : 0;

  useEffect(() => {
    if (view !== 'messages') return;
    const threadId = searchParams?.get('thread');
    if (threadId) {
      setExpandedThread(threadId);
    }
  }, [searchParams, view]);

  useEffect(() => {
    if (view !== 'collabs') return;
    const threadId = searchParams?.get('thread');
    if (threadId) {
      setSelectedThreadId(threadId);
    }
  }, [searchParams, view]);


  // Načti display_name pro všechny uživatele z přímých zpráv
  useEffect(() => {
    const loadProfileNames = async () => {
      const ids = new Set<string>();
      messages.forEach((m) => {
        if (m.user_id) ids.add(m.user_id);
        if (m.to_user_id) ids.add(m.to_user_id);
      });
      if (!ids.size) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', Array.from(ids));
      if (error || !data) return;
      const map: Record<string, string> = {};
      const avatarMap: Record<string, string> = {};
      data.forEach((p: any) => {
        if (p.id && p.display_name) map[p.id as string] = p.display_name as string;
        if (p.id && p.avatar_url) avatarMap[p.id as string] = p.avatar_url as string;
      });
      setProfilesById((prev) => ({ ...prev, ...map }));
      setProfileAvatarsById((prev) => ({ ...prev, ...avatarMap }));
    };
    void loadProfileNames();
  }, [messages, supabase]);

function handleFieldChange(field: keyof Profile, value: string) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  // Načtení uživatelských beatů/projektů nebo akapel
  useEffect(() => {
    if (!userId) return;

    const loadBeatsProjectsCollabs = async () => {
      if (currentRole === 'mc') {
        let acapellaData: AcapellaItem[] | null = null;
        try {
          const { data, error } = await supabase
            .from('acapellas')
            .select('id, title, bpm, mood, audio_url, cover_url, access_mode')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          acapellaData = (data as AcapellaItem[]) ?? [];
        } catch (err: any) {
          const message = typeof err?.message === 'string' ? err.message : '';
          // Fallback pro schéma bez sloupce access_mode
          if (message.toLowerCase().includes('access_mode') || message.toLowerCase().includes('column')) {
            const { data, error: fallbackErr } = await supabase
              .from('acapellas')
              .select('id, title, bpm, mood, audio_url, cover_url')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });
            if (!fallbackErr) {
              acapellaData = (data as AcapellaItem[]) ?? [];
            } else {
              console.error('Chyba při načítání akapel (fallback):', fallbackErr);
              setAcapellasError('Nepodařilo se načíst tvoje akapely.');
            }
          } else {
            console.error('Chyba při načítání akapel:', err);
            setAcapellasError('Nepodařilo se načíst tvoje akapely.');
          }
        }
        if (acapellaData) {
          setAcapellas(acapellaData);
          setAcapellasError(null);
        }
        setBeats([]);
        setProjects([]);
        setBeatsError(null);
        setProjectsError(null);
        setProjectGrants({});
        return;
      }

      // načti beaty
      const { data: beatData, error: beatErr } = await supabase
        .from('beats')
        .select('id, title, bpm, mood, audio_url, cover_url, sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: false });

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
            .select('id, title, description, cover_url, project_url, tracks_json, access_mode, release_formats, purchase_url, embed_html, sort_order')
            .eq('user_id', userId)
            .order('sort_order', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: false });
          if (error) throw error;
          projectData = data || [];
        } catch (innerErr) {
          console.warn('Fallback select projects bez project_url/tracks_json:', innerErr);
          const { data, error } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, access_mode, release_formats, purchase_url, sort_order')
            .eq('user_id', userId)
            .order('sort_order', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: false });
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
            .select('id, project_id, user_id, created_at')
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
                display_name: null,
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

    const loadMyAccessRequests = async () => {
      if (!userId) return;
      setMyAccessRequestsLoading(true);
      setMyAccessRequestsError(null);
      try {
        const { data, error } = await supabase
          .from('project_access_requests')
          .select('id, project_id, status, message, created_at, projects!inner(id,title,user_id)')
          .eq('requester_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const projIds = Array.from(new Set(((data as any[]) ?? []).map((r) => r.project_id).filter(Boolean) as string[]));
        let nameMap: Record<string, string> = {};
        if (projIds.length) {
          const { data: projects, error: projErr } = await supabase
            .from('projects')
            .select('id,title')
            .in('id', projIds);
          if (projErr) throw projErr;
          nameMap = Object.fromEntries((projects as any[]).map((p) => [p.id, p.title || 'Projekt']));
        }

        const mapped: ProjectAccessRequest[] =
          (data as any[]).map((row) => ({
            id: row.id,
            project_id: row.project_id,
            status: row.status,
            message: row.message,
            requester_id: userId,
            requester_name: profile.display_name || null,
            project_title: nameMap[row.project_id] || row.projects?.title || null,
            created_at: row.created_at,
          })) ?? [];
        setMyAccessRequests(mapped);
      } catch (err) {
        console.error('Chyba načítání mých žádostí:', err);
        setMyAccessRequests([]);
        setMyAccessRequestsError('Nepodařilo se načíst tvoje žádosti.');
      } finally {
        setMyAccessRequestsLoading(false);
      }
    };

    loadBeatsProjectsCollabs();
    loadMessages();
    loadMyPosts();
    loadMyForum();
    loadProjectRequests();
    loadMyAccessRequests();

    const loadCollabThreads = async () => {
      setCollabThreadsLoading(true);
      setCollabThreadsError(null);
      if (!userId) {
        setCollabThreads([]);
        setCollabThreadsLoading(false);
        return;
      }
      try {
        // Kvůli PostgREST OR parsing chybám s UUID načteme zvlášť vlákna, kde je uživatel zakladatel,
        // a zvlášť vlákna, kde je účastník, a pak je sloučíme na FE.
        const [byCreator, byParticipant] = await Promise.all([
          supabase
            .from('collab_threads')
            .select('id, title, status, updated_at, created_by, deadline, last_activity, milestones')
            .eq('created_by', userId)
            .order('updated_at', { ascending: false }),
          supabase
            .from('collab_threads')
            .select('id, title, status, updated_at, created_by, deadline, last_activity, milestones, collab_participants!inner(user_id)')
            .eq('collab_participants.user_id', userId)
            .order('updated_at', { ascending: false }),
        ]);

        if (byCreator.error) throw byCreator.error;
        if (byParticipant.error) throw byParticipant.error;

        const mapThread = (t: any) => ({
          id: t.id as string,
          title: t.title as string,
          status: (t.status as string) || 'pending',
          updated_at: t.updated_at as string | null,
          creator_id: t.created_by || null,
          deadline: t.deadline || null,
          last_activity: t.last_activity || t.updated_at || null,
          milestones: Array.isArray(t.milestones) ? t.milestones : [],
          participants: [],
        });

        const combinedMap = new Map<
          string,
          {
            id: string;
            title: string;
            status: string;
            updated_at: string | null;
            participants: string[];
            deadline?: string | null;
            last_activity?: string | null;
            milestones?: { id: string; title: string; due?: string | null; done?: boolean }[];
            creator_id?: string | null;
          }
        >();
        (byCreator.data ?? []).forEach((t: any) => combinedMap.set(t.id, mapThread(t)));
        (byParticipant.data ?? []).forEach((t: any) => combinedMap.set(t.id, mapThread(t)));

        // Seřadíme podle updated_at (desc)
        const merged = Array.from(combinedMap.values()).sort((a, b) => {
          const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return tb - ta;
        });

        const threadIds = merged.map((thread) => thread.id);
        if (threadIds.length) {
          const { data: participants, error: participantsErr } = await supabase
            .from('collab_participants')
            .select('thread_id,user_id')
            .in('thread_id', threadIds);
          if (participantsErr) throw participantsErr;
          const partnerIds = Array.from(
            new Set(
              (participants ?? [])
                .map((p: any) => p.user_id)
                .filter((id) => id && id !== userId)
            )
          );
          let nameMap: Record<string, string> = {};
          let avatarMap: Record<string, string | null> = {};
          if (partnerIds.length) {
            const { data: profiles, error: profileErr } = await supabase
              .from('profiles')
              .select('id,display_name,avatar_url')
              .in('id', partnerIds);
            if (profileErr) throw profileErr;
            if (profiles) {
              nameMap = Object.fromEntries((profiles as any[]).map((p) => [p.id, p.display_name || '']));
              avatarMap = Object.fromEntries((profiles as any[]).map((p) => [p.id, p.avatar_url || null]));
            }
          }
          const threadNames = new Map<string, string[]>();
          const threadPartners = new Map<string, Array<{ id: string; name: string; avatar?: string | null }>>();
          (participants ?? []).forEach((p: any) => {
            if (!p.thread_id || !p.user_id) return;
            const partnerName = nameMap[p.user_id] || null;
            if (!partnerName) return; // nechceme zobrazovat UUID
            if (!threadNames.has(p.thread_id)) {
              threadNames.set(p.thread_id, []);
            }
            const list = threadNames.get(p.thread_id)!;
            if (!list.includes(partnerName)) {
              list.push(partnerName);
            }
            if (!threadPartners.has(p.thread_id)) {
              threadPartners.set(p.thread_id, []);
            }
            const partnersList = threadPartners.get(p.thread_id)!;
            if (!partnersList.some((item) => item.id === p.user_id)) {
              partnersList.push({ id: p.user_id, name: partnerName, avatar: avatarMap[p.user_id] || null });
            }
          });
          const currentUserName = profile.display_name || 'Ty';
          const finalThreads = merged.map((thread) => {
            const partners = (threadNames.get(thread.id) ?? []).filter(Boolean);
            const participants = [currentUserName, ...partners.filter((name) => name !== currentUserName)];
            const partnerInfo = (threadPartners.get(thread.id) ?? [])[0] || null;
            return {
              ...thread,
              participants,
              partner_id: partnerInfo?.id ?? null,
              partner_name: partnerInfo?.name ?? null,
              partner_avatar: partnerInfo?.avatar ?? null,
            };
          });
          setCollabThreads(finalThreads);
        } else {
          const currentUserName = profile.display_name || 'Ty';
          setCollabThreads(
            merged.map((thread) => ({
              ...thread,
              participants: [currentUserName],
              partner_id: null,
              partner_name: null,
              partner_avatar: null,
            }))
          );
        }
      } catch (err) {
        console.error('Chyba načítání spoluprací:', err);
        setCollabThreadsError('Nepodařilo se načíst spolupráce.');
        setCollabThreads([]);
      } finally {
        setCollabThreadsLoading(false);
      }
    };
    loadCollabThreads();
  }, [currentRole, supabase, userId, profile.display_name]);

  // Stream embed byl přesunut na samostatnou stránku /stream

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

    if (!editRegion.trim()) {
      setError('Vyber prosím kraj.');
      setSaving(false);
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError ?? new Error('Uživatel není přihlášen.');
      }

      let fallbackUsed = false;
      let upsertError: any = null;
      const fullPayload = {
        id: user.id,
        display_name: profile.display_name.trim() || null,
        hardware: profile.hardware.trim() || null,
        bio: profile.bio.trim() || null,
        avatar_url: profile.avatar_url,
        banner_url: profile.banner_url,
        region: editRegion.trim() || null,
        role: profile.role ?? defaultRole ?? 'creator',
        seeking_signals: seekingSignals,
        offering_signals: offeringSignals,
        seeking_custom: seekingCustom.trim() || null,
        offering_custom: offeringCustom.trim() || null,
      };

      const { error: firstError } = await supabase.from('profiles').upsert(fullPayload, { onConflict: 'id' });
      upsertError = firstError;

      if (upsertError && typeof upsertError.message === 'string' && upsertError.message.includes('column')) {
        // Prod schéma ještě nemá nové sloupce – zkusíme uložit bez nich
        fallbackUsed = true;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            SIGNAL_CACHE_KEY,
            JSON.stringify({
              seeking_signals: seekingSignals,
              offering_signals: offeringSignals,
              seeking_custom: seekingCustom.trim(),
              offering_custom: offeringCustom.trim(),
            })
          );
        }
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              display_name: profile.display_name.trim() || null,
              hardware: profile.hardware.trim() || null,
              bio: profile.bio.trim() || null,
              avatar_url: profile.avatar_url,
              banner_url: profile.banner_url,
              region: editRegion.trim() || null,
              role: profile.role ?? 'creator',
            },
            { onConflict: 'id' }
          );
        upsertError = fallbackError;
      }

      if (upsertError) throw upsertError;

      setProfile((prev) => ({
        ...prev,
        region: editRegion.trim() || null,
        seeking_signals: seekingSignals,
        offering_signals: offeringSignals,
        seeking_custom: seekingCustom.trim() || null,
        offering_custom: offeringCustom.trim() || null,
      }));
      if (!fallbackUsed && typeof window !== 'undefined') {
        window.localStorage.removeItem(SIGNAL_CACHE_KEY);
      }
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

  function toggleSection(key: 'profile' | 'beatUpload' | 'projectUpload' | 'acapellaUpload') {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const createShareLink = async (itemType: 'beat' | 'project', itemId: string, allowDownload = false) => {
    if (!userId) return;
    setShareLoadingId(`${itemType}-${itemId}`);
    setShareMessage(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, allow_download: allowDownload, expires_in_hours: 72 }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to create share link');
      }
      const json = await res.json();
      if (json?.url && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(json.url);
        setShareMessage('Odkaz zkopírován do schránky.');
      } else if (json?.url) {
        setShareMessage(json.url);
      }
    } catch (err: any) {
      console.error('Chyba při vytváření sdílecího odkazu:', err);
      setShareMessage('Nepodařilo se vytvořit odkaz.');
    } finally {
      setShareLoadingId(null);
    }
  };

  function handlePlayBeat(beat: BeatItem) {
    if (!beat.audio_url) {
      setPlayerMessage('Tento beat nemá nahraný audio soubor.');
      return;
    }
    setPlayerMessage(null);
    const trackId = `beat-${beat.id}`;
    // pokud kliknu na stejný beat, toggle play/pause
    if (gpCurrent?.id === trackId) {
      gpToggle();
      setCurrentBeat(beat);
      return;
    }
    setCurrentBeat(beat);
    startPlayerTrack({
      id: trackId,
      title: beat.title,
      artist: profile.display_name || 'Neznámý',
      url: beat.audio_url,
      cover_url: beat.cover_url ?? null,
      item_type: 'beat',
    });
  }

  const reorderList = <T,>(list: T[], fromIndex: number, toIndex: number) => {
    const next = [...list];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const persistBeatOrder = async (next: BeatItem[]) => {
    if (!userId) throw new Error('Missing userId');
    const updates = next.map((beat, index) =>
      supabase
        .from('beats')
        .update({ sort_order: index + 1 })
        .eq('id', beat.id)
        .eq('user_id', userId)
    );
    const results = await Promise.all(updates);
    const error = results.find((res) => res.error)?.error;
    if (error) throw error;
  };

  const persistProjectOrder = async (next: ProjectItem[]) => {
    if (!userId) throw new Error('Missing userId');
    const updates = next.map((project, index) =>
      supabase
        .from('projects')
        .update({ sort_order: index + 1 })
        .eq('id', project.id)
        .eq('user_id', userId)
    );
    const error = (await Promise.all(updates)).find((res) => res.error)?.error;
    if (error) throw error;
  };

  const handleBeatDrop = async (targetId: number) => {
    if (dragBeatId === null || dragBeatId === targetId) return;
    const fromIndex = beats.findIndex((beat) => beat.id === dragBeatId);
    const toIndex = beats.findIndex((beat) => beat.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = reorderList(beats, fromIndex, toIndex);
    setBeats(next);
    setDragBeatId(null);
    setDragOverBeatId(null);
    try {
      await persistBeatOrder(next);
      setBeatsOrderSaved(true);
      window.setTimeout(() => setBeatsOrderSaved(false), 2000);
    } catch (err: any) {
      console.error('Chyba při ukládání pořadí beatů:', err);
      const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
      if (message.includes('sort_order')) {
        setBeatsError('Nepodařilo se uložit pořadí beatů. Chybí sloupec sort_order v DB.');
      } else {
        setBeatsError('Nepodařilo se uložit pořadí beatů.');
      }
    }
  };

  const handleProjectDrop = async (targetId: string) => {
    if (!dragProjectId || dragProjectId === targetId) return;
    const fromIndex = projects.findIndex((project) => project.id === dragProjectId);
    const toIndex = projects.findIndex((project) => project.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = reorderList(projects, fromIndex, toIndex);
    setProjects(next);
    setDragProjectId(null);
    setDragOverProjectId(null);
    try {
      await persistProjectOrder(next);
      setProjectsOrderSaved(true);
      window.setTimeout(() => setProjectsOrderSaved(false), 2000);
    } catch (err: any) {
      console.error('Chyba při ukládání pořadí projektů:', err);
      const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
      if (message.includes('sort_order')) {
        setProjectsError('Nepodařilo se uložit pořadí projektů. Chybí sloupec sort_order v DB.');
      } else {
        setProjectsError('Nepodařilo se uložit pořadí projektů.');
      }
    }
  };

  function handlePlayAcapella(item: AcapellaItem) {
    if (!item.audio_url) {
      setPlayerMessage('Tato akapela nemá nahraný audio soubor.');
      return;
    }
    setPlayerMessage(null);
    const trackId = `acapella-${item.id}`;
    if (gpCurrent?.id === trackId) {
      gpToggle();
      setCurrentAcapella(item);
      return;
    }
    setCurrentAcapella(item);
    startPlayerTrack({
      id: trackId,
      title: item.title,
      artist: profile.display_name || 'Neznámý',
      url: item.audio_url,
      cover_url: item.cover_url ?? null,
      item_type: 'acapella',
    });
  }

  function startEditAcapella(item: AcapellaItem) {
    setEditingAcapellaId(item.id);
    setEditAcapellaTitle(item.title || '');
    setEditAcapellaBpm(item.bpm ? String(item.bpm) : '');
    setEditAcapellaMood(item.mood || '');
    setEditAcapellaCoverUrl(item.cover_url || '');
    setEditAcapellaCoverFile(null);
    setEditAcapellaAccess((item.access_mode as any) || 'public');
    setOpenAcapellaMenuId(null);
  }

  async function handleSaveAcapella() {
    if (!editingAcapellaId || !userId) return;
    setAcapellaSaving(true);
    try {
      let coverUrl = editAcapellaCoverUrl.trim() || null;
      if (editAcapellaCoverFile) {
        const safe = editAcapellaCoverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${userId}/acapellas/covers/${Date.now()}-${safe}`;
        const coverToUpload = await resizeImageFile(editAcapellaCoverFile, { maxSize: 420, quality: 0.75 });
        const { error: uploadErr } = await supabase.storage.from('acapella_covers').upload(path, coverToUpload, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: pub } = supabase.storage.from('acapella_covers').getPublicUrl(path);
        coverUrl = pub.publicUrl;
      }

      const payload: Partial<AcapellaItem> = {
        title: editAcapellaTitle.trim() || 'Untitled',
        bpm: editAcapellaBpm ? Number(editAcapellaBpm) : null,
        mood: editAcapellaMood.trim() || null,
        cover_url: coverUrl,
        access_mode: editAcapellaAccess,
      };

      const { error } = await supabase
        .from('acapellas')
        .update(payload)
        .eq('id', editingAcapellaId)
        .eq('user_id', userId);
      if (error) throw error;

      setAcapellas((prev) =>
        prev.map((a) =>
          a.id === editingAcapellaId
            ? { ...a, ...payload }
            : a
        )
      );
      setEditingAcapellaId(null);
      setEditAcapellaCoverFile(null);
    } catch (err) {
      console.error('Chyba při ukládání akapely:', err);
      setPlayerMessage('Nepodařilo se uložit akapelu.');
    } finally {
      setAcapellaSaving(false);
    }
  }

  async function handleDeleteAcapella(id: number) {
    if (!userId || !confirm('Opravdu smazat tuto akapelu?')) return;
    setDeletingAcapellaId(id);
    try {
      const { error } = await supabase.from('acapellas').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      setAcapellas((prev) => prev.filter((a) => a.id !== id));
      if (editingAcapellaId === id) {
        setEditingAcapellaId(null);
      }
      setOpenAcapellaMenuId(null);
    } catch (err) {
      console.error('Chyba při mazání akapely:', err);
      setPlayerMessage('Nepodařilo se smazat akapelu.');
    } finally {
      setDeletingAcapellaId(null);
    }
  }

  const handleUpdateAcapellaAccess = async (id: number, mode: 'public' | 'request' | 'private') => {
    if (!userId) return;
    setUpdatingAcapellaAccessId(id);
    // Optimisticky přepni, aby se odznak hned přepsal
    const prev = acapellas;
    setAcapellas((prevList) => prevList.map((a) => (a.id === id ? { ...a, access_mode: mode } : a)));
    setOpenAcapellaMenuId(null);
    try {
      const { error } = await supabase
        .from('acapellas')
        .update({ access_mode: mode })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (err) {
      console.error('Chyba při změně přístupu akapely:', err);
      // vrať původní stav při chybě
      setAcapellas(prev);
      setPlayerMessage('Nepodařilo se uložit přístup akapely.');
    } finally {
      setUpdatingAcapellaAccessId(null);
    }
  };

  async function handleDeleteBeat(id: number) {
    if (!confirm('Opravdu smazat tento beat?')) return;
    try {
      const { error } = await supabase.from('beats').delete().eq('id', id);
      if (error) throw error;
      setBeats((prev) => prev.filter((b) => b.id !== id));
      if (editingBeatId === id) {
        setEditingBeatId(null);
      }
    } catch (err) {
      console.error('Chyba při mazání beatu:', err);
      setPlayerMessage('Nepodařilo se smazat beat.');
    }
  }

  function seekBeat(beat: BeatItem, clientX: number, width: number) {
    if (!currentBeat || currentBeat.id !== beat.id || !gpDuration) return;
    const ratio = Math.min(Math.max(clientX / width, 0), 1);
    gpSeek(ratio);
  }

  function startEditBeat(beat: BeatItem) {
    setEditingBeatId(beat.id);
    setEditTitle(beat.title || '');
    setEditBpm(beat.bpm ? String(beat.bpm) : '');
    setEditMood(beat.mood || '');
    setEditCoverUrl(beat.cover_url || '');
  }

  async function handleSaveBeat() {
    if (!editingBeatId) return;
    try {
      let coverUrl = editCoverUrl.trim() || null;
      // Pokud je nahrán nový soubor, nahraj ho do bucketu beats
      if (editCoverFile) {
        const safe = editCoverFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${userId}/beats/covers/${Date.now()}-${safe}`;
        const coverToUpload = await resizeImageFile(editCoverFile, { maxSize: 420, quality: 0.75 });
        const { error: uploadErr } = await supabase.storage.from('beats').upload(path, coverToUpload, { upsert: true });
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

  function seekAcapella(item: AcapellaItem, clientX: number, width: number) {
    if (!currentAcapella || currentAcapella.id !== item.id || !gpDuration) return;
    const ratio = Math.min(Math.max(clientX / width, 0), 1);
    gpSeek(ratio);
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
      await sendNotificationSafe(supabase, {
        user_id: req.requester_id,
        type: approve ? 'project_request_approved' : 'project_request_denied',
        title: approve ? 'Žádost schválena' : 'Žádost zamítnuta',
        body: `Žádost o přístup k ${req.project_title || 'projektu'} byla ${approve ? 'schválena' : 'zamítnuta'}.`,
        item_type: 'project',
        item_id: String(req.project_id),
        senderId: userId,
        data: { from: profile.display_name || email || 'Neznámý', projectTitle: req.project_title || 'projekt' },
      });
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

  async function handleDeleteProject(id: string | number) {
    if (!confirm('Opravdu smazat tento projekt?')) return;
    const targetId = typeof id === 'string' ? Number(id) : id;
    if (!Number.isFinite(targetId)) {
      setPlayerMessage('Neplatné ID projektu.');
      return;
    }
    try {
      const { error } = await supabase.from('projects').delete().eq('id', targetId).eq('user_id', userId);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => String(p.id) !== String(id)));
      if (editingProject?.id && String(editingProject.id) === String(id)) {
        setEditingProject(null);
      }
    } catch (err) {
      console.error('Chyba při mazání projektu:', err);
      setPlayerMessage('Nepodařilo se smazat projekt.');
    }
  }

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

  const handleTogglePostPublished = async (postId: number, published: boolean) => {
    try {
      const { error } = await supabase.from('posts').update({ published }).eq('id', postId);
      if (error) throw error;
      setMyPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, published } : p))
      );
      setMyPostsError(null);
    } catch (err) {
      console.error('Chyba při změně publikace:', err);
      setMyPostsError('Nepodařilo se změnit publikaci článku.');
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

      // Zabráníme duplicitnímu vláknu mezi stejnou dvojicí uživatelů.
      const [{ data: myThreads, error: myErr }, { data: partnerThreads, error: partnerThreadsErr }] = await Promise.all([
        supabase.from('collab_participants').select('thread_id').eq('user_id', userId),
        supabase.from('collab_participants').select('thread_id').eq('user_id', partner.id),
      ]);
      if (myErr) throw myErr;
      if (partnerThreadsErr) throw partnerThreadsErr;
      const mySet = new Set((myThreads ?? []).map((r: any) => r.thread_id));
      const existing = (partnerThreads ?? []).find((r: any) => mySet.has(r.thread_id));
      if (existing?.thread_id) {
        setCollabThreadsError('Spolupráce s tímto uživatelem už existuje.');
        setSelectedThreadId(existing.thread_id);
        setShowNewThreadForm(false);
        setCreatingThread(false);
        return;
      }

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

      // Notifikace pro partnera
      const ownerName = profile.display_name || 'Ty';
      await sendNotificationSafe(supabase, {
        user_id: partner.id,
        type: 'collab_created',
        title: 'Nová spolupráce',
        body: newThreadTitle.trim(),
        item_type: 'collab_thread',
        item_id: threadId,
        senderId: userId,
        data: { from: ownerName, threadTitle: newThreadTitle.trim(), partnerName: partner.display_name || 'Spolupracovník' },
      });

      const partnerName = partner.display_name?.trim() || newThreadPartner.trim() || 'Partner';
      const participants = Array.from(new Set([ownerName, partnerName].filter(Boolean)));
      setCollabThreads((prev) => [
        {
          id: threadId,
          title: newThreadTitle.trim(),
          status: 'pending',
          updated_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          participants,
          creator_id: userId,
        },
        ...prev,
      ]);
      setNewThreadTitle('');
      setNewThreadPartner('');
      setShowNewThreadForm(false);
      setSelectedThreadId(threadId);
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
          .select('id, body, user_id, created_at')
          .eq('thread_id', selectedThreadId)
          .order('created_at', { ascending: true });
        if (msgErr) throw msgErr;
        const normalized = ((msgs as any[]) ?? []).map((m) => ({
          id: m.id,
          body: m.body,
          user_id: m.user_id,
          created_at: m.created_at,
          author_name: undefined as string | null | undefined,
        }));
        const userIds = Array.from(
          new Set(normalized.map((m) => m.user_id).filter(Boolean))
        ) as string[];
        let nameMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles, error: profileErr } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds);
          if (profileErr) throw profileErr;
          if (profiles) {
            nameMap = Object.fromEntries(
              (profiles as any[]).map((p) => [p.id, p.display_name || ''])
            );
          }
        }
        setCollabMessages(
          normalized.map((msg) => ({
            ...msg,
            author_name:
              nameMap[msg.user_id] ||
              (msg.user_id === userId ? profile.display_name || 'Ty' : null),
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
  }, [profile?.display_name, selectedThreadId, supabase, userId]);

  const handleSendCollabMsg = async () => {
    if (!selectedThreadId || !collabMessageBody.trim() || !userId) return;
    setSendingCollabMessage(true);
    try {
      // Ujisti se, že existuje vazba v collab_participants pro aktuálního uživatele,
      // jinak RLS nepustí insert do collab_messages.
      await supabase
        .from('collab_participants')
        .upsert({ thread_id: selectedThreadId, user_id: userId, role: 'guest' }, { onConflict: 'thread_id,user_id' });

      const { error } = await supabase.from('collab_messages').insert({
        thread_id: selectedThreadId,
        body: collabMessageBody.trim(),
        user_id: userId,
      });
      if (error) throw error;
      await supabase.from('collab_threads').update({ last_activity: new Date().toISOString() }).eq('id', selectedThreadId);
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
        prev.map((t) =>
          t.id === selectedThreadId ? { ...t, updated_at: new Date().toISOString(), last_activity: new Date().toISOString() } : t
        )
      );
      // Notifikace pro ostatní účastníky vlákna
      try {
        const { data: participants } = await supabase
          .from('collab_participants')
          .select('user_id')
          .eq('thread_id', selectedThreadId);
        const targets =
          (participants ?? [])
            .map((p: any) => p.user_id as string)
            .filter((uid) => uid && uid !== userId) || [];
        await Promise.all(
          targets.map((uid) =>
            sendNotificationSafe(supabase, {
              user_id: uid,
              type: 'collab_message',
              title: 'Nová zpráva ve spolupráci',
              body: collabMessageBody.trim(),
              item_type: 'collab_thread',
              item_id: selectedThreadId,
              senderId: userId,
              data: { from: profile.display_name || email || 'Neznámý' },
            })
          )
        );
      } catch (err) {
        console.error('Notifikace pro účastníky se nepodařila:', err);
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
      const safe = collabFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
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
      await supabase.from('collab_threads').update({ last_activity: new Date().toISOString() }).eq('id', selectedThreadId);
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

  const updateCollabStatus = async (threadId: string, status: 'active' | 'paused' | 'done' | 'cancelled' | 'rejected') => {
    if (!userId) return;
    const threadTitle = collabThreads.find((t) => t.id === threadId)?.title?.trim() || 'spolupráce';
    setCollabStatusUpdating(threadId);
    try {
      const { error } = await supabase.from('collab_threads').update({ status, last_activity: new Date().toISOString() }).eq('id', threadId);
      if (error) throw error;
      setCollabThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, status, updated_at: new Date().toISOString(), last_activity: new Date().toISOString() } : t
        )
      );
      // Notifikace druhé straně
      try {
        const { data: participants } = await supabase
          .from('collab_participants')
          .select('user_id')
          .eq('thread_id', threadId);
        const targets =
          (participants ?? [])
            .map((p: any) => p.user_id as string)
            .filter((uid) => uid && uid !== userId) || [];
        await Promise.all(
          targets.map((uid) =>
            sendNotificationSafe(supabase, {
              user_id: uid,
              type: status === 'active' ? 'collab_created' : 'collab_message',
              title:
                status === 'active'
                  ? 'Spolupráce potvrzena'
                  : status === 'paused'
                    ? 'Spolupráce pozastavena'
                    : status === 'done'
                      ? 'Spolupráce dokončena'
                      : status === 'cancelled'
                        ? 'Spolupráce ukončena'
                        : 'Spolupráce odmítnuta',
              body: `Status: ${status}`,
              item_type: 'collab_thread',
              item_id: threadId,
              senderId: userId,
              data: { from: profile.display_name || email || 'Uživatel', threadTitle },
            })
          )
        );
      } catch (notifyErr) {
        console.warn('Notifikace spolupráce se nepodařila:', notifyErr);
      }
    } catch (err) {
      console.error('Chyba při změně stavu spolupráce:', err);
      setPlayerMessage('Nepodařilo se změnit stav spolupráce.');
    } finally {
      setCollabStatusUpdating(null);
    }
  };

  const getThreadById = (id: string | null) => collabThreads.find((t) => t.id === id) || null;
  const getLastActivity = (thread: CollabThread | null) => thread?.last_activity || thread?.updated_at || null;
  const inactivityDays = (thread: CollabThread | null) => {
    const ts = getLastActivity(thread);
    if (!ts) return null;
    const diff = Date.now() - new Date(ts).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const saveMilestones = async (threadId: string, milestones: { id: string; title: string; due?: string | null; done?: boolean }[], deadline?: string | null) => {
    setSavingMilestone(true);
    try {
      const payload: any = { milestones };
      if (deadline !== undefined) payload.deadline = deadline || null;
      payload.last_activity = new Date().toISOString();
      const { error } = await supabase.from('collab_threads').update(payload).eq('id', threadId);
      if (error) throw error;
      setCollabThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, milestones, deadline: deadline || null, last_activity: payload.last_activity, updated_at: payload.last_activity }
            : t
        )
      );
    } catch (err) {
      console.error('Chyba při ukládání milníků:', err);
      setPlayerMessage('Nepodařilo se uložit milníky.');
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!selectedThreadId || !newMilestoneTitle.trim()) return;
    const thread = getThreadById(selectedThreadId);
    const list = Array.isArray(thread?.milestones) ? thread!.milestones! : [];
    const newItem = { id: crypto.randomUUID(), title: newMilestoneTitle.trim(), due: newMilestoneDue || null, done: false };
    await saveMilestones(selectedThreadId, [...list, newItem], thread?.deadline ?? null);
    setNewMilestoneTitle('');
    setNewMilestoneDue('');
  };

  const toggleMilestone = async (threadId: string, milestoneId: string) => {
    const thread = getThreadById(threadId);
    if (!thread || !Array.isArray(thread.milestones)) return;
    const updated = thread.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
    await saveMilestones(threadId, updated, thread.deadline ?? null);
  };

  const removeMilestone = async (threadId: string, milestoneId: string) => {
    const thread = getThreadById(threadId);
    if (!thread || !Array.isArray(thread.milestones)) return;
    const updated = thread.milestones.filter((m) => m.id !== milestoneId);
    await saveMilestones(threadId, updated, thread.deadline ?? null);
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    window.open(`https://meet.jit.si/${incomingCall.room_name}`, '_blank', 'noopener,noreferrer');
    try {
      await supabase
        .from('calls')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', incomingCall.id);
    } catch (err) {
      console.error('Chyba při označení hovoru jako přijatého:', err);
    } finally {
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

  const buildRoomName = (a: string, b: string) => {
    const sorted = [a, b].sort();
    return `beets-${sorted[0]}-${sorted[1]}`;
  };

  const handleStartCollabCall = async () => {
    if (!selectedThreadId || !userId) {
      setPlayerMessage('Vyber spolupráci a přihlas se.');
      return;
    }
    setStartingCollabCall(true);
    try {
      const { data: participants } = await supabase
        .from('collab_participants')
        .select('user_id')
        .eq('thread_id', selectedThreadId);
      const target = (participants ?? []).map((p: any) => p.user_id as string).find((uid) => uid && uid !== userId) || null;
      if (!target) {
        setPlayerMessage('Nenalezen druhý profil ve spolupráci.');
        return;
      }
      const roomName = buildRoomName(userId, target);
      const url = `https://meet.jit.si/${roomName}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      const { error } = await supabase
        .from('calls')
        .insert({
          room_name: roomName,
          caller_id: userId,
          callee_id: target,
          status: 'ringing',
        })
        .select('id')
        .single();
      if (error) throw error;
      await sendNotificationSafe(supabase, {
        user_id: target,
        type: 'call_incoming',
        title: 'Příchozí hovor',
        body: profile.display_name || 'Uživatel',
        item_type: 'call',
        item_id: selectedThreadId,
        senderId: userId,
        data: { from: profile.display_name || email || 'Uživatel', roomName },
      });
    } catch (err) {
      console.error('Chyba při zahájení hovoru:', err);
      setPlayerMessage('Nepodařilo se zahájit hovor.');
    } finally {
      setStartingCollabCall(false);
    }
  };

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
    if (!userId) throw new Error('Chybí přihlášený uživatel.');

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

    await sendNotificationSafe(supabase, {
      user_id: targetUserId,
      type: 'direct_message',
      title: payload.from_name || 'Nová zpráva',
      body: payload.body,
      item_type: 'message',
      item_id: created.id ? String(created.id) : undefined,
      senderId: userId,
      data: { from: payload.from_name, body: payload.body },
    });

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
      setExpandedThread(otherId);
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
    setMessageSuccess(null);
    try {
      const targetUserId = await resolveRecipientId(newMessage.to, newMessage.toUserId);
      await sendDirectMessage(targetUserId, newMessage.to.trim(), newMessage.body.trim());
      setNewMessage({ to: '', toUserId: '', body: '' });
      setExpandedThread(targetUserId);
      setMessageSuccess('Zpráva odeslána.');
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
    const coverToUpload = await resizeImageFile(file, { maxSize: 420, quality: 0.75 });
    const { error: uploadError } = await supabase.storage
      .from('blog_covers')
      .upload(path, coverToUpload, { cacheControl: '3600', upsert: true });
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

  // Beat preview používá globální přehrávač, lokální <audio> není potřeba

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

  const resetImportState = () => {
    setImportProjectUrl('');
    setImportMetadata(null);
    setImportTitle('');
    setImportArtist('');
    setImportError(null);
    setImportSuccess(null);
  };

  const coerceEmbedHtml = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const extracted = extractIframeHtml(trimmed);
    if (extracted) return extracted;
    const src = extractIframeSrc(trimmed) || extractIframeAnchorHref(trimmed) || trimmed;
    if (src.includes('open.spotify.com')) return buildSpotifyEmbed(src);
    if (src.includes('soundcloud.com')) return buildSoundcloudEmbed(src);
    if (src.includes('bandcamp.com')) return buildEmbedFromSrc(src);
    if (src.includes('music.apple.com') || src.includes('embed.music.apple.com')) return buildAppleEmbed(src);
    return '';
  };

  const buildEmbedFromUrl = (url: string) => {
    const provider = getEmbedProviderFromUrl(url);
    if (provider === 'Spotify') return buildSpotifyEmbed(url);
    if (provider === 'SoundCloud') return buildSoundcloudEmbed(url);
    if (provider === 'Apple Music') return buildAppleEmbed(url);
    return '';
  };

  const handleFetchImportMetadata = async () => {
    const trimmed = importProjectUrl.trim();
    const manualEmbedRaw = importEmbedHtml.trim();
    const manualEmbed = coerceEmbedHtml(manualEmbedRaw);
    if (!trimmed) {
      if (manualEmbed) {
        const src = extractIframeSrc(manualEmbed) || extractIframeSrc(manualEmbedRaw);
        const derivedLink = getProjectUrlFromEmbedHtml(manualEmbed);
        const provider = getEmbedProviderFromUrl(derivedLink || src);
        setImportMetadata({
          title: importTitle.trim() || getEmbedDefaultTitle(src),
          artist: importArtist.trim(),
          provider: provider || null,
          link: derivedLink || '',
          cover: null,
          embed_html: manualEmbed,
        });
        setImportError(null);
        setImportSuccess('Embed připraven.');
        return;
      }
      setImportError('Zadej URL z Spotify, SoundCloud nebo Bandcamp.');
      return;
    }
    setImportError(null);
    setImportSuccess(null);
    setImportMetadata(null);
    setImportLoading(true);
    try {
      const response = await fetch(`/api/external-metadata?url=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Nepodařilo se načíst metadata.');
      }
      const meta = (await response.json()) as ImportMetadata;
      const fallbackEmbed = meta.embed_html || buildEmbedFromUrl(trimmed);
      setImportMetadata({ ...meta, embed_html: meta.embed_html || fallbackEmbed || null });
      setImportTitle(meta.title || '');
      setImportArtist(meta.artist || '');
      if (fallbackEmbed) {
        setImportEmbedHtml(fallbackEmbed);
        setImportSuccess('Embed připraven.');
      }
    } catch (err: any) {
      const fallbackEmbed = buildEmbedFromUrl(trimmed);
      if (fallbackEmbed) {
        setImportMetadata({
          title: importTitle.trim() || getEmbedDefaultTitle(trimmed),
          artist: importArtist.trim(),
          provider: getEmbedProviderFromUrl(trimmed) || null,
          link: trimmed,
          cover: null,
          embed_html: fallbackEmbed,
        });
        setImportEmbedHtml(fallbackEmbed);
        setImportSuccess('Embed připraven.');
        setImportError(null);
      } else {
        setImportError(err?.message || 'Nepodařilo se načíst metadata.');
      }
    } finally {
      setImportLoading(false);
    }
  };

const buildSpotifyEmbed = (url: string) => {
  const normalized = url.replace('open.spotify.com/embed/', 'open.spotify.com/');
  const match = normalized.match(/open\.spotify\.com\/(album|track|playlist)\/([a-zA-Z0-9]+)/);
  if (!match) return '';
  const [, type, id] = match;
  const src = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
  return `<iframe data-testid="embed-iframe" style="border-radius:12px" src="${src}" width="100%" height="120" frameborder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
};

const buildSoundcloudEmbed = (url: string) => {
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true`;
  return `<iframe width="100%" height="120" scrolling="no" frameborder="no" allow="autoplay" src="${src}"></iframe>`;
};

const buildEmbedFromSrc = (src: string) => {
  if (!src) return '';
  return `<iframe style="border: 0; width: 100%; height: 152px;" src="${src}" seamless></iframe>`;
};

const buildAppleEmbed = (url: string) => {
  if (!url) return '';
  const src = url.includes('embed.music.apple.com')
    ? url
    : url.replace('music.apple.com', 'embed.music.apple.com');
  return buildEmbedFromSrc(src);
};

  const handleInsertEmbed = async (provider: 'spotify' | 'soundcloud' | 'bandcamp') => {
    const url = importProjectUrl.trim();
    if (!url) {
      setImportError('Nejdřív vlož odkaz na projekt.');
      return;
    }
    setImportError(null);
    try {
      const response = await fetch(`/api/external-metadata?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload?.embed_html) {
          setImportEmbedHtml(payload.embed_html);
          return;
        }
      }
    } catch {
      // ignore, fallback below
    }

    if (provider === 'spotify') {
      const html = buildSpotifyEmbed(url);
      if (!html) {
        setImportError('Neplatný Spotify odkaz.');
        return;
      }
      setImportEmbedHtml(html);
      return;
    }

    if (provider === 'soundcloud') {
      setImportEmbedHtml(buildSoundcloudEmbed(url));
      return;
    }

    setImportError('Bandcamp embed vlož prosím ručně.');
  };

  const handleImportProject = async () => {
    if (!userId) {
      setImportError('Nejsi přihlášený.');
      return;
    }
    const manualEmbed = coerceEmbedHtml(importEmbedHtml.trim());
    const derivedEmbedLink = manualEmbed
      ? getProjectUrlFromEmbedHtml(manualEmbed)
      : getProjectUrlFromEmbedHtml(importEmbedHtml.trim());
    const normalizedLink = importMetadata?.link
      ? normalizePurchaseUrl(importMetadata.link)
      : importProjectUrl.trim()
        ? normalizePurchaseUrl(importProjectUrl.trim())
        : null;
    if (!manualEmbed && !normalizedLink) {
      setImportError('Zadej URL projektu nebo vlož embed.');
      return;
    }
    const title = (importTitle || importMetadata?.title || '').trim();
    if (!title) {
      setImportError('Zadej název projektu.');
      return;
    }
    setImportSaving(true);
    setImportError(null);
    setImportSuccess(null);
    try {
      const descriptionParts = [];
      if (importArtist.trim()) descriptionParts.push(`Autor: ${importArtist.trim()}`);
      const providerName = importMetadata?.provider || getEmbedProviderFromUrl(derivedEmbedLink);
      if (providerName) descriptionParts.push(`Zdroj: ${providerName}`);
      const payload: Record<string, any> = {
        title,
        description: descriptionParts.length ? descriptionParts.join(' · ') : null,
        project_url: normalizedLink || normalizePurchaseUrl(derivedEmbedLink),
        tracks_json: [],
        user_id: userId,
        access_mode: 'public',
        release_formats: null,
        purchase_url: null,
        embed_html: manualEmbed || importMetadata?.embed_html || null,
      };
      if (importMetadata?.cover) {
        payload.cover_url = importMetadata.cover;
      }
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select('id, title, description, cover_url, project_url, tracks_json, access_mode, release_formats, purchase_url, embed_html')
        .single();
      if (error) throw error;
      if (data) {
        setProjects((prev) => [data as ProjectItem, ...prev]);
      }
      setImportProjectUrl('');
      setImportMetadata(null);
      setImportTitle('');
      setImportArtist('');
      setImportEmbedHtml('');
      setImportError(null);
      setImportSuccess('Projekt byl importován.');
      setImportProjectOpen(false);
    } catch (err: any) {
      setImportError(err?.message || 'Nepodařilo se projekt importovat.');
    } finally {
      setImportSaving(false);
    }
  };

  const activeCollabThread = selectedThreadId
    ? collabThreads.find((t) => t.id === selectedThreadId) ?? null
    : null;
  const activeCollabThreadLabel = activeCollabThread ? buildCollabLabel(activeCollabThread.participants) : '';
  const messagesInbox = (
    <>
      {(messagesLoading || messagesError || messageSuccess) && (
        <div className="mt-4 space-y-2">
          {messagesLoading && <p className="text-[11px] text-[var(--mpc-muted)]">Načítám…</p>}
          {messageSuccess && (
            <div className="rounded-md border border-green-700/50 bg-green-900/30 px-3 py-2 text-[11px] text-green-200">
              {messageSuccess}
            </div>
          )}
          {messagesError && (
            <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
              {messagesError}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex max-w-full flex-col gap-4 overflow-x-hidden md:grid md:min-h-0 md:h-[640px] md:max-h-[75vh] md:grid-cols-[320px_minmax(0,1fr)] lg:h-[680px]">
        <aside className="flex flex-col rounded-2xl border border-[var(--mpc-dark)] bg-gradient-to-b from-[var(--mpc-panel)] via-black/40 to-black/70 shadow-[0_22px_50px_rgba(0,0,0,0.55)] md:h-full md:min-h-0">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--mpc-dark)] bg-[linear-gradient(90deg,rgba(243,116,51,0.15),rgba(0,0,0,0))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--mpc-light)]">Kontakty</p>
              {directThreads.some((t) => t.unread) && (
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                  {directThreads.filter((t) => t.unread).length} nové
                </p>
              )}
            </div>
          </div>
          <div className="max-h-[50vh] flex-1 space-y-2 overflow-y-auto p-2 md:max-h-none">
            {directThreads.length === 0 && !messagesLoading && (
              <p className="px-2 py-3 text-[12px] text-[var(--mpc-muted)]">Žádné konverzace.</p>
            )}
            {directThreads.map((thread) => {
              const isActive = activeDmThreadId === thread.otherId;
              const initial = thread.otherName?.trim()?.charAt(0)?.toUpperCase() || '?';
              const avatarUrl = profileAvatarsById[thread.otherId] || '';
              return (
                <button
                  key={thread.otherId}
                  type="button"
                  onClick={() => setExpandedThread(thread.otherId)}
                  className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'border-[var(--mpc-accent)] bg-[linear-gradient(90deg,rgba(243,116,51,0.16),rgba(0,0,0,0.4))] shadow-[0_12px_30px_rgba(243,116,51,0.15)]'
                      : 'border-transparent hover:border-[var(--mpc-dark)] hover:bg-black/40'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold ${
                      isActive
                        ? 'border-[var(--mpc-accent)]/70 bg-black/60 text-[var(--mpc-light)]'
                        : 'border-[var(--mpc-dark)] bg-black/40 text-[var(--mpc-light)]'
                    }`}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={thread.otherName} className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--mpc-light)]">{thread.otherName}</p>
                      <span className="text-[10px] text-[var(--mpc-muted)]">
                        {formatRelativeTime(new Date(thread.lastTs).toISOString())}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[var(--mpc-muted)]">{thread.lastMessage || '—'}</p>
                  </div>
                  {thread.unread && (
                    <span className="rounded-full bg-[var(--mpc-accent)]/20 px-2 py-[2px] text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)]">
                      Nové
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-[var(--mpc-dark)] p-3">
            <button
              type="button"
              onClick={() => setOpenSections((prev) => ({ ...prev, messages: !prev.messages }))}
              className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.45)]"
            >
              {openSections.messages ? 'Skrýt formulář' : 'Nová zpráva'}
            </button>
            {openSections.messages && (
              <form
                onSubmit={handleSendDirectMessage}
                className="mt-3 space-y-3 rounded-xl border border-[var(--mpc-dark)] bg-black/50 p-3 shadow-[0_12px_26px_rgba(0,0,0,0.35)]"
              >
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Komu
                  </label>
                  <input
                    type="text"
                    value={newMessage.to}
                    onChange={(e) => setNewMessage((prev) => ({ ...prev, to: e.target.value, toUserId: '' }))}
                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/80 px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                    placeholder="Začni psát jméno profilu…"
                  />
                  {userSuggestionsLoading && (
                    <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">Hledám uživatele…</p>
                  )}
                  {!userSuggestionsLoading && userSuggestions.length > 0 && (
                    <div className="mt-2 space-y-1 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-2 text-[11px]">
                      {userSuggestions.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setNewMessage((prev) => ({
                              ...prev,
                              to: u.display_name || '',
                              toUserId: u.id,
                            }))
                          }
                          className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-white/5"
                        >
                          <span className="text-[var(--mpc-light)]">{u.display_name || 'Bez jména'}</span>
                          <span className="text-[var(--mpc-muted)]">{u.id.slice(0, 6)}…</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Zpráva
                  </label>
                  <textarea
                    value={newMessage.body}
                    onChange={(e) => setNewMessage((prev) => ({ ...prev, body: e.target.value }))}
                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/80 px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                    rows={3}
                    placeholder="Napiš zprávu…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.body.trim() || !newMessage.to.trim()}
                  className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_rgba(243,116,51,0.4)] disabled:opacity-60"
                >
                  {sendingMessage ? 'Odesílám…' : 'Odeslat'}
                </button>
              </form>
            )}
          </div>
        </aside>

        <section className="flex flex-col overflow-hidden rounded-2xl border border-[var(--mpc-dark)] bg-[linear-gradient(180deg,rgba(6,10,14,0.9),rgba(0,0,0,0.85))] shadow-[0_22px_50px_rgba(0,0,0,0.55)] md:h-full md:min-h-0">
          {activeDmThread ? (
            <>
              <div className="flex flex-col gap-2 border-b border-[var(--mpc-dark)] bg-[linear-gradient(90deg,rgba(243,116,51,0.12),rgba(0,0,0,0))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--mpc-light)]">{activeDmThread.otherName}</p>
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    {activeDmThread.unread ? 'Nové zprávy' : 'Historie konverzace'}
                  </p>
                </div>
                <span className="text-[10px] text-[var(--mpc-muted)]">
                  {formatRelativeTime(new Date(activeDmThread.lastTs).toISOString())}
                </span>
              </div>

              <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-5">
                {hiddenDmCount > 0 && (
                  <div className="mb-3 rounded-full border border-[var(--mpc-accent)]/30 bg-black/50 px-3 py-1 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                    Zobrazeno posledních 40 zpráv · Skryto {hiddenDmCount}
                  </div>
                )}
                <div className="space-y-3 min-w-0">
                  {visibleDmMessages.map((m) => {
                    const isMe = m.user_id === userId;
                    const author =
                      m.user_id === userId
                        ? 'Ty'
                        : profilesById[m.user_id || ''] || m.from_name || 'Neznámý';
                    return (
                      <div key={m.id} className={`flex min-w-0 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`w-auto max-w-[85%] min-w-0 rounded-2xl border px-4 py-2 text-[12px] leading-relaxed shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:max-w-[72%] ${
                            isMe
                              ? 'border-[var(--mpc-accent)]/60 bg-[linear-gradient(135deg,rgba(243,116,51,0.26),rgba(243,116,51,0.08))] text-[var(--mpc-light)]'
                              : 'border-white/10 bg-[linear-gradient(135deg,rgba(17,24,32,0.95),rgba(0,0,0,0.75))] text-[var(--mpc-light)]'
                          }`}
                        >
                          <div className="text-[10px] text-[var(--mpc-muted)]">
                            {author} · {formatRelativeTime(m.created_at)}
                          </div>
                          <p className="mt-1 whitespace-pre-line break-all min-w-0">{m.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[var(--mpc-dark)] bg-black/40 px-4 py-3 sm:px-5 sm:py-4">
                <textarea
                  className="w-full appearance-none rounded-2xl border border-white/40 bg-[#3a3a3a] px-4 py-3 text-sm text-white shadow-[0_10px_24px_rgba(0,0,0,0.35)] placeholder:text-white/60 focus:border-white/70 focus:outline-none"
                  rows={3}
                  placeholder="Napiš odpověď…"
                  value={threadReplies[activeDmThread.otherId] || ''}
                  onChange={(e) =>
                    setThreadReplies((prev) => ({ ...prev, [activeDmThread.otherId]: e.target.value }))
                  }
                />
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => void handleThreadReply(activeDmThread.otherId, activeDmThread.otherName)}
                    disabled={sendingMessage || !(threadReplies[activeDmThread.otherId]?.trim())}
                    className="rounded-full bg-[var(--mpc-accent)] px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.45)] disabled:opacity-60"
                  >
                    {sendingMessage ? 'Odesílám…' : 'Odeslat'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--mpc-muted)]">
              Vyber konverzaci vlevo.
            </div>
          )}
        </section>
      </div>
    </>
  );
  const incomingCallOverlay = incomingCall ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--mpc-accent)]/60 bg-[var(--mpc-panel)] p-5 text-sm text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Příchozí hovor</p>
        <p className="mt-1 text-base font-semibold">{incomingCallerName || 'Uživatel'} volá…</p>
        <p className="mt-1 text-[12px] text-[var(--mpc-muted)]">Chceš hovor přijmout?</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={acceptIncomingCall}
            className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
          >
            Přijmout
          </button>
          <button
            onClick={declineIncomingCall}
            className="rounded-full border border-white/25 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.16em] text-white hover:border-red-400 hover:text-red-200"
          >
            Položit
          </button>
        </div>
      </div>
    </div>
  ) : null;
  const collabsSection = (
    <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5" id="collabs">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
            {t('profile.collabs.title', 'Spolupráce')}
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
            {collabThreads.length} {t('profile.collabs.count', 'spoluprací')}
          </p>
          <p className="text-[11px] text-[var(--mpc-muted)]">
            Aktivní: {collabSummary.active} · Čeká: {collabSummary.pending} · Dokončené: {collabSummary.done} · Ukončené: {collabSummary.cancelled}
          </p>
        </div>
        <button
          onClick={() => setShowNewThreadForm((prev) => !prev)}
          className="w-full rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white sm:w-auto"
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

      <div className="mt-5 flex flex-col gap-4 md:grid md:min-h-0 md:h-[640px] md:max-h-[75vh] md:grid-cols-[320px_minmax(0,1fr)] lg:h-[680px]">
        <aside className="flex flex-col rounded-2xl border border-[var(--mpc-dark)] bg-gradient-to-b from-[var(--mpc-panel)] via-black/40 to-black/70 shadow-[0_22px_50px_rgba(0,0,0,0.55)] md:h-full md:min-h-0">
          <div className="flex items-center justify-between rounded-t-2xl border-b border-[var(--mpc-dark)] bg-[linear-gradient(90deg,rgba(243,116,51,0.15),rgba(0,0,0,0))] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[var(--mpc-light)]">Vlákna</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {collabThreads.length} {t('profile.collabs.count', 'spoluprací')}
              </p>
            </div>
          </div>
          <div className="max-h-[50vh] flex-1 space-y-2 overflow-y-auto p-2 md:max-h-none">
            {collabThreadsLoading ? (
              <p className="px-2 py-3 text-[12px] text-[var(--mpc-muted)]">Načítám spolupráce…</p>
            ) : collabThreads.length === 0 ? (
              <p className="px-2 py-3 text-[12px] text-[var(--mpc-muted)]">Zatím žádná vlákna. Založ novou spolupráci.</p>
            ) : (
              collabThreads.map((thread) => {
                const isActive = thread.id === selectedThreadId;
                const displayTitle = thread.partner_name || thread.title || 'Spolupráce';
                const avatarUrl = thread.partner_avatar || '';
                const initial = displayTitle.trim().charAt(0).toUpperCase() || '?';
                const card = (
                  <div
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      isActive
                        ? 'border-[var(--mpc-accent)] bg-[linear-gradient(90deg,rgba(243,116,51,0.16),rgba(0,0,0,0.4))] shadow-[0_12px_30px_rgba(243,116,51,0.15)]'
                        : 'border-transparent hover:border-[var(--mpc-dark)] hover:bg-black/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-black/40 text-sm font-semibold text-[var(--mpc-light)]">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt={displayTitle} className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-[var(--mpc-light)]">{displayTitle}</p>
                          <span className="text-[10px] text-[var(--mpc-muted)]">
                            {formatRelativeTime(thread.updated_at)}
                          </span>
                        </div>
                        <span
                          className={`mt-2 inline-flex rounded-full border px-2 py-[2px] text-[10px] uppercase tracking-[0.12em] ${
                            thread.status === 'active'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                              : thread.status === 'pending'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                                : thread.status === 'paused'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                                  : thread.status === 'done'
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : 'border-red-500/40 bg-red-500/10 text-red-100'
                          }`}
                        >
                          {thread.status === 'active'
                            ? 'Aktivní'
                            : thread.status === 'pending'
                              ? 'Čeká'
                              : thread.status === 'paused'
                                ? 'Pozastavená'
                                : thread.status === 'done'
                                  ? 'Dokončená'
                                  : thread.status === 'cancelled'
                                    ? 'Ukončená'
                                    : 'Odmítnuto'}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                if (view === 'collabs') {
                  return (
                    <Link key={thread.id} href={`/collabs?thread=${thread.id}`} className="block">
                      {card}
                    </Link>
                  );
                }

                return (
                  <button type="button" key={thread.id} onClick={() => setSelectedThreadId(thread.id)}>
                    {card}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex flex-col rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] text-sm text-[var(--mpc-light)] shadow-[0_22px_50px_rgba(0,0,0,0.45)] md:h-full md:min-h-0">
          {!activeCollabThread ? (
            <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--mpc-muted)]">
              Vyber vlákno vlevo.
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-col gap-2 border-b border-[var(--mpc-dark)] bg-[linear-gradient(90deg,rgba(243,116,51,0.15),rgba(0,0,0,0))] px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold">{activeCollabThreadLabel}</p>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                    Status:{' '}
                    {activeCollabThread.status === 'active'
                      ? 'Aktivní'
                      : activeCollabThread.status === 'pending'
                        ? 'Čeká na potvrzení'
                        : activeCollabThread.status === 'paused'
                          ? 'Pozastavená'
                          : activeCollabThread.status === 'done'
                            ? 'Dokončená'
                            : activeCollabThread.status === 'cancelled'
                              ? 'Ukončená'
                              : 'Odmítnuto'}
                  </p>
                </div>
                <p className="text-[11px] text-[var(--mpc-muted)]">
                  Aktualizováno {formatRelativeTime(activeCollabThread.updated_at)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-[11px] text-[var(--mpc-muted)]">
                <span>Poslední aktivita: {formatRelativeTime(getLastActivity(activeCollabThread))}</span>
                {activeCollabThread.deadline && (
                  <span>Deadline: {new Date(activeCollabThread.deadline).toLocaleDateString('cs-CZ')}</span>
                )}
              </div>

              {activeCollabThread.status === 'pending' && activeCollabThread.creator_id !== userId && (
                <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
                  <span className="text-[11px] text-[var(--mpc-muted)]">Čeká na potvrzení</span>
                  <button
                    onClick={() => void updateCollabStatus(activeCollabThread.id, 'active')}
                    disabled={collabStatusUpdating === activeCollabThread.id}
                    className="rounded-full bg-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                  >
                    {collabStatusUpdating === activeCollabThread.id ? 'Ukládám…' : 'Potvrdit'}
                  </button>
                  <button
                    onClick={() => void updateCollabStatus(activeCollabThread.id, 'rejected')}
                    disabled={collabStatusUpdating === activeCollabThread.id}
                    className="rounded-full border border-red-400 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    Odmítnout
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
                <button
                  onClick={() => void handleStartCollabCall()}
                  disabled={startingCollabCall}
                  className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
                >
                  {startingCollabCall ? 'Vytvářím hovor…' : 'Zahájit hovor'}
                </button>
              </div>

              <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3 py-4 pr-1 max-h-[60vh] md:px-4 md:max-h-none">
                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[12px] text-[var(--mpc-light)] font-semibold">
                      Aktivity
                      {Array.isArray(activeCollabThread.milestones) && activeCollabThread.milestones.length > 0 && (
                        <span className="text-[11px] text-[var(--mpc-muted)]">
                          {activeCollabThread.milestones.filter((m) => m.done).length}/{activeCollabThread.milestones.length} splněno
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <label className="text-[var(--mpc-muted)]">Deadline:</label>
                      <input
                        type="date"
                        value={activeCollabThread.deadline ? activeCollabThread.deadline.slice(0, 10) : ''}
                        onChange={(e) =>
                          void saveMilestones(activeCollabThread.id, activeCollabThread.milestones || [], e.target.value || null)
                        }
                        className="rounded border border-[var(--mpc-dark)] bg-black/60 px-2 py-1 text-[11px] text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {(activeCollabThread.milestones || []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded border border-[var(--mpc-dark)] bg-black/40 px-3 py-2 text-[12px]">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!m.done}
                            onChange={() => void toggleMilestone(activeCollabThread.id, m.id)}
                            className="h-4 w-4"
                          />
                          <div>
                            <p className="text-[var(--mpc-light)]">{m.title}</p>
                            {m.due && (
                              <p className="text-[11px] text-[var(--mpc-muted)]">Do: {new Date(m.due).toLocaleDateString('cs-CZ')}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => void removeMilestone(activeCollabThread.id, m.id)}
                          className="text-[11px] text-red-300 hover:text-white"
                        >
                          Odebrat
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nová aktivita..."
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      className="flex-1 min-w-[180px] rounded border border-[var(--mpc-dark)] bg-black/60 px-3 py-2 text-sm text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                    />
                    <input
                      type="date"
                      value={newMilestoneDue}
                      onChange={(e) => setNewMilestoneDue(e.target.value)}
                      className="rounded border border-[var(--mpc-dark)] bg-black/60 px-2 py-2 text-sm text-white focus:border-[var(--mpc-accent)] focus:outline-none"
                    />
                    <button
                      onClick={() => void handleAddMilestone()}
                      disabled={savingMilestone || !newMilestoneTitle.trim()}
                      className="rounded-full border border-[var(--mpc-accent)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
                    >
                      {savingMilestone ? 'Ukládám…' : 'Přidat'}
                    </button>
                  </div>
                  {inactivityDays(activeCollabThread) !== null &&
                    inactivityDays(activeCollabThread)! >= 7 &&
                    activeCollabThread.status === 'active' && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
                        <span>Partner nereagoval {inactivityDays(activeCollabThread)} dní.</span>
                        <button
                          onClick={async () => {
                            try {
                              const { data: participants } = await supabase
                                .from('collab_participants')
                                .select('user_id')
                                .eq('thread_id', activeCollabThread.id);
                              const targets =
                                (participants ?? [])
                                  .map((p: any) => p.user_id as string)
                                  .filter((uid) => uid && uid !== userId) || [];
                              await Promise.all(
                                targets.map((uid) =>
                                  sendNotificationSafe(supabase, {
                                    user_id: uid,
                                    type: 'collab_message',
                                    title: 'Připomenutí spolupráce',
                                    body: 'Reaguj prosím na spolupráci',
                                    item_type: 'collab_thread',
                                    item_id: activeCollabThread.id,
                                    senderId: userId,
                                    data: { from: profile.display_name || email || 'Uživatel' },
                                  })
                                )
                              );
                              setPlayerMessage('Připomenutí odesláno.');
                            } catch (err) {
                              console.error('Ping selhal:', err);
                              setPlayerMessage('Nepodařilo se odeslat připomenutí.');
                            }
                          }}
                          className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
                        >
                          Připomenout
                        </button>
                      </div>
                    )}
                </div>

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
                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
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
  );

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

  if (view === 'collabs') {
    return (
      <main className="relative min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(243,116,51,0.16),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.14),transparent_40%)]" />
        {incomingCallOverlay}
        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--mpc-light)]">Spolupráce</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Správa vlákna a aktivit</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/profile"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                Zpět na profil
              </Link>
            </div>
          </div>

          <div className="mt-5">{collabsSection}</div>
        </section>
      </main>
    );
  }

  if (view === 'messages') {
    return (
      <main className="relative min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(243,116,51,0.18),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.16),transparent_40%)]" />
        {incomingCallOverlay}
        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--mpc-light)]">Zprávy</h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Soukromé konverzace</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/profile"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                Zpět na profil
              </Link>
            </div>
          </div>

          {messagesInbox}
        </section>
      </main>
    );
  }

  const forumSummaryItems = myForumThreads.length > 0 ? myForumThreads : myForumCategories;
  const forumSummaryCount = myForumThreads.length > 0 ? myForumThreads.length : myForumCategories.length;
  const showRightColumn = !['collabs', 'messages', 'forum', 'posts', 'beats', 'projects'].includes(activeTab);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
      {incomingCallOverlay}
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
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-24 sm:w-24 md:h-28 md:w-28">
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
                  <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-black/70 bg-black/75 px-4 py-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur sm:justify-start">
                    <span className="text-2xl font-black uppercase tracking-[0.12em] md:text-3xl">
                      {profile.display_name || 'Nový uživatel'}
                    </span>
                  </div>
                  {profile.hardware && (
                    <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur sm:justify-start">
                      <span className="text-[13px] font-semibold tracking-[0.08em]">
                        {t('profile.hardware', 'Hardware')}:
                      </span>
                      <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                        {profile.hardware}
                      </span>
                    </div>
                  )}
                  {(profile.seeking_signals?.length || profile.seeking_custom) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Hledám:</span>
                      {profile.seeking_signals?.map((opt) => (
                        <span
                          key={`seeking-${opt}`}
                          className="rounded-full border border-[var(--mpc-accent)]/70 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-accent)] shadow-[0_8px_18px_rgba(243,116,51,0.25)]"
                        >
                          {opt}
                        </span>
                      ))}
                      {profile.seeking_custom && (
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white">
                          {profile.seeking_custom}
                        </span>
                      )}
                    </div>
                  )}
                  {(profile.offering_signals?.length || profile.offering_custom) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Nabízím:</span>
                      {profile.offering_signals?.map((opt) => (
                        <span
                          key={`offering-${opt}`}
                          className="rounded-full border border-emerald-400/60 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200 shadow-[0_8px_18px_rgba(16,185,129,0.25)]"
                        >
                          {opt}
                        </span>
                      ))}
                      {profile.offering_custom && (
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
        </div>
      </section>

      {/* Tabs */}
      <section className="mt-3 border-b border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/60 py-3 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/60 bg-black/80 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:bg-black sm:w-auto sm:justify-start"
          >
            <span className="text-[14px]">←</span>
            <span>Zpět</span>
          </Link>
            <div className="hidden flex-wrap items-center gap-4 text-xs uppercase tracking-[0.15em] md:flex md:text-sm">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`pb-3 ${activeTab === 'all' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
              >
                {t('profile.tab.all', 'Vše')}
              </button>
              {!isMcOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('beats')}
                    className={`pb-3 ${activeTab === 'beats' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
                  >
                    {t('profile.tab.beats', 'Beaty')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className={`pb-3 ${activeTab === 'projects' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
                  >
                    {t('profile.tab.projects', 'Projekty')}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveTab(isMcOnly ? 'acapellas' : 'collabs')}
                className={`pb-3 ${activeTab === (isMcOnly ? 'acapellas' : 'collabs') ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
              >
                {isMcOnly ? t('profile.tab.acapellas', 'Akapely') : t('profile.tab.collabs', 'Spolupráce')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`pb-3 ${activeTab === 'messages' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
              >
                {t('profile.tab.messages', 'Zprávy')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('forum')}
                className={`pb-3 ${activeTab === 'forum' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
              >
                Moje fórum
              </button>
              {canWriteArticles && (
                <button
                  type="button"
                  onClick={() => setActiveTab('posts')}
                  className={`pb-3 ${activeTab === 'posts' ? 'text-[var(--mpc-light)] border-b-2 border-[var(--mpc-accent)] font-semibold' : 'text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]'}`}
                >
                  {t('profile.tab.posts', 'Moje články')}
                </button>
              )}
              {isAdmin && (
                <Link href="/admin" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
                  Admin
                </Link>
              )}
              {(isAdmin || !isMcOnly) && (
                <Link href="/stream" className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]">
                  {t('profile.tab.stream', 'Stream')}
                </Link>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setToolsOpen((prev) => !prev)}
                  className="pb-3 text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]"
                >
                  Nástroje
                </button>
                {toolsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-xl border border-white/10 bg-black/95 p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur">
                    {TOOL_GROUPS.map((group) => (
                      <div key={group.label} className="px-2 py-2">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mpc-muted)]">
                          {group.label}
                        </p>
                        <div className="mt-2 space-y-1">
                          {group.items.map((tool) => (
                            <Link
                              key={tool.href}
                              href={tool.href}
                              onClick={() => setToolsOpen(false)}
                              className="block py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]"
                            >
                              {tool.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <NotificationBell />
            </div>
            <button
              onClick={() => setTabsOpen((p) => !p)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:border-[var(--mpc-accent)] md:hidden sm:ml-auto sm:w-auto sm:justify-start"
            >
              Menu
              <span className="text-[13px]">{tabsOpen ? '▲' : '▼'}</span>
            </button>
          </div>
          {tabsOpen && (
            <div className="mt-3 grid gap-2 text-xs uppercase tracking-[0.14em] text-[var(--mpc-muted)] md:hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setTabsOpen(false);
                }}
                className={`rounded-lg border px-3 py-2 ${activeTab === 'all' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
              >
                {t('profile.tab.all', 'Vše')}
              </button>
              {!isMcOnly && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('beats');
                      setTabsOpen(false);
                    }}
                    className={`rounded-lg border px-3 py-2 ${activeTab === 'beats' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
                  >
                    {t('profile.tab.beats', 'Beaty')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('projects');
                      setTabsOpen(false);
                    }}
                    className={`rounded-lg border px-3 py-2 ${activeTab === 'projects' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
                  >
                    {t('profile.tab.projects', 'Projekty')}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab(isMcOnly ? 'acapellas' : 'collabs');
                  setTabsOpen(false);
                }}
                className={`rounded-lg border px-3 py-2 ${activeTab === (isMcOnly ? 'acapellas' : 'collabs') ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
              >
                {isMcOnly ? t('profile.tab.acapellas', 'Akapely') : t('profile.tab.collabs', 'Spolupráce')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('messages');
                  setTabsOpen(false);
                }}
                className={`rounded-lg border px-3 py-2 ${activeTab === 'messages' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
              >
                {t('profile.tab.messages', 'Zprávy')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('forum');
                  setTabsOpen(false);
                }}
                className={`rounded-lg border px-3 py-2 ${activeTab === 'forum' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
              >
                Moje fórum
              </button>
              {canWriteArticles && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('posts');
                    setTabsOpen(false);
                  }}
                  className={`rounded-lg border px-3 py-2 ${activeTab === 'posts' ? 'border-[var(--mpc-accent)] bg-black/40 text-[var(--mpc-light)]' : 'border-white/10 bg-black/30 hover:text-[var(--mpc-light)]'}`}
                >
                  {t('profile.tab.posts', 'Moje články')}
                </button>
              )}
              {isAdmin && (
                <Link href="/admin" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                  Admin
                </Link>
              )}
              {(isAdmin || !isMcOnly) && (
                <Link href="/stream" className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 hover:text-[var(--mpc-light)]">
                  {t('profile.tab.stream', 'Stream')}
                </Link>
              )}
              <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setToolsOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.24em] text-[var(--mpc-muted)]"
                >
                  Nástroje
                  <span className="text-[12px]">{toolsOpen ? '▲' : '▼'}</span>
                </button>
                {toolsOpen && (
                  <div className="mt-2 space-y-2">
                    {TOOL_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                          {group.label}
                        </p>
                        <div className="mt-1 flex flex-col gap-1">
                          {group.items.map((tool) => (
                            <Link
                              key={tool.href}
                              href={tool.href}
                              onClick={() => setToolsOpen(false)}
                              className="py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)] hover:text-[var(--mpc-light)]"
                            >
                              {tool.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <NotificationBell />
            </div>
          )}
        </div>
      </section>

      {/* Obsah */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8" id="feed">
        <div className={showRightColumn ? 'grid w-full min-w-0 gap-6 lg:grid-cols-[3fr,1fr]' : 'grid w-full min-w-0 gap-6'}>
          {/* Levý sloupec: releasy (na mobilu za akcemi) */}
          <div className={showRightColumn ? 'space-y-6 order-1' : 'space-y-6'}>
            {activeTab === 'all' && (
              <>
                {profileCompleteness.missing.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                    <p className="font-semibold">Doplň profil ({profileCompleteness.percent}% hotovo)</p>
                    <p className="text-[12px] text-amber-100/90">
                      Chybí: {profileCompleteness.missing.join(', ')}. Kompletní profil zvyšuje důvěru ve spolupracích.
                    </p>
                  </div>
                )}
                {!isMcOnly && (
                  <div className="max-w-full rounded-2xl border border-[var(--mpc-dark)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%),var(--mpc-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:p-6">
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold text-[var(--mpc-light)]">Přehled</h2>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--mpc-muted)]">Rychlý přístup</p>
                      </div>
                    </div>
                    <div className="grid min-w-0 gap-4 md:grid-cols-2">
                      <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-[var(--mpc-light)]">Moje beaty</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">{beats.length} beatů</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('beats')}
                              className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                            >
                              Zobrazit vše
                            </button>
                          </div>
                        </div>
                        {beats.length === 0 ? (
                          <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné beaty.</p>
                        ) : (
                          <div className="space-y-2">
                            {(overviewExpanded.beats ? beats : beats.slice(0, 3)).map((beat) => (
                              <div key={beat.id} className="flex items-center justify-between gap-3 text-[13px]">
                                <p className="truncate text-[var(--mpc-light)]">{beat.title}</p>
                                <span className="text-[11px] text-[var(--mpc-muted)]">
                                  {beat.bpm ? `${beat.bpm} BPM` : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {beats.length > 3 && (
                          <div className="mt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={() => toggleOverviewExpanded('beats')}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                              aria-label={overviewExpanded.beats ? 'Sbalit seznam beatů' : 'Rozbalit seznam beatů'}
                            >
                              <span className={`transition ${overviewExpanded.beats ? 'rotate-180' : ''}`}>▾</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-[var(--mpc-light)]">Moje projekty</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">{projects.length} projektů</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('projects')}
                              className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                            >
                              Zobrazit vše
                            </button>
                          </div>
                        </div>
                        {projects.length === 0 ? (
                          <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné projekty.</p>
                        ) : (
                          <div className="space-y-2">
                            {(overviewExpanded.projects ? projects : projects.slice(0, 3)).map((project) => (
                              <div key={project.id} className="flex items-center justify-between gap-3 text-[13px]">
                                <p className="truncate text-[var(--mpc-light)]">{project.title || 'Projekt'}</p>
                                <span className="text-[11px] text-[var(--mpc-muted)]">
                                  {project.access_mode === 'private'
                                    ? 'Soukromý'
                                    : project.access_mode === 'request'
                                      ? 'Na žádost'
                                      : 'Veřejný'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {projects.length > 3 && (
                          <div className="mt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={() => toggleOverviewExpanded('projects')}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                              aria-label={overviewExpanded.projects ? 'Sbalit seznam projektů' : 'Rozbalit seznam projektů'}
                            >
                              <span className={`transition ${overviewExpanded.projects ? 'rotate-180' : ''}`}>▾</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-6 grid min-w-0 gap-5 md:grid-cols-2">
                      {collabThreads.length > 0 && (
                        <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">Spolupráce</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">{collabThreads.length} aktivních vláken</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('collabs')}
                                className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                              >
                                Detail
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(overviewExpanded.collabs ? collabThreads : collabThreads.slice(0, 3)).map((thread) => (
                              <p key={thread.id} className="truncate text-sm text-[var(--mpc-light)]">
                                {buildCollabLabel(thread.participants)}
                              </p>
                            ))}
                          </div>
                          {collabThreads.length > 3 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleOverviewExpanded('collabs')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                                aria-label={overviewExpanded.collabs ? 'Sbalit seznam spoluprací' : 'Rozbalit seznam spoluprací'}
                              >
                                <span className={`transition ${overviewExpanded.collabs ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {directThreads.length > 0 && (
                        <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">Zprávy</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">{directThreads.length} konverzací</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('messages')}
                                className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                              >
                                Detail
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(overviewExpanded.messages ? directThreads : directThreads.slice(0, 3)).map((thread) => (
                              <p key={thread.otherId} className="truncate text-sm text-[var(--mpc-light)]">
                                {thread.otherName}: {thread.lastMessage || '—'}
                              </p>
                            ))}
                          </div>
                          {directThreads.length > 3 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleOverviewExpanded('messages')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                                aria-label={overviewExpanded.messages ? 'Sbalit seznam zpráv' : 'Rozbalit seznam zpráv'}
                              >
                                <span className={`transition ${overviewExpanded.messages ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {myAccessRequests.length > 0 && (
                        <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">Žádosti o přístup</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">{myAccessRequests.length} žádostí</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('projects')}
                                className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                              >
                                Detail
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(overviewExpanded.access ? myAccessRequests : myAccessRequests.slice(0, 3)).map((req) => (
                              <p key={req.id} className="truncate text-sm text-[var(--mpc-light)]">
                                {req.project_title || req.project_id}
                              </p>
                            ))}
                          </div>
                          {myAccessRequests.length > 3 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleOverviewExpanded('access')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                                aria-label={overviewExpanded.access ? 'Sbalit seznam žádostí' : 'Rozbalit seznam žádostí'}
                              >
                                <span className={`transition ${overviewExpanded.access ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {myPosts.length > 0 && (
                        <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">Moje články</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">{myPosts.length} článků</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('posts')}
                                className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                              >
                                Detail
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(overviewExpanded.posts ? myPosts : myPosts.slice(0, 3)).map((post) => (
                              <p key={post.id} className="truncate text-sm text-[var(--mpc-light)]">
                                {post.title}
                              </p>
                            ))}
                          </div>
                          {myPosts.length > 3 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleOverviewExpanded('posts')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                                aria-label={overviewExpanded.posts ? 'Sbalit seznam článků' : 'Rozbalit seznam článků'}
                              >
                                <span className={`transition ${overviewExpanded.posts ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {(myForumThreads.length > 0 || myForumCategories.length > 0) && (
                        <div className="group w-full min-w-0 max-w-full rounded-xl border border-[var(--mpc-dark)] bg-black/40 p-4 text-left transition hover:border-[var(--mpc-accent)] hover:bg-black/50 sm:p-5">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">Moje fórum</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">
                                {myForumThreads.length} vláken · {myForumCategories.length} kategorií
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('forum')}
                                className="w-full rounded-full border border-[var(--mpc-accent)]/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black sm:w-auto"
                              >
                                Detail
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {(overviewExpanded.forum ? forumSummaryItems : forumSummaryItems.slice(0, 3)).map((item) => (
                              <p key={item.id} className="truncate text-sm text-[var(--mpc-light)]">
                                {'title' in item ? item.title : item.name}
                              </p>
                            ))}
                          </div>
                          {forumSummaryCount > 3 && (
                            <div className="mt-3 flex justify-center">
                              <button
                                type="button"
                                onClick={() => toggleOverviewExpanded('forum')}
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:h-8 sm:w-8"
                                aria-label={overviewExpanded.forum ? 'Sbalit seznam fóra' : 'Rozbalit seznam fóra'}
                              >
                                <span className={`transition ${overviewExpanded.forum ? 'rotate-180' : ''}`}>▾</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {activeTab === 'messages' && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--mpc-light)]">{t('profile.messages.title', 'Zprávy')}</h3>
                    {directThreads.some((t) => t.unread) && (
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        {directThreads.filter((t) => t.unread).length} {t('profile.messages.new', 'nové')}
                      </p>
                    )}
                  </div>
                  <Link
                    href="/messages"
                    className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] sm:w-auto"
                  >
                    Otevřít inbox
                  </Link>
                </div>
                {messagesInbox}
              </div>
            )}
            {isMcOnly && activeTab === 'acapellas' && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5" id="acapellas">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--mpc-light)]">Moje akapely</h2>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{acapellas.length} {t('profile.items', 'položek')}</p>
                  </div>
                </div>
                {acapellasError && (
                  <div className="mb-2 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                    {acapellasError}
                  </div>
                )}
                {acapellas.length === 0 ? (
                  <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-6 text-sm text-[var(--mpc-muted)]">
                    Zatím žádné akapely. Nahraj první akapelu a ukaž se.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {acapellas.map((item) => {
                      const trackId = `acapella-${item.id}`;
                      const isCurrent = currentAcapella?.id === item.id && gpCurrent?.id === trackId;
                      const progressPct = isCurrent && gpDuration ? `${Math.min((gpTime / gpDuration) * 100, 100)}%` : '0%';
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3 text-sm text-[var(--mpc-light)] transition hover:border-[var(--mpc-accent)]"
                          style={{
                            ...(item.cover_url
                              ? {
                                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url(${item.cover_url})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  borderRadius: '16px',
                                }
                              : {}),
                            overflow: 'visible',
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-[var(--mpc-light)]">{item.title}</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">
                                {item.bpm ? `${item.bpm} BPM` : '—'} · {item.mood || '—'}
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-[10px]">
                                <span
                                  className={`rounded-full border px-2 py-[2px] uppercase tracking-[0.12em] ${
                                    item.access_mode === 'request'
                                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                                      : item.access_mode === 'private'
                                        ? 'border-red-500/30 bg-red-500/10 text-red-100'
                                        : 'border-white/15 bg-white/5 text-[var(--mpc-muted)]'
                                  }`}
                                >
                                  {item.access_mode === 'request'
                                    ? 'Na žádost'
                                    : item.access_mode === 'private'
                                      ? 'Soukromá'
                                      : 'Veřejná'}
                                </span>
                                {updatingAcapellaAccessId === item.id && (
                                  <span className="text-[var(--mpc-accent)]">Ukládám…</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handlePlayAcapella(item)}
                                disabled={!item.audio_url}
                                className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mpc-accent)] text-[var(--mpc-light)] transition ${
                                  isCurrent && gpIsPlaying ? 'bg-[var(--mpc-accent)]' : 'bg-transparent'
                                } disabled:opacity-40`}
                              >
                                {isCurrent && gpIsPlaying ? '▮▮' : '▶'}
                              </button>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Přístup</span>
                                <select
                                  value={item.access_mode || 'public'}
                                  onChange={(e) =>
                                    handleUpdateAcapellaAccess(
                                      item.id,
                                      e.target.value as 'public' | 'request' | 'private'
                                    )
                                  }
                                  disabled={updatingAcapellaAccessId === item.id}
                                  className="h-8 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-2 text-[11px] text-[var(--mpc-light)] outline-none hover:border-[var(--mpc-accent)]"
                                >
                                  <option value="public">Veřejná</option>
                                  <option value="request">Na žádost</option>
                                  <option value="private">Soukromá</option>
                                </select>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setOpenAcapellaMenuId((prev) => (prev === item.id ? null : item.id))
                                  }
                                  className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                                >
                                  •••
                                </button>
                                {openAcapellaMenuId === item.id && (
                                  <div className="absolute right-0 top-10 z-50 min-w-[180px] rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] text-[12px] text-[var(--mpc-light)] shadow-[0_18px_36px_rgba(0,0,0,0.55)]">
                                    <button
                                      onClick={() => startEditAcapella(item)}
                                      className="block w-full px-3 py-2 text-left hover:bg-[var(--mpc-deck)]"
                                    >
                                      Upravit akapelu
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUpdateAcapellaAccess(
                                          item.id,
                                          item.access_mode === 'request' ? 'public' : 'request'
                                        )
                                      }
                                      disabled={updatingAcapellaAccessId === item.id}
                                      className="block w-full px-3 py-2 text-left hover:bg-[var(--mpc-deck)] disabled:opacity-60"
                                    >
                                      {item.access_mode === 'request' ? 'Zpřístupnit veřejně' : 'Přístup na žádost'}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAcapella(item.id)}
                                      disabled={deletingAcapellaId === item.id}
                                      className="block w-full px-3 py-2 text-left text-red-400 hover:bg-[var(--mpc-deck)] disabled:opacity-60"
                                    >
                                      {deletingAcapellaId === item.id ? 'Mažu…' : 'Smazat akapelu'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {editingAcapellaId === item.id && (
                            <div className="mt-3 space-y-3 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-3">
                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                    Název
                                  </label>
                                  <input
                                    type="text"
                                    value={editAcapellaTitle}
                                    onChange={(e) => setEditAcapellaTitle(e.target.value)}
                                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                    BPM
                                  </label>
                                  <input
                                    type="number"
                                    value={editAcapellaBpm}
                                    onChange={(e) => setEditAcapellaBpm(e.target.value)}
                                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                    Mood
                                  </label>
                                  <input
                                    type="text"
                                    value={editAcapellaMood}
                                    onChange={(e) => setEditAcapellaMood(e.target.value)}
                                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                    Cover URL
                                  </label>
                                  <input
                                    type="text"
                                    value={editAcapellaCoverUrl}
                                    onChange={(e) => setEditAcapellaCoverUrl(e.target.value)}
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
                                    onChange={(e) => setEditAcapellaCoverFile(e.target.files?.[0] ?? null)}
                                    className="mt-1 w-full text-[12px] text-[var(--mpc-light)]"
                                  />
                                  <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">Nahraje se do bucketu akapel.</p>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                    Přístup
                                  </label>
                                  <select
                                    value={editAcapellaAccess}
                                    onChange={(e) => setEditAcapellaAccess(e.target.value as 'public' | 'request' | 'private')}
                                    className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                  >
                                    <option value="public">Veřejná</option>
                                    <option value="request">Na žádost</option>
                                    <option value="private">Soukromá</option>
                                  </select>
                                  <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">&quot;Na žádost&quot; skryje přímé stahování, nejdřív musíš schválit.</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={handleSaveAcapella}
                                  disabled={acapellaSaving}
                                  className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-white disabled:opacity-60"
                                >
                                  {acapellaSaving ? 'Ukládám…' : 'Uložit akapelu'}
                                </button>
                                <button
                                  onClick={() => setEditingAcapellaId(null)}
                                  className="rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                                >
                                  Zrušit
                                </button>
                              </div>
                            </div>
                          )}
                          <div
                            className="mt-3 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                            onClick={(e) => {
                              const width = e.currentTarget.getBoundingClientRect().width;
                              if (!width) return;
                              seekAcapella(item, e.clientX - e.currentTarget.getBoundingClientRect().left, width);
                            }}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                              style={{ width: progressPct }}
                            />
                          </div>
                          {isCurrent && (
                            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                              <span>{formatTime(gpTime)}</span>
                              <span>{formatTime(gpDuration)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!isMcOnly && activeTab === 'beats' && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5" id="beats-feed">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                  <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
                    {t('profile.beats.title', 'Moje beaty')}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{beats.length} {t('profile.items', 'položek')}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Přetáhni pro změnu pořadí
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  {canUpload && (
                    <button
                      onClick={() => toggleSection('beatUpload')}
                      className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.4)] sm:w-auto"
                    >
                      {openSections.beatUpload ? 'Schovat formulář' : 'Nahrát beat'}
                    </button>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--mpc-muted)] sm:text-[12px]">
                    <span className="hover:text-[var(--mpc-light)] cursor-pointer">Podle data</span>
                    <span className="text-[var(--mpc-dark)]">•</span>
                    <span className="hover:text-[var(--mpc-light)] cursor-pointer">Podle BPM</span>
                    {beats.length > 3 && (
                      <>
                        <span className="text-[var(--mpc-dark)]">•</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => scrollListBy(beatsListRef, 'up')}
                            className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/30 text-white/70 transition hover:border-white/30 hover:text-white"
                            aria-label="Posunout beaty nahoru"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => scrollListBy(beatsListRef, 'down')}
                            className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/30 text-white/70 transition hover:border-white/30 hover:text-white"
                            aria-label="Posunout beaty dolů"
                          >
                            ↓
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {canUpload && openSections.beatUpload && (
                <div className="mb-4 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <BeatUploadForm />
                </div>
              )}
                {SHOW_SHARE_FEATURE && shareMessage && (
                  <div className="mb-2 rounded-md border border-[var(--mpc-accent)]/40 bg-[var(--mpc-accent)]/10 px-3 py-2 text-[12px] text-[var(--mpc-light)]">
                    {shareMessage}
                  </div>
                )}
                {beatsError && (
                  <div className="mb-2 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                    {beatsError}
                  </div>
                )}
                {beatsOrderSaved && (
                  <div className="mb-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    Pořadí beatů bylo uloženo.
                  </div>
                )}
                {beats.length === 0 ? (
                <div className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-6 text-sm text-[var(--mpc-muted)]">
                  Zatím žádné beaty. Nahraj první beat a ukaž se.
                </div>
                ) : (
                <div
                  ref={beatsListRef}
                  className="max-h-[520px] space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                  {beats.map((beat) => {
                    const isDragOver = dragOverBeatId === beat.id && dragBeatId !== beat.id;
                    const isDragging = dragBeatId === beat.id;
                    return (
                    <div
                      key={beat.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(beat.id));
                        setDragBeatId(beat.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverBeatId(beat.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        void handleBeatDrop(beat.id);
                      }}
                      onDragEnd={() => {
                        setDragBeatId(null);
                        setDragOverBeatId(null);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-sm text-[var(--mpc-light)] transition ${
                        isDragOver ? 'border-[var(--mpc-accent)]/80' : 'border-[var(--mpc-dark)]'
                      } ${isDragging ? 'opacity-70' : ''} ${currentBeat?.id === beat.id ? 'bg-[var(--mpc-panel)]/80' : 'bg-[var(--mpc-panel)]'} hover:border-[var(--mpc-accent)]`}
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] text-[var(--mpc-muted)] cursor-grab">⋮⋮</span>
                            <div className="h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                              {beat.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={beat.cover_url} alt={beat.title || 'Beat cover'} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] text-white/30">NO COVER</div>
                              )}
                            </div>
                            <p className="text-base font-semibold text-[var(--mpc-light)] truncate">{beat.title}</p>
                          </div>
                          <p className="text-[12px] text-[var(--mpc-muted)]">
                            {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                          </p>
                        </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <button
                          onClick={() => handlePlayBeat(beat)}
                          disabled={!beat.audio_url}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mpc-accent)] text-[var(--mpc-light)] transition ${
                            currentBeat?.id === beat.id && gpCurrent?.id === `beat-${beat.id}` && gpIsPlaying ? 'bg-[var(--mpc-accent)]' : 'bg-transparent'
                          } disabled:opacity-40`}
                        >
                          {currentBeat?.id === beat.id && gpCurrent?.id === `beat-${beat.id}` && gpIsPlaying ? '▮▮' : '▶'}
                        </button>
                        <button
                          onClick={() => startEditBeat(beat)}
                          className="rounded-full border border-[var(--mpc-accent)] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
                        >
                          Upravit
                        </button>
                        {SHOW_SHARE_FEATURE && (
                          <button
                            onClick={() => void createShareLink('beat', String(beat.id))}
                            className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                          >
                            Sdílet
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBeat(beat.id)}
                          className="rounded-full border border-red-500/60 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                        >
                          Smazat
                        </button>
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
                          <div className="flex flex-wrap items-center gap-3">
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
                          className="mt-3 h-3 cursor-pointer overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-deck)]"
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                            seekBeat(beat, e.clientX - rect.left, rect.width);
                          }}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--mpc-accent)] transition-all duration-150"
                            style={{
                              width:
                                currentBeat?.id === beat.id && gpCurrent?.id === `beat-${beat.id}` && gpDuration
                                  ? `${Math.min((gpTime / gpDuration) * 100, 100)}%`
                                  : '0%',
                            }}
                          />
                        </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                        <span>{beat.audio_url ? 'Audio připojeno' : 'Bez audia'}</span>
                        {currentBeat?.id === beat.id && playerMessage && (
                          <span className="text-[var(--mpc-accent)]">{playerMessage}</span>
                        )}
                        {currentBeat?.id === beat.id && gpCurrent?.id === `beat-${beat.id}` && gpIsPlaying && (
                          <span className="rounded-full bg-[var(--mpc-accent)]/15 px-2 py-[2px] text-[10px] text-[var(--mpc-accent)]">
                            Přehrává se
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>

            )}

            {!isMcOnly && activeTab === 'projects' && (
            <>
            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] sm:p-5" id="projects-feed">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--mpc-light)]">
                    {t('profile.projects.title', 'Moje projekty')}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{projects.length} {t('profile.items', 'položek')}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                    Přetáhni pro změnu pořadí
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  {canUpload && (
                    <button
                      onClick={() => toggleSection('projectUpload')}
                      className="w-full rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white sm:w-auto"
                    >
                      {openSections.projectUpload ? 'Schovat formulář' : 'Nahrát projekt'}
                    </button>
                  )}
                  {canImportExternal && (
                    <button
                      onClick={() => {
                        setImportProjectOpen((prev) => !prev);
                        setImportError(null);
                        setImportSuccess(null);
                      }}
                      className="w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:border-[var(--mpc-accent)] sm:w-auto"
                    >
                      {importProjectOpen ? 'Schovat import' : 'Import projektu'}
                    </button>
                  )}
                  {projects.length > 3 && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--mpc-muted)] sm:text-[12px]">
                      <button
                        type="button"
                        onClick={() => scrollListBy(projectsListRef, 'up')}
                        className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/30 text-white/70 transition hover:border-white/30 hover:text-white"
                        aria-label="Posunout projekty nahoru"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollListBy(projectsListRef, 'down')}
                        className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-black/30 text-white/70 transition hover:border-white/30 hover:text-white"
                        aria-label="Posunout projekty dolů"
                      >
                        ↓
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {canUpload && openSections.projectUpload && (
                <div className="mb-4 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <ProjectUploadForm />
                </div>
              )}
              {canImportExternal && importProjectOpen && (
                <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                      Odkaz na projekt
                    </label>
                    <input
                      value={importProjectUrl}
                      onChange={(e) => setImportProjectUrl(e.target.value)}
                      placeholder="https://open.spotify.com/..., https://soundcloud.com/..., https://bandcamp.com/..., https://music.apple.com/..."
                      className="w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                      Embed iframe (volitelné)
                    </label>
                    <textarea
                      value={importEmbedHtml}
                      onChange={(e) => setImportEmbedHtml(e.target.value)}
                      placeholder="<iframe ...></iframe>"
                      rows={3}
                      className="w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                    />
                    <p className="text-[10px] text-[var(--mpc-muted)]">
                      Stačí vložit URL a embed — systém automaticky pozná Spotify/SoundCloud/Bandcamp/Apple Music.
                    </p>
                    <p className="text-[10px] text-[var(--mpc-muted)]">
                      Pokud nevíš, jak získat embed z těchto platforem,{" "}
                      <Link href="/faq#import-externi-projekty" className="text-[var(--mpc-accent)] hover:underline">
                        zde je návod
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleFetchImportMetadata}
                      disabled={importLoading}
                      className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
                    >
                      {importLoading ? 'Načítám…' : 'Načíst'}
                    </button>
                    <button
                      onClick={resetImportState}
                      className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 hover:border-white/40"
                    >
                      Vyčistit
                    </button>
                  </div>
                  {importError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                      {importError}
                    </div>
                  )}
                  {importSuccess && (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
                      {importSuccess}
                    </div>
                  )}
                  {importMetadata && (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
                      <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        {importMetadata.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={importMetadata.cover} alt={importMetadata.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] text-white/40">NO COVER</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{importMetadata.title}</p>
                        <p className="text-[11px] text-[var(--mpc-muted)]">
                          {importMetadata.artist || 'Neznámý autor'}
                          {importMetadata.provider ? ` · ${importMetadata.provider}` : ''}
                        </p>
                      </div>
                      <a
                        href={importMetadata.link}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 hover:border-[var(--mpc-accent)]"
                      >
                        Otevřít
                      </a>
                    </div>
                  )}
                  {importMetadata && (
                    <div className="grid gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                          Název projektu
                        </label>
                        <input
                          value={importTitle}
                          onChange={(e) => setImportTitle(e.target.value)}
                          className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                          Autor
                        </label>
                        <input
                          value={importArtist}
                          onChange={(e) => setImportArtist(e.target.value)}
                          className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        />
                      </div>
                      <button
                        onClick={handleImportProject}
                        disabled={importSaving}
                        className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)] disabled:opacity-60"
                      >
                        {importSaving ? 'Importuji…' : 'Importovat projekt'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {projectsError && (
                <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
                  {projectsError}
                </div>
              )}
              {projectsOrderSaved && (
                <div className="mb-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  Pořadí projektů bylo uloženo.
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
                <div
                  ref={projectsListRef}
                  className="max-h-[520px] space-y-3 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                >
                  {projects.map((project) => {
                    const projectSlug = slugifyName(project.title || '');
                    const hasLocalTracks =
                      Array.isArray(project.tracks_json) && project.tracks_json.some((track) => Boolean(track?.url));
                    const isExternalProject = Boolean(project.embed_html);
                    const canShareUrl =
                      !isExternalProject &&
                      hasLocalTracks &&
                      (project.access_mode === 'public' || project.access_mode === 'request');
                    const projectUrl = canShareUrl
                      ? `${siteUrl}/projekty/${profileSlug || 'profil'}/${projectSlug || 'projekt'}`
                      : '';
                    const projectStyle = project.cover_url
                      ? {
                          backgroundImage:
                            'linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.9)), url(' +
                            (resolveProjectCoverUrl(project.cover_url) || '') +
                            ')',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined;
                    const isDragOver = dragOverProjectId === project.id && dragProjectId !== project.id;
                    const isDragging = dragProjectId === project.id;
                    return (
                      <div key={project.id} className="space-y-3">
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', project.id);
                            setDragProjectId(project.id);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverProjectId(project.id);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            void handleProjectDrop(project.id);
                          }}
                          onDragEnd={() => {
                            setDragProjectId(null);
                            setDragOverProjectId(null);
                          }}
                          className={`flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm text-[var(--mpc-light)] transition sm:flex-row sm:items-center sm:justify-between ${
                            isDragOver ? 'border-[var(--mpc-accent)]/80' : 'border-[var(--mpc-dark)]'
                          } ${isDragging ? 'opacity-70' : ''} bg-[var(--mpc-panel)]`}
                          style={projectStyle}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-[var(--mpc-muted)] cursor-grab">⋮⋮</span>
                              <p className="font-semibold truncate">{project.title}</p>
                            </div>
                            <p className="text-[12px] text-[var(--mpc-muted)]">
                              {project.description || 'Bez popisu'}
                            </p>
                            {canShareUrl && (
                              <div className="mt-2 flex max-w-full flex-wrap items-center gap-2 sm:max-w-[360px]">
                                <input
                                  readOnly
                                  value={projectUrl}
                                  title={projectUrl}
                                  className="w-full truncate rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-[var(--mpc-muted)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleCopyProjectUrl(projectUrl, project.id)}
                                  className="w-full rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)] sm:w-auto"
                                >
                                  {copiedProjectLinkId === project.id ? 'OK' : 'Kopírovat'}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex w-full flex-col items-start gap-2 text-[11px] text-[var(--mpc-muted)] sm:w-auto sm:items-end">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Projekt</span>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => {
                                  const passwordKey = getProjectPasswordKey(project.id);
                                  let storedPassword = '';
                                  if (passwordKey && typeof window !== 'undefined') {
                                    storedPassword = window.localStorage.getItem(passwordKey) || '';
                                  }
                                  setEditingProject(project);
                                  setProjectEditTitle(project.title || '');
                                  setProjectEditDescription(project.description || '');
                                  setProjectEditReleaseFormats(project.release_formats || []);
                                  setProjectEditPurchaseUrl(project.purchase_url || '');
                                  setProjectEditPassword(storedPassword);
                                  const tracks = Array.isArray(project.tracks_json)
                                    ? project.tracks_json.map((t: any) => {
                                        const path = t.path || null;
                                        const urlFallback =
                                          path && (!t.url || t.url.startsWith('http') === false)
                                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`
                                            : '';
                                        return {
                                          name: t.name || '',
                                          url: t.url || urlFallback,
                                          path,
                                        };
                                      })
                                    : [];
                                  setProjectEditTracks(
                                    tracks.length > 0 ? tracks : [{ name: '', url: '', path: null, file: null }]
                                  );
                                }}
                                className="rounded-full border border-[var(--mpc-accent)] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
                              >
                                Upravit
                              </button>
                              {SHOW_SHARE_FEATURE && (
                                <button
                                  onClick={() => void createShareLink('project', String(project.id))}
                                  className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                                >
                                  Sdílet
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="rounded-full border border-red-500/60 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                              >
                                Smazat
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--mpc-light)]">
                              <label className="text-[var(--mpc-muted)]">Přístup</label>
                              <select
                                value={project.access_mode || 'public'}
                                onChange={(e) =>
                                  handleUpdateProjectAccess(project.id, e.target.value as 'public' | 'request' | 'private')
                                }
                                className="rounded border border-[var(--mpc-dark)] bg-black/70 px-2 py-1 text-[11px] text-[var(--mpc-light)]"
                              >
                                <option value="public">Veřejný</option>
                                <option value="request">Na žádost</option>
                                <option value="private">Soukromý</option>
                              </select>
                            </div>
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
                        {editingProject?.id === project.id && (
                          <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-4 sm:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Upravit projekt</h3>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                                  {editingProject.title}
                                </p>
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

                              <div>
                                <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Vydáno na</label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {[
                                    { id: 'vinyl', label: 'Vinyl' },
                                    { id: 'cassette', label: 'Kazeta' },
                                    { id: 'cd', label: 'CD' },
                                    { id: 'digital', label: 'Digital' },
                                  ].map((format) => {
                                    const active = projectEditReleaseFormats.includes(format.id);
                                    return (
                                      <button
                                        key={format.id}
                                        type="button"
                                        onClick={() =>
                                          setProjectEditReleaseFormats((prev) =>
                                            prev.includes(format.id)
                                              ? prev.filter((item) => item !== format.id)
                                              : [...prev, format.id]
                                          )
                                        }
                                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
                                          active
                                            ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                                            : 'border-white/15 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                                        }`}
                                      >
                                        {format.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">URL pro nákup</label>
                                <input
                                  className="mt-1 w-full rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                  placeholder="https://..."
                                  value={projectEditPurchaseUrl}
                                  onChange={(e) => setProjectEditPurchaseUrl(e.target.value)}
                                />
                              </div>

                              {editingProject.access_mode === 'request' && (
                                <div>
                                  <label className="block text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                                    Heslo pro projekt na žádost (volitelné)
                                  </label>
                                  <input
                                    type="text"
                                    className="mt-1 w-full rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                    placeholder="Zadej nové heslo..."
                                    value={projectEditPassword}
                                    onChange={(e) => setProjectEditPassword(e.target.value)}
                                  />
                                  <p className="mt-1 text-[11px] text-[var(--mpc-muted)]">
                                    Heslo se ukládá lokálně v prohlížeči, aby zůstalo viditelné.
                                  </p>
                                </div>
                              )}

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
                                        accept=".mp3,audio/mpeg"
                                        onChange={(e) =>
                                          setProjectEditTracks((prev) =>
                                            prev.map((p, i) =>
                                              i === idx ? { ...p, file: e.target.files?.[0] ?? null } : p
                                            )
                                          )
                                        }
                                        className="block w-full text-[12px] text-[var(--mpc-light)]"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-end">
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
                                    const finalTracks: Array<{ name: string; url: string; path?: string | null }> = [];

                                    // Cover upload (pokud je vybrán nový soubor)
                                    let coverUrl = editingProject.cover_url || null;
                                    if (projectEditCover.file) {
                                      const safeCover = projectEditCover.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                                      const coverPath = `${userId}/projects/covers/${Date.now()}-${safeCover}`;
                                      const coverToUpload = await resizeImageFile(projectEditCover.file, { maxSize: 420, quality: 0.75 });
                                      const { error: coverErr } = await supabase.storage
                                        .from('projects')
                                        .upload(coverPath, coverToUpload, { upsert: true });
                                      if (coverErr) throw coverErr;
                                      const { data: pubCover } = supabase.storage.from('projects').getPublicUrl(coverPath);
                                      coverUrl = pubCover.publicUrl;
                                    } else if (projectEditCover.url && projectEditCover.url.trim()) {
                                      coverUrl = projectEditCover.url.trim();
                                    }

                                    for (const tr of projectEditTracks) {
                                      if (tr.file) {
                                        const ext = tr.file.name.split('.').pop()?.toLowerCase();
                                        if (ext && ext !== 'mp3') {
                                          throw new Error('Audio musí být MP3.');
                                        }
                                        const safe = tr.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                                        const path = `${userId}/projects/audio/${Date.now()}-${safe}`;
                                        const { error: uploadErr } = await supabase.storage
                                          .from('projects')
                                          .upload(path, tr.file, { upsert: true });
                                        if (uploadErr) throw uploadErr;
                                        const { data: signed } = await supabase.storage
                                          .from('projects')
                                          .createSignedUrl(path, 60 * 60 * 24 * 7);
                                        const publicUrl = signed?.signedUrl;
                                        uploads.push({ name: tr.name.trim() || tr.file.name, url: publicUrl || '' });
                                        finalTracks.push({
                                          name: tr.name.trim() || tr.file.name,
                                          url: publicUrl || '',
                                          path,
                                        });
                                      } else if (tr.path) {
                                        // Zachovej původní nahrané soubory (mají uloženou path)
                                        const { data: signed } = await supabase.storage
                                          .from('projects')
                                          .createSignedUrl(tr.path, 60 * 60 * 24 * 7);
                                        const fallbackUrl =
                                          tr.url || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${tr.path}`;
                                        finalTracks.push({
                                          name: tr.name.trim() || tr.path.split('/').pop() || 'Track',
                                          url: signed?.signedUrl || fallbackUrl,
                                          path: tr.path,
                                        });
                                      } else if (tr.url) {
                                        finalTracks.push({ name: tr.name.trim() || tr.url, url: tr.url, path: tr.path || null });
                                      }
                                    }

                                    const firstUrl = finalTracks[0]?.url || editingProject.project_url || null;
                                    const normalizedPurchaseUrl = normalizePurchaseUrl(projectEditPurchaseUrl);
                                    const passwordHash =
                                      editingProject.access_mode === 'request' && projectEditPassword.trim()
                                        ? await hashProjectPassword(projectEditPassword.trim())
                                        : null;

                                    const { error: updateErr } = await supabase
                                      .from('projects')
                                      .update({
                                        title: projectEditTitle.trim(),
                                        description: projectEditDescription.trim() || null,
                                        project_url: firstUrl,
                                        tracks_json: finalTracks,
                                        cover_url: coverUrl,
                                        release_formats: projectEditReleaseFormats.length ? projectEditReleaseFormats : null,
                                        purchase_url: normalizedPurchaseUrl,
                                        ...(passwordHash ? { access_password_hash: passwordHash } : {}),
                                      })
                                      .eq('id', editingProject.id);
                                    if (updateErr) throw updateErr;

                                    const passwordKey = getProjectPasswordKey(editingProject.id);
                                    if (passwordKey && typeof window !== 'undefined') {
                                      if (editingProject.access_mode === 'request' && projectEditPassword.trim()) {
                                        window.localStorage.setItem(passwordKey, projectEditPassword.trim());
                                      } else if (editingProject.access_mode !== 'request') {
                                        window.localStorage.removeItem(passwordKey);
                                      }
                                    }

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
                                              release_formats: projectEditReleaseFormats.length ? projectEditReleaseFormats : null,
                                              purchase_url: normalizedPurchaseUrl,
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
            </>
            )}
            {isMcOnly && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Moje žádosti o přístup</h3>
                  </div>
                </div>
                {myAccessRequestsLoading && <p className="text-[11px] text-[var(--mpc-muted)]">Načítám žádosti…</p>}
                {myAccessRequestsError && (
                  <div className="rounded-md border border-yellow-700/50 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                    {myAccessRequestsError}
                  </div>
                )}
                {myAccessRequests.length === 0 ? (
                  <p className="text-[12px] text-[var(--mpc-muted)]">Zatím jsi neposlal žádnou žádost.</p>
                ) : (
                  <div className="space-y-2">
                    {myAccessRequests.map((req) => (
                      <div key={req.id} className="flex flex-col gap-1 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)]">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{req.project_title || req.project_id}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[11px] text-[var(--mpc-muted)]">Status:</span>
                              <span
                                className={`rounded-full border px-2 py-[2px] text-[11px] uppercase tracking-[0.12em] ${
                                  req.status === 'approved'
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : req.status === 'pending'
                                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                                      : 'border-red-500/40 bg-red-500/10 text-red-100'
                                }`}
                              >
                                {req.status === 'approved'
                                  ? 'Aktivní'
                                  : req.status === 'pending'
                                    ? 'Čeká na schválení'
                                    : 'Odmítnuto'}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-[var(--mpc-muted)]">{formatRelativeTime(req.created_at)}</p>
                        </div>
                        {req.message && <p className="text-[12px] text-[var(--mpc-light)]">„{req.message}“</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'collabs' && collabsSection}

            {profile.role !== 'mc' && activeTab === 'forum' && (
              <div
                className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3 sm:p-5"
                id="my-forum"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                          <div
                            key={cat.id}
                            className="flex flex-col gap-3 rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)] sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold">{cat.name}</p>
                              <p className="text-[11px] text-[var(--mpc-muted)]">{cat.description || 'Bez popisu'}</p>
                            </div>
                            <div className="flex w-full flex-col items-start gap-1 text-[11px] sm:w-auto sm:items-end">
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
                          <div
                            key={thr.id}
                            className="flex items-start justify-between rounded border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-[var(--mpc-light)]"
                          >
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
            )}

          {canWriteArticles && activeTab === 'posts' && (
            <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3 sm:p-5" id="my-posts">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-[var(--mpc-light)]">{post.title}</p>
                          <p className="text-[12px] text-[var(--mpc-muted)]">{post.excerpt}</p>
                          <p className="text-[11px] text-[var(--mpc-muted)]">{post.date}</p>
                        </div>
                        <div className="flex w-full flex-col gap-2 text-[11px] sm:w-auto sm:items-end">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => void handleTogglePostPublished(post.id, true)}
                              className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                            >
                              {post.published ? 'Publikováno' : 'Publikovat'}
                            </button>
                            <button
                              onClick={() => void handleTogglePostPublished(post.id, false)}
                              className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[var(--mpc-light)] hover:border-red-400 hover:text-red-300"
                            >
                              Schovat
                            </button>
                          </div>
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
          )}

          {/* konec levého sloupce */}
          </div>

          {/* Pravý sloupec: akce (na mobilu nahoře) */}
          {showRightColumn && (
          <div className="space-y-4 order-2 lg:order-2" id="profile-settings">
            {(canUpload || canUploadAcapellas) && (
              <>
                {canUpload && (
                  <>
                    <div className="order-1 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:order-none">
                      <button
                        onClick={() => toggleSection('beatUpload')}
                        className="w-full rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#ff9d3c] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_30px_rgba(255,122,26,0.35)] transition hover:brightness-105"
                      >
                        {openSections.beatUpload ? 'Schovat formulář' : 'Nahrát beat'}
                      </button>
                      {openSections.beatUpload && (
                        <div className="mt-4">
                          <BeatUploadForm />
                        </div>
                      )}
                    </div>

                    <div className="order-2 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:order-none">
                      <button
                        onClick={() => toggleSection('projectUpload')}
                        className="w-full rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                      >
                        {openSections.projectUpload ? 'Schovat formulář' : 'Nahrát projekt'}
                      </button>
                      {canImportExternal && (
                        <button
                          onClick={() => {
                            setImportProjectOpen((prev) => !prev);
                            setImportError(null);
                            setImportSuccess(null);
                          }}
                          className="mt-3 w-full rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:border-[var(--mpc-accent)]"
                        >
                          {importProjectOpen ? (
                            'Schovat import'
                          ) : (
                            <span className="flex flex-col leading-tight">
                              <span>Import projektu</span>
                              <span className="text-[11px] tracking-[0.2em] text-[var(--mpc-muted)]">
                                Spotify / SoundCloud / Bandcamp / Apple Music
                              </span>
                            </span>
                          )}
                        </button>
                      )}
                      {openSections.projectUpload && (
                        <div className="mt-4">
                          <ProjectUploadForm />
                        </div>
                      )}
                      {canImportExternal && importProjectOpen && (
                        <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                              Odkaz na projekt
                            </label>
                            <input
                              value={importProjectUrl}
                              onChange={(e) => setImportProjectUrl(e.target.value)}
                              placeholder="https://open.spotify.com/..., https://soundcloud.com/..., https://bandcamp.com/..., https://music.apple.com/..."
                              className="w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                              Embed iframe (volitelné)
                            </label>
                            <textarea
                              value={importEmbedHtml}
                              onChange={(e) => setImportEmbedHtml(e.target.value)}
                              placeholder="<iframe ...></iframe>"
                              rows={3}
                              className="w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                            />
                            <p className="text-[10px] text-[var(--mpc-muted)]">
                              Stačí vložit URL a embed — systém automaticky pozná Spotify/SoundCloud/Bandcamp/Apple Music.
                            </p>
                            <p className="text-[10px] text-[var(--mpc-muted)]">
                              Pokud nevíš, jak získat embed z těchto platforem,{" "}
                              <Link href="/faq#import-externi-projekty" className="text-[var(--mpc-accent)] hover:underline">
                                zde je návod
                              </Link>
                              .
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleFetchImportMetadata}
                              disabled={importLoading}
                              className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
                            >
                              {importLoading ? 'Načítám…' : 'Načíst'}
                            </button>
                            <button
                              onClick={resetImportState}
                              className="rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70 hover:border-white/40"
                            >
                              Vyčistit
                            </button>
                          </div>
                          {importError && (
                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
                              {importError}
                            </div>
                          )}
                          {importSuccess && (
                            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
                              {importSuccess}
                            </div>
                          )}
                          {importMetadata && (
                            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/40 p-3">
                              <div className="h-14 w-14 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                                {importMetadata.cover ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={importMetadata.cover} alt={importMetadata.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="grid h-full w-full place-items-center text-[10px] text-white/40">NO COVER</div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{importMetadata.title}</p>
                                <p className="text-[11px] text-[var(--mpc-muted)]">
                                  {importMetadata.artist || 'Neznámý autor'}
                                  {importMetadata.provider ? ` · ${importMetadata.provider}` : ''}
                                </p>
                              </div>
                              <a
                                href={importMetadata.link}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-white/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 hover:border-[var(--mpc-accent)]"
                              >
                                Otevřít
                              </a>
                            </div>
                          )}
                          {importMetadata && (
                            <div className="grid gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                  Název projektu
                                </label>
                                <input
                                  value={importTitle}
                                  onChange={(e) => setImportTitle(e.target.value)}
                                  className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                                  Autor
                                </label>
                                <input
                                  value={importArtist}
                                  onChange={(e) => setImportArtist(e.target.value)}
                                  className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                                />
                              </div>
                              <button
                                onClick={handleImportProject}
                                disabled={importSaving}
                                className="w-full rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(243,116,51,0.35)] disabled:opacity-60"
                              >
                                {importSaving ? 'Importuji…' : 'Importovat projekt'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {canUploadAcapellas && (
                  <div className="order-3 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:order-none">
                    <button
                      onClick={() => toggleSection('acapellaUpload')}
                      className="w-full rounded-full bg-gradient-to-r from-[#1b8bff] to-[#4dc0ff] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_12px_30px_rgba(27,139,255,0.35)] transition hover:brightness-105"
                    >
                      {openSections.acapellaUpload ? 'Schovat formulář' : 'Nahrát akapely'}
                    </button>
                    {openSections.acapellaUpload && (
                      <div className="mt-4">
                        <AcapellaUploadForm />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="order-4 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:order-none">
              <button
                onClick={() => toggleSection('profile')}
                className="w-full rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                {openSections.profile ? 'Schovat' : 'Upravit profil'}
              </button>
              {openSections.profile && (
                <div
                  className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 sm:items-center sm:py-10"
                  onClick={() => toggleSection('profile')}
                >
                  <div
                    className="w-full max-w-3xl rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--mpc-light)]">Upravit profil</h3>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                          Nastavení profilu
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSection('profile')}
                        className="rounded-full border border-[var(--mpc-dark)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                      >
                        Zavřít
                      </button>
                    </div>
                    <form onSubmit={handleProfileSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 sm:max-h-none">
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
                        Kraj
                      </label>
                      <select
                        value={editRegion}
                        onChange={(e) => setEditRegion(e.target.value)}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        required
                      >
                        <option value="">Vyber kraj…</option>
                        <option value="Hlavní město Praha">Hlavní město Praha</option>
                        <option value="Středočeský kraj">Středočeský kraj</option>
                        <option value="Jihočeský kraj">Jihočeský kraj</option>
                        <option value="Plzeňský kraj">Plzeňský kraj</option>
                        <option value="Karlovarský kraj">Karlovarský kraj</option>
                        <option value="Ústecký kraj">Ústecký kraj</option>
                        <option value="Liberecký kraj">Liberecký kraj</option>
                        <option value="Královéhradecký kraj">Královéhradecký kraj</option>
                        <option value="Pardubický kraj">Pardubický kraj</option>
                        <option value="Kraj Vysočina">Kraj Vysočina</option>
                        <option value="Jihomoravský kraj">Jihomoravský kraj</option>
                        <option value="Olomoucký kraj">Olomoucký kraj</option>
                        <option value="Zlínský kraj">Zlínský kraj</option>
                        <option value="Moravskoslezský kraj">Moravskoslezský kraj</option>
                        <option value="Bratislavský kraj">Bratislavský kraj</option>
                        <option value="Trnavský kraj">Trnavský kraj</option>
                        <option value="Trenčiansky kraj">Trenčiansky kraj</option>
                        <option value="Nitriansky kraj">Nitriansky kraj</option>
                        <option value="Žilinský kraj">Žilinský kraj</option>
                        <option value="Banskobystrický kraj">Banskobystrický kraj</option>
                        <option value="Prešovský kraj">Prešovský kraj</option>
                        <option value="Košický kraj">Košický kraj</option>
                      </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                            Hledám
                          </label>
                          <span className="text-[11px] text-[var(--mpc-muted)]">Vyber vše, co platí</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {SEEKING_OPTIONS.map((opt) => {
                            const active = seekingSignals.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleSignal(opt, seekingSignals, setSeekingSignals)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                                  active
                                    ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black shadow-[0_8px_18px_rgba(243,116,51,0.35)]'
                                    : 'border-[var(--mpc-dark)] bg-[var(--mpc-deck)] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={seekingCustom}
                          onChange={(e) => setSeekingCustom(e.target.value)}
                          placeholder="Jiné – napiš vlastní popis"
                          className="mt-2 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                            Nabízím
                          </label>
                          <span className="text-[11px] text-[var(--mpc-muted)]">Vyber vše, co nabízíš</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {OFFERING_OPTIONS.map((opt) => {
                            const active = offeringSignals.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleSignal(opt, offeringSignals, setOfferingSignals)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                                  active
                                    ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black shadow-[0_8px_18px_rgba(243,116,51,0.35)]'
                                    : 'border-[var(--mpc-dark)] bg-[var(--mpc-deck)] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          value={offeringCustom}
                          onChange={(e) => setOfferingCustom(e.target.value)}
                          placeholder="Jiné – napiš vlastní popis"
                          className="mt-2 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        />
                      </div>
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
                </div>
              )}
            </div>

            <div className="order-5 rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] lg:order-none">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full rounded-full border border-[var(--mpc-dark)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--mpc-light)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
              >
                Odhlásit se
              </button>
            </div>


            {activeTab === 'posts' && (
              <div className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-3" id="blog-form-card">
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
                        Embed (YouTube / Spotify / Bandcamp / SoundCloud)
                      </label>
                      <input
                        type="text"
                        value={blogForm.embedUrl}
                        onChange={(e) => setBlogForm((prev) => ({ ...prev, embedUrl: e.target.value }))}
                        className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                        placeholder="https://youtu.be/..., https://open.spotify.com/..., https://bandcamp.com/..., https://soundcloud.com/..."
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
            )}
          </div>
          )}
        </div>
      </section>
    </main>
  );
}
