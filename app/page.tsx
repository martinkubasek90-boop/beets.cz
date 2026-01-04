'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';
import { useGlobalPlayer } from '@/components/global-player-provider';
import { FireButton } from '@/components/fire-button';
import { MainNav } from '@/components/main-nav';

const CMS_KEYS = [
  'home.hero.title',
  'home.hero.image',
  'home.hero.mode',
  'home.hero.background',
  'home.hero.subtitle',
  'home.projects.title',
  'home.beats.title',
  'home.artists.title',
  'home.blog.title',
  'home.info.producers.title',
  'home.info.producers.text',
  'home.info.rappers.title',
  'home.info.rappers.text',
  'home.info.community.title',
  'home.info.community.text',
  'home.video.items',
];

type Beat = {
  id: number;
  title: string;
  artist: string;
  user_id?: string | null;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  monthlyFires?: number;
  created_at?: string | null;
};

type Artist = {
  id: number | string;
  name: string;
  initials: string;
  beatsCount: number;
  projectsCount: number;
  city: string;
  avatar_url?: string | null;
  user_id?: string | null;
};

type Project = {
  id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id?: string | null;
  author_name?: string | null;
  project_url?: string | null;
  embed_html?: string | null;
  release_formats?: string[] | null;
  purchase_url?: string | null;
  tracks?: Array<{
    id: number | string;
    title: string;
    duration?: string;
    plays?: number;
  cover_url?: string | null;
  url?: string | null;
}>;
  tracks_json?: Array<{ name: string; url: string }>;
  display_name?: string | null;
};

const RELEASE_FORMAT_LABELS: Record<string, string> = {
  vinyl: 'Vinyl',
  cassette: 'Kazeta',
  cd: 'CD',
  digital: 'Digital',
};

const normalizePurchaseUrl = (value?: string | null) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const getExternalPlatform = (value?: string | null) => {
  if (!value) return null;
  const host = value.toLowerCase();
  if (host.includes('soundcloud.com')) return 'SoundCloud';
  if (host.includes('spotify.com')) return 'Spotify';
  if (host.includes('bandcamp.com')) return 'Bandcamp';
  return null;
};

const normalizeEmbedHtml = (html: string) => {
  if (!html) return '';
  return html.replace(/src=["']([^"']+)["']/i, (match, src) => {
    try {
      const url = new URL(src);
      if (url.hostname.includes('open.spotify.com')) {
        url.searchParams.set('theme', '0');
      }
      if (url.hostname.includes('w.soundcloud.com')) {
        if (!url.searchParams.get('color')) {
          url.searchParams.set('color', '#111111');
        }
      }
      return `src="${url.toString()}"`;
    } catch {
      return match;
    }
  });
};

// Lokální demo beaty – fallback, když Supabase spadne
const dummyBeats: Beat[] = [
  {
    id: 1,
    title: 'Noční linka',
    artist: 'Northside',
    user_id: null,
    bpm: 90,
    mood: 'Boom bap',
    audio_url: null,
    cover_url: null,
  },
  {
    id: 2,
    title: 'Panel Story',
    artist: 'Blockboy',
    user_id: null,
    bpm: 96,
    mood: 'Rough / grime',
    audio_url: null,
    cover_url: null,
  },
  {
    id: 3,
    title: 'Beton Dreams',
    artist: 'LoFi Karel',
    user_id: null,
    bpm: 82,
    mood: 'Lo-fi',
    audio_url: null,
    cover_url: null,
  },
];

const dummyArtists: Artist[] = [
  { id: 1, name: 'Northside', initials: 'NS', beatsCount: 24, projectsCount: 6, city: 'Praha' },
  { id: 2, name: 'Blockboy', initials: 'BB', beatsCount: 15, projectsCount: 3, city: 'Ostrava' },
  { id: 3, name: 'LoFi Karel', initials: 'LK', beatsCount: 19, projectsCount: 4, city: 'Brno' },
  { id: 4, name: 'GreyTone', initials: 'GT', beatsCount: 11, projectsCount: 2, city: 'Plzeň' },
  { id: 5, name: 'Elevated', initials: 'EL', beatsCount: 31, projectsCount: 7, city: 'Brno' },
  { id: 6, name: 'GoodVibe', initials: 'GV', beatsCount: 28, projectsCount: 5, city: 'Praha' },
];

const dummyProjects: Project[] = [
  {
    id: 1,
    title: 'Panel Stories EP',
    description: '6 tracků, boombap / grime, spolupráce s Třetí Vlna.',
    cover_url: null,
    tracks: [
      { id: 1, title: 'Intro / Panel Stories', duration: '2:12', plays: 6400 },
      { id: 2, title: 'Beton Loop', duration: '3:45', plays: 7200 },
      { id: 3, title: 'Sídliště Late Night', duration: '3:02', plays: 5100 },
      { id: 4, title: 'Třetí Vlna', duration: '4:18', plays: 8300 },
      { id: 5, title: 'Outro Tram 93', duration: '1:55', plays: 4200 },
      { id: 6, title: 'Bonus Cypher', duration: '3:30', plays: 3900 },
    ],
  },
  {
    id: 2,
    title: 'Beton Loops Tape',
    description: 'Lo-fi / soul, instrumentální beat tape.',
    cover_url: null,
    tracks: [
      { id: 1, title: 'Lo-Fi Entrance', duration: '2:40', plays: 5600 },
      { id: 2, title: 'Dusty Rhodes', duration: '3:11', plays: 6100 },
      { id: 3, title: 'Soulful Panels', duration: '3:54', plays: 4800 },
      { id: 4, title: 'Nightshift MPC', duration: '2:58', plays: 5300 },
      { id: 5, title: 'Metro Ride', duration: '3:20', plays: 4500 },
      { id: 6, title: 'Foggy Dawn', duration: '2:44', plays: 3700 },
      { id: 7, title: 'Tape Hiss Outro', duration: '1:51', plays: 3300 },
    ],
  },
];

type BlogPost = {
  id: number;
  title: string;
  title_en?: string | null;
  excerpt: string;
  excerpt_en?: string | null;
  body_en?: string | null;
  body?: string | null;
  author: string;
  date: string;
  cover_url?: string | null;
  embed_url?: string | null;
};

const dummyBlog: BlogPost[] = [
  {
    id: 1,
    title: 'Jak připravit beat pro rappera',
    excerpt: 'Rychlý checklist od exportu stems po gain staging a pojmenování stop.',
    body: 'Detailní postup jak připravit beat pro rappera, export stems, gain staging a pojmenování stop.',
    author: 'LoFi Karel',
    date: '12. 2. 2025',
    cover_url: '/mpc-hero.jpg',
    embed_url: '',
  },
  {
    id: 2,
    title: 'Workflow na MPC 3000: co se mi osvědčilo',
    excerpt: 'Krátký breakdown routingu, swing nastavení a práce s šablonami.',
    body: 'Moje osvědčené workflow na MPC 3000 včetně routingu, swingu a šablon pro rychlejší práci.',
    author: 'Northside',
    date: '8. 2. 2025',
    cover_url: '/mpc-hero.jpg',
    embed_url: '',
  },
  {
    id: 3,
    title: 'Jak získat spolupráci – pár tipů',
    excerpt: 'Komunikace, reference a jak posílat podklady bez zbytečných pingů.',
    body: 'Praktické tipy jak oslovit spolupracovníky, posílat podklady a domluvit se rychle bez zbytečných zpráv.',
    author: 'Blockboy',
    date: '3. 2. 2025',
    cover_url: '/mpc-hero.jpg',
    embed_url: '',
  },
];

const allowedForumCategories = ['Akai MPC hardware', 'Mix / Master', 'Spolupráce', 'Workflow'];

const HOME_CACHE_TTL_MS = 60 * 1000;
const HOME_BEATS_CACHE_KEY = 'home-beats-v1';
const HOME_PROJECTS_CACHE_KEY = 'home-projects-v3';

const readHomeCache = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; data?: T };
    if (!parsed?.ts || Date.now() - parsed.ts > HOME_CACHE_TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const writeHomeCache = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore cache write errors
  }
};

const toSupabaseThumb = (url: string, width = 640, quality = 70) => {
  if (!url) return url;
  if (url.includes('/storage/v1/render/image/public/')) return url;
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  try {
    const [base, rest] = url.split(marker);
    const path = rest.split('?')[0];
    const params = new URLSearchParams({
      width: String(width),
      quality: String(quality),
      resize: 'contain',
    });
    return `${base}/storage/v1/render/image/public/${path}?${params.toString()}`;
  } catch {
    return url;
  }
};

const videoItems = [
  { id: 1, title: 'Showcase 1', url: 'https://www.youtube.com/embed/BdzEQd1L0zk' },
  { id: 2, title: 'Showcase 2', url: 'https://www.youtube.com/embed/8LZURmGPQhc' },
  { id: 3, title: 'Showcase 3', url: 'https://www.youtube.com/embed/RuBcYA4sYJs' },
];

export default function Home() {
  const supabase = createClient();
  const [beats, setBeats] = useState<Beat[]>(dummyBeats);
  const [beatsError, setBeatsError] = useState<string | null>(null);
  const [isLoadingBeats, setIsLoadingBeats] = useState<boolean>(true);
  const [beatAuthorNames, setBeatAuthorNames] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<Project[]>(dummyProjects);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectEmbeds, setProjectEmbeds] = useState<Record<number, string>>({});
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(dummyBlog);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [isLoadingBlog, setIsLoadingBlog] = useState<boolean>(true);
  const [forumCategories, setForumCategories] = useState<{ id: string; name: string }[]>([]);
  const [newPost, setNewPost] = useState({ title: '', titleEn: '', excerpt: '', excerptEn: '', body: '', bodyEn: '', author: '', date: '', coverUrl: '', embedUrl: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [beatPage, setBeatPage] = useState(0);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<{ id: number | string; title: string; artist: string; user_id?: string | null; url: string; cover_url?: string | null } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [videoList, setVideoList] = useState(videoItems);
  const [forumError, setForumError] = useState<string | null>(null);
  const [cmsEntries, setCmsEntries] = useState<Record<string, string>>({});
  const cmsWarnedLoadRef = useRef(false);
  const cmsMissingLoggedRef = useRef<Set<string>>(new Set());
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang, key, fallback);
  const subtitleDefault =
    'Platforma pro CZ/SK beatmakery a rapery. Nahrávej instrumentály, sdílej akapely, domlouvej spolupráce.';
  const subtitleRaw = t('hero.subtitle', subtitleDefault);
  const subtitleCleaned = (subtitleRaw.includes('CZ/SK') ? subtitleRaw : subtitleDefault)
    .replace(/\s*Bez reklam.*$/i, '')
    .trim();
  const beatList = beats.length ? beats : dummyBeats;
  const beatsPerPage = 3;
  const beatTotalPages = Math.max(1, Math.ceil(beatList.length / beatsPerPage));

  // Načti CMS texty (homepage)
  // Načti CMS texty (homepage) + helpery
  const loadCms = async () => {
    try {
      const { data, error } = await supabase.from('cms_content').select('key,value').in('key', CMS_KEYS);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[] | null | undefined)?.forEach((row) => {
        if (row.key) map[row.key] = row.value;
      });
      setCmsEntries(map);

      if (map['home.video.items']) {
        try {
          const parsed = JSON.parse(map['home.video.items']);
          if (Array.isArray(parsed) && parsed.length) {
            setVideoList(
              parsed.map((v: any, idx: number) => ({
                id: v.id ?? idx + 1,
                title: v.title ?? `Video ${idx + 1}`,
                url: v.url ?? '',
              }))
            );
          }
        } catch (e) {
          if (!cmsWarnedLoadRef.current) {
            console.warn('Nepodařilo se parsovat home.video.items', e);
            cmsWarnedLoadRef.current = true;
          }
        }
      }
    } catch (err) {
      if (!cmsWarnedLoadRef.current) {
        console.warn('Nepodařilo se načíst CMS texty:', err);
        cmsWarnedLoadRef.current = true;
      }
    }
  };

  const loadArtists = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, role, slug')
        .neq('role', 'mc')
        .limit(20);

      if (error || !profiles || profiles.length === 0) {
        setArtists(dummyArtists);
        return;
      }

      const [beatsResp, projectsResp] = await Promise.all([
        supabase.from('beats').select('user_id'),
        supabase.from('projects').select('user_id'),
      ]);

      const beatMap: Record<string, number> = {};
      const projMap: Record<string, number> = {};
      (beatsResp.data as any[] | null)?.forEach((row) => {
        if (row.user_id) beatMap[row.user_id] = (beatMap[row.user_id] || 0) + 1;
      });
      (projectsResp.data as any[] | null)?.forEach((row) => {
        if (row.user_id) projMap[row.user_id] = (projMap[row.user_id] || 0) + 1;
      });

      const mapped: Artist[] = (profiles as any[]).map((p: any) => ({
        id: p.id,
        name: p.display_name || 'Bez jména',
        initials: getInitials(p.display_name || '??'),
        beatsCount: beatMap[p.id] || 0,
        projectsCount: projMap[p.id] || 0,
        city: '',
        avatar_url: p.avatar_url || null,
        user_id: (p as any)?.slug || p.id,
      }));
      setArtists(mapped);
    } catch (err) {
      console.error('Chyba při načítání umělců:', err);
      setArtists(dummyArtists);
    }
  };

  const loadBeats = async () => {
    try {
      setIsLoadingBeats(true);

      const cachedBeats = readHomeCache<Beat[]>(HOME_BEATS_CACHE_KEY);
      if (cachedBeats && cachedBeats.length > 0) {
        setBeats(cachedBeats);
        setBeatAuthorNames(
          Object.fromEntries(
            cachedBeats
              .filter((b) => b.user_id && b.artist)
              .map((b) => [b.user_id as string, b.artist])
          )
        );
        setBeatsError(null);
        setIsLoadingBeats(false);
        return;
      }

      try {
        const { data: viewData, error: viewError } = await supabase
          .from('home_beats')
          .select('id, title, artist, user_id, bpm, mood, audio_url, cover_url, created_at, display_name, avatar_url, slug, monthly_fires')
          .order('monthly_fires', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(8);

        if (!viewError && viewData && viewData.length > 0) {
          const mappedBeats = (viewData as any[]).map((b) => ({
            ...b,
            artist: b.user_id ? b.display_name || b.artist || '' : b.artist || '',
            author_avatar: b.user_id ? b.avatar_url ?? null : null,
            author_slug: b.user_id ? b.slug ?? null : null,
            monthlyFires: b.monthly_fires ?? 0,
          })) as Beat[];

          setBeatAuthorNames(
            Object.fromEntries(
              mappedBeats
                .filter((b) => b.user_id && b.artist)
                .map((b) => [b.user_id as string, b.artist])
            )
          );
          setBeats(mappedBeats);
          writeHomeCache(HOME_BEATS_CACHE_KEY, mappedBeats);
          setBeatsError(null);
          return;
        }
      } catch (err) {
        console.warn('Načtení home_beats selhalo, spouštím fallback.', err);
      }

      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('beats')
        .select('id, title, artist, user_id, bpm, mood, audio_url, cover_url, created_at')
        .not('audio_url', 'is', null)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        setBeatsError(`Nepodařilo se načíst beaty ze Supabase: ${error.message}. Zobrazuji lokální demo data.`);
        setBeats(dummyBeats);
        setBeatAuthorNames({});
      } else if (data && data.length > 0) {
        const ids = Array.from(new Set((data as any[]).map((b) => b.user_id).filter(Boolean) as string[]));
        const beatIds = Array.from(new Set((data as any[]).map((b) => b.id).filter(Boolean)));

        let profileProfiles: Record<string, { name: string; avatar_url: string | null; slug: string | null }> = {};
        if (ids.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, slug')
            .in('id', ids);
          if (profiles) {
            profileProfiles = Object.fromEntries(
              (profiles as any[]).map((p) => [
                p.id,
                { name: p.display_name || '', avatar_url: p.avatar_url || null, slug: (p as any)?.slug ?? null },
              ])
            );
            setBeatAuthorNames(Object.fromEntries(Object.entries(profileProfiles).map(([id, v]) => [id, v.name])));
          }
        }

        let firesMap: Record<string, number> = {};
        if (beatIds.length) {
          const { data: fires } = await supabase
            .from('fires')
            .select('item_id, created_at')
            .eq('item_type', 'beat')
            .in('item_id', beatIds.map(String))
            .gte('created_at', startOfMonth.toISOString());
          firesMap = (fires ?? []).reduce<Record<string, number>>((acc, row: any) => {
            const id = String(row.item_id);
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {});
        }

        const mappedBeats = (data as any[]).map((b) => ({
          ...b,
          artist: b.user_id ? profileProfiles[b.user_id]?.name || b.artist || '' : b.artist || '',
          author_avatar: b.user_id ? profileProfiles[b.user_id]?.avatar_url ?? null : null,
          author_slug: b.user_id ? profileProfiles[b.user_id]?.slug ?? null : null,
          monthlyFires: firesMap[String(b.id)] || 0,
        })) as Beat[];

        mappedBeats.sort((a, b) => {
          const fireDiff = (b.monthlyFires || 0) - (a.monthlyFires || 0);
          if (fireDiff !== 0) return fireDiff;
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        });

        if (!mappedBeats.length) {
          setBeats(dummyBeats);
          setBeatsError(null);
          setBeatAuthorNames({});
          return;
        }

        setBeats(mappedBeats);
        writeHomeCache(HOME_BEATS_CACHE_KEY, mappedBeats);
        setBeatsError(null);
      } else {
        setBeats(dummyBeats);
        setBeatsError(null);
        setBeatAuthorNames({});
      }
    } catch (err) {
      console.error('Neočekávaná chyba při načítání beatů:', err);
      setBeatsError('Neočekávaná chyba při načítání beatů. Zobrazuji lokální demo data.');
      setBeats(dummyBeats);
      setBeatAuthorNames({});
    } finally {
      setIsLoadingBeats(false);
    }
  };

  const mapProjectTracks = (p: any) => {
    const raw = p?.tracks_json;
    const parsed =
      Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
          ? (() => {
              try {
                const json = JSON.parse(raw);
                return Array.isArray(json) ? json : null;
              } catch {
                return null;
              }
            })()
          : null;
    const tracksSource = parsed ?? [];
    return tracksSource.length > 0
      ? tracksSource.map((t: any, idx: number) => ({
          id: `${p.id}-${idx + 1}`,
          title: t?.name || t?.title || `Track ${idx + 1}`,
          url: t?.url || t?.audio_url || '',
        }))
      : [];
  };

  const loadProjects = async () => {
    try {
      const cachedProjects = readHomeCache<Project[]>(HOME_PROJECTS_CACHE_KEY);
      if (cachedProjects && cachedProjects.length > 0) {
        setProjects(cachedProjects);
        setProjectsError(null);
        return;
      }

      try {
        const { data: viewData, error: viewError } = await supabase
          .from('home_projects')
          .select('id, title, description, cover_url, user_id, project_url, tracks_json, author_name, access_mode, release_formats, purchase_url, embed_html')
          .eq('access_mode', 'public')
          .order('id', { ascending: false })
          .limit(2);

        if (!viewError && viewData && viewData.length > 0) {
          const mapped = (viewData as any[]).map((p) => ({
            ...p,
            tracks: mapProjectTracks(p),
            author_name: (p as any).author_name || null,
          }));
          setProjects(mapped as Project[]);
          writeHomeCache(HOME_PROJECTS_CACHE_KEY, mapped as Project[]);
          setProjectsError(null);
          return;
        }
      } catch (err) {
        console.warn('Načtení home_projects selhalo, spouštím fallback.', err);
      }

      let data: any[] | null = null;
      try {
        const { data: d1, error: err1 } = await supabase
          .from('projects')
          .select('id, title, description, cover_url, user_id, project_url, tracks_json, author_name, access_mode, release_formats, purchase_url, embed_html')
          .eq('access_mode', 'public')
          .order('id', { ascending: false })
          .limit(2);
        if (err1) throw err1;
        data = d1 as any[] | null;
      } catch (innerErr) {
        const { data: d2, error: err2 } = await supabase
          .from('projects')
          .select('id, title, description, cover_url, user_id, project_url, tracks_json, access_mode, release_formats, purchase_url, embed_html')
          .eq('access_mode', 'public')
          .order('id', { ascending: false })
          .limit(2);
        if (err2) throw err2;
        data = d2 as any[] | null;
      }

      if (data && data.length > 0) {
        const userIds = Array.from(new Set((data || []).map((p: any) => p.user_id).filter(Boolean) as string[]));
        let profileNames: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
          if (profiles) {
            profileNames = Object.fromEntries((profiles as any[]).map((pr) => [pr.id, pr.display_name || '']));
          }
        }
        const withNames = (data as Project[]).map((p: any) => {
          const fromProfile = p.user_id ? profileNames[p.user_id] || null : null;
          return {
            ...p,
            tracks: mapProjectTracks(p),
            author_name: p.author_name || fromProfile,
          } as Project;
        });
        setProjects(withNames.slice(0, 2));
        writeHomeCache(HOME_PROJECTS_CACHE_KEY, withNames.slice(0, 2));
        setProjectsError(null);
      } else {
        setProjects(dummyProjects.slice(0, 2));
        setProjectsError(null);
      }
    } catch (err) {
      console.error('Neočekávaná chyba při načítání projektů:', err);
      setProjectsError('Neočekávaná chyba při načítání projektů. Zobrazuji demo data.');
      setProjects(dummyProjects.slice(0, 2));
    }
  };

  useEffect(() => {
    let active = true;
    const cacheKey = 'beets-embed-cache';
    const readCache = () => {
      if (typeof window === 'undefined') return {};
      try {
        return JSON.parse(window.localStorage.getItem(cacheKey) || '{}') as Record<string, string>;
      } catch {
        return {};
      }
    };
    const writeCache = (next: Record<string, string>) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    };

    const fetchEmbeds = async () => {
      const cache = readCache();
      const targets = projects.filter((project) => {
        if (project.embed_html || projectEmbeds[project.id]) return false;
        const hasPlayable = (project.tracks ?? []).some((track) => !!track.url);
        if (hasPlayable) return false;
        return !!(project.project_url || project.purchase_url);
      });
      if (!targets.length) return;
      await Promise.all(
        targets.map(async (project) => {
          try {
            const url = project.project_url || project.purchase_url || '';
            const cachedHtml = cache[url];
            if (cachedHtml && active) {
              setProjectEmbeds((prev) => ({ ...prev, [project.id]: cachedHtml }));
              return;
            }
            const response = await fetch(`/api/external-metadata?url=${encodeURIComponent(url)}`);
            if (!response.ok) return;
            const payload = await response.json();
            const html = payload?.embed_html;
            if (html && active) {
              setProjectEmbeds((prev) => ({ ...prev, [project.id]: html }));
              cache[url] = html;
              writeCache(cache);
            }
          } catch (err) {
            console.warn('Embed fetch selhal:', err);
          }
        })
      );
    };

    fetchEmbeds();
    return () => {
      active = false;
    };
  }, [projects, projectEmbeds]);

  const loadForum = async () => {
    try {
      setForumError(null);
      const { data: categories } = await supabase.from('forum_categories').select('id, name').order('name', { ascending: true });
      const allowedSet = new Set(allowedForumCategories);
      const filtered = (categories || []).filter((c: any) => c?.name && allowedSet.has(c.name));
      const inOrder = allowedForumCategories.map((name) => {
        const found = filtered.find((c: any) => c.name === name);
        return { id: found?.id || `demo-${name}`, name };
      });
      setForumCategories(inOrder);
    } catch (err) {
      console.error('Chyba načítání fóra:', err);
      setForumError('Nepodařilo se načíst data z fóra. Zobrazuji demo.');
      setForumCategories(allowedForumCategories.map((name, idx) => ({ id: `demo-${idx}`, name })));
    }
  };

  const loadBlog = async () => {
    try {
      setIsLoadingBlog(true);
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) {
        setBlogError('Nepodařilo se načíst články: ' + (error.message ?? 'Neznámá chyba'));
        setBlogPosts(dummyBlog);
      } else if (data && data.length > 0) {
        setBlogPosts(data as BlogPost[]);
        setBlogError(null);
      } else {
        setBlogPosts(dummyBlog);
        setBlogError(null);
      }
    } catch (err) {
      console.error('Nepodařilo se načíst články:', err);
      setBlogError('Nepodařilo se načíst články.');
      setBlogPosts(dummyBlog);
    } finally {
      setIsLoadingBlog(false);
    }
  };

  // Načtení všech sekcí paralelně
  useEffect(() => {
    const loadPageData = async () => {
      await Promise.allSettled([loadCms(), loadArtists(), loadBeats(), loadProjects(), loadForum(), loadBlog()]);
    };
    loadPageData();
  }, [supabase]);

  const cms = (key: string, fallback: string) => {
    const val = cmsEntries[key];
    if (val === undefined && !cmsMissingLoggedRef.current.has(key)) {
      console.warn(`CMS klíč chybí: ${key}`);
      cmsMissingLoggedRef.current.add(key);
    }
    return val ?? fallback;
  };
  const heroTitle = cms('home.hero.title', t('hero.title', 'Beets.cz'));
  const heroImageUrl = cms('home.hero.image', '').trim();
  const heroMode = cms('home.hero.mode', 'banner').trim();
  const heroBackgroundUrl = cms('home.hero.background', '').trim();
  const heroSubtitle = cms('home.hero.subtitle', subtitleCleaned);
  const visibleBeats = beatList.length
    ? Array.from({ length: Math.min(beatsPerPage, beatList.length) }, (_, idx) => {
        const start = beatPage * beatsPerPage;
        return beatList[(start + idx) % beatList.length];
      })
    : [];
  const [blogIndex, setBlogIndex] = useState(0);
  const [artistIndex, setArtistIndex] = useState(0);
  const [artists, setArtists] = useState<Artist[]>(dummyArtists);
  const [homeExpandedProjects, setHomeExpandedProjects] = useState<Record<number | string, boolean>>({});
  const {
    play: gpPlay,
    toggle: gpToggle,
    pause: gpPause,
    current: gpCurrent,
    isPlaying: gpIsPlaying,
    currentTime: gpTime,
    duration: gpDuration,
    seek: gpSeek,
    setQueue,
    setOnEnded,
    setOnNext,
    setOnPrev,
  } = useGlobalPlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setCurrentTrack(gpCurrent ? { ...gpCurrent } : null);
    setIsPlaying(gpIsPlaying);
    setCurrentTime(gpTime);
    setDuration(gpDuration);
  }, [gpCurrent, gpIsPlaying, gpTime, gpDuration]);

  const projectTrackProgress = (trackId: number | string) => {
    if (currentTrack?.id === trackId && duration) {
      return Math.min((currentTime / duration) * 100, 100);
    }
    return 0;
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return (first + second).toUpperCase();
  };

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleCuratorStar = async (itemType: "beat" | "project", itemId: string) => {
    if (!userId || userRole !== "curator") {
      alert("Kurátorská hvězda je dostupná jen pro přihlášeného kurátora.");
      return;
    }
    try {
      const { data: existing } = await supabase
        .from("fires")
        .select("id")
        .eq("item_type", "curator_star")
        .eq("item_id", itemId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        await supabase.from("fires").insert({ item_type: "curator_star", item_id: itemId, user_id: userId });
      }
    } catch (err) {
      console.error("Chyba při přidání kurátorské hvězdy:", err);
      alert("Nepodařilo se přidat hvězdu. Zkus to znovu.");
    }
  };


  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
        setUserRole((prof as any)?.role ?? null);
      } else {
        setUserRole(null);
      }
    };
    checkSession();
  }, [supabase]);

  useEffect(() => {
    const loadBeats = async () => {
      try {
        setIsLoadingBeats(true);

        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('beats')
          .select('id, title, artist, user_id, bpm, mood, audio_url, cover_url, created_at')
          .not('audio_url', 'is', null)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) {
          setBeatsError(`Nepodařilo se načíst beaty ze Supabase: ${error.message}. Zobrazuji lokální demo data.`);
          setBeats(dummyBeats);
          setBeatAuthorNames({});
        } else if (data && data.length > 0) {
          const ids = Array.from(new Set((data as any[]).map((b) => b.user_id).filter(Boolean) as string[]));
          const beatIds = Array.from(new Set((data as any[]).map((b) => b.id).filter(Boolean)));

          // Jména autorů
          let profileProfiles: Record<string, { name: string; avatar_url: string | null; slug: string | null }> = {};
          if (ids.length) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url, slug')
              .in('id', ids);
            if (profiles) {
              profileProfiles = Object.fromEntries(
                (profiles as any[]).map((p) => [
                  p.id,
                  { name: p.display_name || '', avatar_url: p.avatar_url || null, slug: (p as any)?.slug ?? null },
                ])
              );
              setBeatAuthorNames(Object.fromEntries(Object.entries(profileProfiles).map(([id, v]) => [id, v.name])));
            }
          }

          // Měsíční ohně pro každého beatu
          let firesMap: Record<string, number> = {};
          if (beatIds.length) {
            const { data: fires } = await supabase
              .from('fires')
              .select('item_id, created_at')
              .eq('item_type', 'beat')
              .in('item_id', beatIds.map(String))
              .gte('created_at', startOfMonth.toISOString());
            firesMap = (fires ?? []).reduce<Record<string, number>>((acc, row: any) => {
              const id = String(row.item_id);
              acc[id] = (acc[id] || 0) + 1;
              return acc;
            }, {});
          }

          const mappedBeats = (data as any[]).map((b) => ({
            ...b,
            artist: b.user_id ? profileProfiles[b.user_id]?.name || b.artist || '' : b.artist || '',
            author_avatar: b.user_id ? profileProfiles[b.user_id]?.avatar_url ?? null : null,
            author_slug: b.user_id ? profileProfiles[b.user_id]?.slug ?? null : null,
            monthlyFires: firesMap[String(b.id)] || 0,
          })) as Beat[];

          mappedBeats.sort((a, b) => {
            const fireDiff = (b.monthlyFires || 0) - (a.monthlyFires || 0);
            if (fireDiff !== 0) return fireDiff;
            const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bDate - aDate;
          });

          if (!mappedBeats.length) {
            setBeats(dummyBeats);
            setBeatsError(null);
            setBeatAuthorNames({});
            return;
          }

          setBeats(mappedBeats);
          setBeatsError(null);
        } else {
          setBeats(dummyBeats);
          setBeatsError(null);
          setBeatAuthorNames({});
        }
      } catch (err) {
        console.error('Neočekávaná chyba při načítání beatů:', err);
        setBeatsError('Neočekávaná chyba při načítání beatů. Zobrazuji lokální demo data.');
        setBeats(dummyBeats);
        setBeatAuthorNames({});
      } finally {
        setIsLoadingBeats(false);
      }
    };

    loadBeats();
  }, [supabase]);

  useEffect(() => {
    setBeatPage(0);
  }, [beats.length]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        let data: any[] | null = null;
        try {
          const { data: d1, error: err1 } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, user_id, project_url, tracks_json, author_name, access_mode, release_formats, purchase_url')
            .eq('access_mode', 'public')
            .order('id', { ascending: false })
            .limit(2);
          if (err1) throw err1;
          data = d1 as any[] | null;
        } catch (innerErr) {
          // Fallback pro schéma bez author_name
          console.warn('Fallback načítání projektů bez author_name:', innerErr);
            const { data: d2, error: err2 } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, user_id, project_url, tracks_json, access_mode, release_formats, purchase_url')
            .eq('access_mode', 'public')
            .order('id', { ascending: false })
            .limit(2);
          if (err2) throw err2;
          data = d2 as any[] | null;
        }

        if (data && data.length > 0) {
          const mapped = (data as any[]).map((p) => {
            const raw = (p as any).tracks_json;
            const parsed =
              Array.isArray(raw)
                ? raw
                : typeof raw === 'string'
                  ? (() => {
                      try {
                        const json = JSON.parse(raw);
                        return Array.isArray(json) ? json : null;
                      } catch {
                        return null;
                      }
                    })()
                  : null;
            const tracksSource = parsed ?? [];
            const tracks =
              tracksSource.length > 0
                ? tracksSource.map((t: any, idx: number) => ({
                    id: `${p.id}-${idx + 1}`,
                    title: t?.name || t?.title || `Track ${idx + 1}`,
                    url: t?.url || t?.audio_url || '',
                  }))
                : (p as any).project_url
                  ? [
                      {
                        id: `${p.id}-1`,
                        title: p.title || 'Ukázka projektu',
                        url: (p as any).project_url,
                      },
                    ]
                  : [];

            return {
              ...p,
              tracks,
              author_name: (p as any).author_name || null,
            };
          });
          const userIds = Array.from(
            new Set(mapped.map((p: any) => p.user_id).filter(Boolean) as string[]),
          );
          let profileNames: Record<string, string> = {};
          if (userIds.length) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, display_name')
              .in('id', userIds);
            if (profiles) {
              profileNames = Object.fromEntries(
                (profiles as any[]).map((pr) => [pr.id, pr.display_name || ''])
              );
            }
          }
          const withNames = mapped.map((p: any) => {
            const fromProfile = p.user_id ? profileNames[p.user_id] || null : null;
            return {
              ...p,
              author_name: p.author_name || fromProfile,
            };
          });
          setProjects((withNames as Project[]).slice(0, 2));
          setProjectsError(null);
        } else {
          setProjects(dummyProjects.slice(0, 2));
          setProjectsError(null);
        }
      } catch (err) {
        console.error('Neočekávaná chyba při načítání projektů:', err);
        setProjectsError('Neočekávaná chyba při načítání projektů. Zobrazuji demo data.');
        setProjects(dummyProjects.slice(0, 2));
      }
    };

    loadProjects();
  }, [supabase]);

  useEffect(() => {
    const loadForum = async () => {
      try {
        setForumError(null);
        const { data: categories } = await supabase
          .from('forum_categories')
          .select('id, name')
          .order('name', { ascending: true });
        const allowedSet = new Set(allowedForumCategories);
        const filtered = (categories || []).filter((c: any) => c?.name && allowedSet.has(c.name));
        const inOrder = allowedForumCategories.map((name) => {
          const found = filtered.find((c: any) => c.name === name);
          return { id: found?.id || `demo-${name}`, name };
        });
        setForumCategories(inOrder);
      } catch (err) {
        console.error('Chyba načítání fóra:', err);
        setForumError('Nepodařilo se načíst data z fóra. Zobrazuji demo.');
        setForumCategories(
          allowedForumCategories.map((name, idx) => ({ id: `demo-${idx}`, name }))
        );
      }
    };
    loadForum();
  }, [supabase]);

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setIsLoadingBlog(true);
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url')
          .order('created_at', { ascending: false })
          .limit(6);
        if (error) {
          setBlogError('Nepodařilo se načíst články: ' + (error.message ?? 'Neznámá chyba'));
          setBlogPosts(dummyBlog);
        } else if (data && data.length > 0) {
          setBlogPosts(data as BlogPost[]);
          setBlogError(null);
        } else {
          setBlogPosts(dummyBlog);
          setBlogError(null);
        }
      } catch (err) {
        console.error('Nepodařilo se načíst články:', err);
        setBlogError('Nepodařilo se načíst články.');
        setBlogPosts(dummyBlog);
      } finally {
        setIsLoadingBlog(false);
      }
    };
    loadBlog();
  }, [supabase]);

  const yearToShow = currentYear ?? 2025;

  function handlePlay(url: string | null | undefined, beat: { id: number | string; title: string; artist: string; cover_url?: string | null; user_id?: string | null }) {
    if (!url) {
      setPlayerError('Audio URL není k dispozici.');
      return;
    }
    setPlayerError(null);
    const track = { id: beat.id, title: beat.title, artist: beat.artist, user_id: beat.user_id, url, cover_url: beat.cover_url };
    setCurrentTrack(track);
    gpPlay(track);
    const playable = beats.filter((b) => b.audio_url);
    if (playable.length <= 1) {
      setOnEnded(null);
      setOnNext?.(null);
      setOnPrev?.(null);
      return;
    }
    setOnNext?.(() => {
      const idx = playable.findIndex((b) => b.id === beat.id);
      const nextIdx = idx === -1 ? 0 : (idx + 1) % playable.length;
      const next = playable[nextIdx];
      if (next?.audio_url) handlePlay(next.audio_url, next);
    });
    setOnPrev?.(() => {
      const idx = playable.findIndex((b) => b.id === beat.id);
      const prevIdx = idx === -1 ? playable.length - 1 : (idx - 1 + playable.length) % playable.length;
      const prev = playable[prevIdx];
      if (prev?.audio_url) handlePlay(prev.audio_url, prev);
    });
    setOnEnded(() => {
      const idx = playable.findIndex((b) => b.id === beat.id);
      if (idx === -1) {
        setOnEnded(null);
        return;
      }
      for (let i = idx + 1; i < playable.length; i++) {
        const next = playable[i];
        if (next.audio_url) {
          handlePlay(next.audio_url, next);
          return;
        }
      }
      setOnEnded(null);
    });
  }

  function handlePlayProjectTrack(
    project: Project,
    track: { id: number | string; title: string; url?: string | null },
    idx?: number
  ) {
    if (!track.url) {
      setPlayerError('Pro tuto skladbu chybí audio URL.');
      return;
    }

    setPlayerError(null);
    const payload = {
      id: track.id,
      title: track.title,
      artist: project.author_name || project.title,
      user_id: project.user_id,
      url: track.url,
      cover_url: project.cover_url ?? undefined,
    };
    setCurrentTrack(payload);
    gpPlay(payload);
    const tracksList = project.tracks || [];
    const startIdx =
      typeof idx === 'number' ? idx : tracksList.findIndex((t) => (t as any).id === track.id);
    if (startIdx === -1 || tracksList.length <= startIdx + 1) {
      setOnEnded(null);
      setOnNext?.(null);
      setOnPrev?.(null);
      return;
    }
    const playByIndex = (i: number) => {
      const next = tracksList[i];
      const nextUrl = (next as any)?.url as string | undefined;
      if (nextUrl) {
        handlePlayProjectTrack(project, { id: next.id ?? `${project.id}-${i + 1}`, title: next.title, url: nextUrl }, i);
      }
    };
    setOnNext?.(() => {
      let i = startIdx + 1;
      while (i < tracksList.length) {
        const n = tracksList[i];
        if ((n as any)?.url) {
          playByIndex(i);
          return;
        }
        i++;
      }
    });
    setOnPrev?.(() => {
      let i = startIdx - 1;
      while (i >= 0) {
        const n = tracksList[i];
        if ((n as any)?.url) {
          playByIndex(i);
          return;
        }
        i--;
      }
    });
    setOnEnded(() => {
      for (let i = startIdx + 1; i < tracksList.length; i++) {
        const next = tracksList[i];
        const nextUrl = (next as any).url as string | undefined;
        if (nextUrl) {
          handlePlayProjectTrack(project, { id: next.id ?? `${project.id}-${i + 1}`, title: next.title, url: nextUrl }, i);
          return;
        }
      }
      setOnEnded(null);
    });
  }

  function renderTrackBars(seedA: number | string, seedB: number | string) {
    const pct = projectTrackProgress(`${seedA}-${seedB}`);
    return (
      <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-black/40">
        <div
          className="h-full rounded-full bg-[var(--mpc-accent)] transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }

  function togglePlayPause() {
    gpToggle();
  }

  function handleNext() {
    return;
  }

  function handlePrev() {
    return;
  }

  function seekInTrack(beat: Beat, clientX: number, targetWidth: number) {
    if (!currentTrack || currentTrack.id !== beat.id || !duration) return;
    const ratio = Math.min(Math.max(clientX / targetWidth, 0), 1);
    gpSeek(ratio);
  }

  function closePlayer() {
    gpPause();
    setCurrentTrack(null);
    setPlayerError(null);
  }

  useEffect(() => {
    return;
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    return;
  }, [volume]);

  // Waveform analyser setup
  useEffect(() => {
    return;
  }, [currentTrack, volume]);

  function formatTime(sec: number) {
    if (!sec || Number.isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  function nextVideo() {
    const len = videoList.length || videoItems.length;
    if (!len) return;
    setVideoIndex((prev) => (prev + 1) % len);
  }

  function prevVideo() {
    const len = videoList.length || videoItems.length;
    if (!len) return;
    setVideoIndex((prev) => (prev - 1 + len) % len);
  }

  function nextBlog() {
    if (!blogPosts.length) return;
    setBlogIndex((prev) => (prev + 1) % blogPosts.length);
  }

  function prevBlog() {
    if (!blogPosts.length) return;
    setBlogIndex((prev) => (prev - 1 + blogPosts.length) % blogPosts.length);
  }

  async function uploadCoverToStorage(file: File) {
    setUploadingCover(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `covers/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('blog_covers').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('blog_covers').getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.author.trim() || !newPost.date.trim() || !newPost.excerpt.trim() || !newPost.body.trim()) {
      setBlogError('Vyplň název, autora, datum, perex i celý text.');
      return;
    }
    setIsSavingPost(true);
    setBlogError(null);
    try {
      let coverUrl = newPost.coverUrl.trim();
      if (coverFile) {
        coverUrl = await uploadCoverToStorage(coverFile);
      }
      const payload = {
        title: newPost.title.trim(),
        title_en: newPost.titleEn.trim() || newPost.title.trim(),
        author: newPost.author.trim(),
        date: newPost.date.trim(),
        excerpt: newPost.excerpt.trim(),
        excerpt_en: newPost.excerptEn.trim() || newPost.excerpt.trim(),
        body: newPost.body.trim(),
        body_en: newPost.bodyEn.trim() || newPost.body.trim(),
        cover_url: coverUrl || null,
        embed_url: newPost.embedUrl.trim() || null,
      };
      const { data, error } = await supabase
        .from('posts')
        .insert(payload)
        .select('id, title, title_en, excerpt, excerpt_en, body, body_en, author, date, cover_url, embed_url')
        .single();
      if (error) throw error;
      if (data) {
        setBlogPosts((prev) => [{ ...(data as BlogPost) }, ...prev]);
      }
      setNewPost({ title: '', titleEn: '', excerpt: '', excerptEn: '', body: '', bodyEn: '', author: '', date: '', coverUrl: '', embedUrl: '' });
      setCoverFile(null);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Nepodařilo se uložit článek.';
      setBlogError(msg);
    } finally {
      setIsSavingPost(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)] pb-24">
      <audio
        ref={audioRef}
        className="hidden"
        crossOrigin="anonymous"
        onEnded={() => {
          if (isRepeat) {
            const el = audioRef.current;
            if (el) el.currentTime = 0;
            setIsPlaying(true);
            return;
          }
          handleNext();
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onError={() => setPlayerError('Audio se nepodařilo načíst nebo přehrát.')}
      />

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/85 px-4 py-3 text-sm text-[var(--mpc-muted)] backdrop-blur">
          <div className="relative mx-auto flex max-w-6xl items-center gap-4 pr-8">
            <button
              onClick={closePlayer}
              className="absolute -right-6 -top-2 grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="Zavřít přehrávač"
            >
              ×
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:border-[var(--mpc-accent)]"
                title="Předchozí"
              >
                «
              </button>
              <button
                onClick={togglePlayPause}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-black shadow-md hover:scale-105 transition"
                title={isPlaying ? 'Pauza' : 'Přehrát'}
              >
                {isPlaying ? '▮▮' : '►'}
              </button>
              <button
                onClick={handleNext}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:border-[var(--mpc-accent)]"
                title="Další"
              >
                »
              </button>
            </div>
            <div className="flex flex-col min-w-[180px]">
              <span className="font-semibold text-white leading-tight">{currentTrack.title}</span>
              {currentTrack.user_id && currentTrack.user_id !== 'undefined' ? (
                <Link href={`/u/${currentTrack.user_id}`} className="text-xs text-[var(--mpc-muted)] hover:text-white">
                  {currentTrack.artist}
                </Link>
              ) : (
                <span className="text-xs text-[var(--mpc-muted)]">{currentTrack.artist}</span>
              )}
            </div>
            <div className="flex flex-1 items-center gap-3">
              <span className="w-12 text-right text-[11px] text-[var(--mpc-muted)]">
                {formatTime(currentTime)}
              </span>
              <div className="flex w-full flex-col gap-1">
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={80}
                  className="w-full rounded bg-black/50"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
                    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                    const el = audioRef.current;
                    if (!el || !duration) return;
                    const next = ratio * duration;
                    el.currentTime = next;
                    setCurrentTime(next);
                    setIsPlaying(true);
                    void el.play();
                  }}
                />
                <div className="h-1 w-full rounded bg-white/10">
                  <div
                    className="h-full rounded bg-[var(--mpc-accent)]"
                    style={{
                      width: duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%',
                    }}
                  />
                </div>
              </div>
              <span className="w-12 text-left text-[11px] text-[var(--mpc-muted)]">
                {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShuffle((p) => !p)}
                className={`rounded-full border border-white/20 px-3 py-1 text-[11px] ${isShuffle ? 'bg-[var(--mpc-accent)] text-white' : 'bg-white/10 text-white hover:border-[var(--mpc-accent)]'}`}
                title="Shuffle"
              >
                ⤨
              </button>
              <button
                onClick={() => setIsRepeat((p) => !p)}
                className={`rounded-full border border-white/20 px-3 py-1 text-[11px] ${isRepeat ? 'bg-[var(--mpc-accent)] text-white' : 'bg-white/10 text-white hover:border-[var(--mpc-accent)]'}`}
                title="Repeat"
              >
                ⟳
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--mpc-muted)]">🔊</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1 w-24 cursor-pointer accent-[var(--mpc-accent)]"
                />
              </div>
            </div>
            {currentTrack.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentTrack.cover_url}
                alt="cover"
                className="h-10 w-10 rounded-md object-cover border border-white/15"
              />
            )}
            {playerError && <span className="text-[var(--mpc-accent)]">{playerError}</span>}
          </div>
        </div>
      )}

      <MainNav />

      <main className="mx-auto flex max-w-6xl flex-col items-center px-4 text-center">
        {/* HERO */}
        <section
          className="relative grid w-full grid-cols-1 items-center gap-6 overflow-hidden rounded-2xl border border-white/15 px-4 py-10 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
          style={{
            backgroundImage:
              'linear-gradient(125deg, rgba(0,0,0,0.82), rgba(0,0,0,0.7)), url("/mpc-hero.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_85%,rgba(243,116,51,0.28),rgba(243,116,51,0)_40%)]" />
          <div className="pointer-events-none absolute -left-12 top-6 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(26,138,98,0.35),rgba(26,138,98,0))] blur-2xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(243,116,51,0.32),rgba(243,116,51,0))] blur-3xl" />
          <div className="relative flex flex-col items-center gap-4 text-center sm:gap-5">
            {heroMode === 'banner' && heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt={heroTitle}
                className="max-w-[760px] w-full h-auto drop-shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <div
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-4 ${
                  heroBackgroundUrl ? 'border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.45)]' : ''
                }`}
                style={
                  heroBackgroundUrl
                    ? {
                        backgroundImage: `linear-gradient(120deg, rgba(0,0,0,0.65), rgba(0,0,0,0.35)), url(${heroBackgroundUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                <h1 className="font-hero-nueva text-[2.4rem] sm:text-[clamp(2.3rem,3vw+1rem,4.4rem)] font-black uppercase leading-tight tracking-[0.18em] text-white drop-shadow-[0_12px_36px_rgba(0,0,0,0.55)]">
                  {heroTitle}
                </h1>
              </div>
            )}
            <p className="max-w-3xl text-[var(--mpc-muted)] text-[15px] leading-relaxed sm:text-base">
              {cms('home.hero.subtitle', subtitleCleaned)}
              <br />
              {cms('home.hero.subtitle2', t('hero.subtitle2', 'Bez reklam a nesmyslů, jen hudba.'))}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/komunita"
                className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)] transition hover:translate-y-[1px]"
              >
                {cms('home.hero.cta', 'Více o platformě')}
              </Link>
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section className="w-full py-8" id="projects">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">
              {cms('home.projects.title', t('projects.title', 'Nejnovější projekty'))}
            </h2>
          </div>
          {projectsError && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <span>⚠</span> {projectsError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const hasPlayable = (project.tracks ?? []).some((track) => !!track.url);
              const isExternalProject =
                !hasPlayable && (!!project.project_url || !!project.embed_html || !!projectEmbeds[project.id]);
              const externalPlatform = getExternalPlatform(project.project_url || project.purchase_url);
              const externalUrl = project.project_url || project.purchase_url;

              return (
                <div
                  key={project.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
                >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  {userRole === 'curator' && (
                    <button
                      onClick={() => handleCuratorStar('project', `project-${project.id}`)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-yellow-400/60 bg-yellow-500/20 text-yellow-200 text-lg hover:bg-yellow-500/30"
                      title="Kurátorská hvězda"
                    >
                      ★
                    </button>
                  )}
                  <FireButton itemType="project" itemId={`project-${project.id}`} className="scale-90" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="h-40 w-40 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                    {project.user_id ? (
                      <Link href={`/u/${project.user_id}`} className="block h-full w-full">
                        {project.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toSupabaseThumb(project.cover_url, 640)}
                            alt={project.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                            NO COVER
                          </div>
                        )}
                      </Link>
                    ) : project.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toSupabaseThumb(project.cover_url, 640)}
                        alt={project.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                        NO COVER
                      </div>
                    )}
                  </div>
                    <div className="text-center space-y-1">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                      {project.user_id && project.author_name ? (
                        <Link href={`/u/${project.user_id}`} className="text-white hover:text-[var(--mpc-accent)]">
                          Autor: {project.author_name}
                        </Link>
                      ) : project.author_name ? (
                        <>Autor: {project.author_name}</>
                      ) : (
                        'Autor projektu'
                        )}
                      </p>
                    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-white">
                      <span>{project.title}</span>
                    </div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                    Beat tape / EP
                  </div>
                  <p className="text-sm text-[var(--mpc-muted)] max-w-2xl">
                    {project.description || 'Instrumentální beat tape.'}
                  </p>
                </div>
                </div>

                <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-3">
                  {isExternalProject ? (
                    <div className="space-y-2">
                      <p className="text-center text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Přehrávač</p>
                      <div
                        className="min-h-[120px] overflow-hidden rounded-lg border border-white/10 bg-black/80 [&_iframe]:!h-[120px] [&_iframe]:!w-full [&_iframe]:!border-0"
                        dangerouslySetInnerHTML={{ __html: normalizeEmbedHtml(project.embed_html || projectEmbeds[project.id] || '') }}
                      />
                    </div>
                  ) : (
                    <div className="mx-auto flex max-w-3xl items-center gap-3">
                      <button
                        onClick={() =>
                          project.tracks && project.tracks[0] ? handlePlayProjectTrack(project, project.tracks[0], 0) : null
                        }
                        className="grid h-12 w-12 place-items-center rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-lg text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)]"
                      >
                        {currentTrack?.id === project.tracks?.[0]?.id && isPlaying ? '▮▮' : '►'}
                      </button>
                      <div className="flex-1">
                        <p className="text-center text-sm font-semibold text-white">
                          {project.tracks && project.tracks[0] ? project.tracks[0].title : 'Tracklist není k dispozici'}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="h-3 overflow-hidden rounded-full bg-black/70">
                            <div
                              className="h-full rounded-full bg-[var(--mpc-accent,#00e096)] transition-all duration-150"
                              style={{ width: `${project.tracks && project.tracks[0] ? projectTrackProgress(project.tracks[0].id) : 0}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                            <span>0 s</span>
                            <span>{duration ? formatTime(duration) : '-- s'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isExternalProject && project.tracks && project.tracks.length > 1 && (
                  <div className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">Tracklist</span>
                      <button
                        onClick={() =>
                          setHomeExpandedProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                        }
                        className={`grid h-10 w-10 place-items-center rounded-full border text-white transition ${
                          homeExpandedProjects[project.id]
                            ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                            : 'border-white/20 bg-white/5'
                        }`}
                        aria-label="Tracklist"
                      >
                        <span
                          className="text-base font-bold transition-transform"
                          style={{ transform: homeExpandedProjects[project.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          ▼
                        </span>
                      </button>
                    </div>
                    {homeExpandedProjects[project.id] && (
                      <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
                        {project.tracks.slice(1).map((t, i) => (
                          <div
                            key={t.id ?? `${project.id}-${i + 2}`}
                            className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <span className="w-6 text-[11px] text-[var(--mpc-muted)]">
                                  {i + 2}.
                                </span>
                                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded border border-white/10 bg-white/5">
                                  {project.cover_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={project.cover_url} alt={t.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] text-[var(--mpc-muted)]">TR</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{t.title}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handlePlayProjectTrack(project, t, i + 1)}
                                className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)] px-2 py-1 text-white shadow-[0_6px_14px_rgba(243,116,51,0.35)] hover:border-[var(--mpc-accent)]"
                              >
                                {currentTrack?.id === t.id && isPlaying ? '▮▮' : '►'}
                              </button>
                            </div>
                            <div className="flex items-center rounded bg-black/30 px-2 py-2">
                              {renderTrackBars(project.id, t.id)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isExternalProject ? (
                  <div className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Vydáno na</span>
                      {externalUrl && (
                        <a
                          href={normalizePurchaseUrl(externalUrl) || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                        >
                          {externalPlatform || 'Otevřít'}
                        </a>
                      )}
                    </div>
                  </div>
                ) : (project.release_formats && project.release_formats.length > 0) || project.purchase_url ? (
                  <div className="mt-3 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        <span>Vydáno na</span>
                        {(project.release_formats || []).map((format) => (
                          <span
                            key={format}
                            className="rounded-full border border-white/15 bg-black/50 px-2 py-1 text-[10px] text-white"
                          >
                            {RELEASE_FORMAT_LABELS[format] || format}
                          </span>
                        ))}
                      </div>
                      {project.purchase_url && (
                        <a
                          href={normalizePurchaseUrl(project.purchase_url) || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                        >
                          Koupit
                        </a>
                      )}
                    </div>
                  </div>
                ) : null}
                </div>
              );
            })}
          </div>
        </section>


        {/* ARTISTS (carousel) */}
        <section className="w-full py-12" id="artists">
          <div className="relative mb-6 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-xl font-semibold tracking-[0.2em] uppercase">Umělci</h2>
            <Link
              href="/artists"
              className="absolute right-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
            >
              Zobrazit vše
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => {
              const list = artists.length ? artists : dummyArtists;
              const artist = list[(artistIndex + idx) % list.length];
              const stats = `${artist.beatsCount ?? 0} beatů · ${artist.projectsCount ?? 0} projektů`;
              const colors = [
                'from-emerald-600 to-emerald-900',
                'from-amber-400 to-orange-600',
                'from-indigo-500 to-indigo-900',
                'from-purple-500 to-purple-800',
                'from-rose-500 to-rose-800',
                'from-sky-500 to-sky-900',
              ];
              const gradient = colors[idx % colors.length];
              return (
                <Link
                  href={`/u/${artist.id}`}
                  key={artist.id}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_12px_28px_rgba(0,0,0,0.35)] hover:border-[var(--mpc-accent)]"
                >
                  <div
                  className={`relative h-24 w-24 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br ${gradient} shadow-[0_12px_26px_rgba(0,0,0,0.35)]`}
                >
                  {artist.avatar_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                    </>
                  ) : (
                      <div className="absolute inset-0 grid place-items-center text-xl font-black text-white">
                        {artist.initials}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-center w-full">
                    <p className="text-base font-semibold text-white">{artist.name}</p>
                    <p className="text-[12px] text-[var(--mpc-muted)]">{stats}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const list = artists.length ? artists : dummyArtists;
                setArtistIndex((prev) => (prev - 1 + list.length) % list.length);
              }}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
            >
              ←
            </button>
            <button
              onClick={() => {
                const list = artists.length ? artists : dummyArtists;
                setArtistIndex((prev) => (prev + 1) % list.length);
              }}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
            >
              →
            </button>
          </div>
        </section>

        {/* BLOG */}
        <section className="w-full py-8" id="blog">
          <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3 text-center">
            <div className="flex flex-1 items-center justify-center gap-3">
              <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">
                {t('blog.title', 'News from Beats')}
              </h2>
              {isLoadingBlog && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám články…</p>}
            </div>
          </div>
          {blogError && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <span>⚠</span> {blogError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {(blogPosts.length ? Array.from({ length: Math.min(3, blogPosts.length) }, (_, i) => blogPosts[(blogIndex + i) % blogPosts.length]) : []).map((post) => {
              const displayTitle = lang === 'en' && post.title_en?.trim() ? post.title_en : post.title;
              const displayExcerpt = lang === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt;
              return (
              <article
                key={post.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_32px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
              >
                <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  {post.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_url}
                      alt={post.title}
                      className="h-full w-full object-contain bg-black"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700/40 to-emerald-900/60 text-[12px] uppercase tracking-[0.12em] text-white/70">
                      Bez coveru
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--mpc-muted)]">
                  <span>{post.author}</span>
                  <span>{post.date}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{displayTitle}</h3>
                <p className="text-sm text-[var(--mpc-muted)]">{displayExcerpt}</p>
                <div className="flex items-center justify-center">
                  <Link
                    href={`/blog/${post.id}`}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
                  >
                    {t('blog.readMore', 'Celý článek')}
                  </Link>
                </div>
              </article>
            )})}
          </div>

          {blogPosts.length > 3 && (
            <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-[var(--mpc-muted)]">
              <button
                onClick={prevBlog}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                ←
              </button>
              <button
                onClick={nextBlog}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                →
              </button>
            </div>
          )}
        </section>

        {/* BEATS */}
        <section className="w-full py-8" id="beats">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">TOP beaty</h2>
            {isLoadingBeats && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám beaty…</p>}
          </div>
          {beatsError && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <span>⚠</span> {beatsError}
            </div>
          )}
          {isLoadingBeats && !beatsError && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-80 w-full animate-pulse rounded-2xl bg-white/5 border border-white/10" />
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full">
            {visibleBeats.map((beat) => (
              <div
                key={beat.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 shadow-none backdrop-blur transition hover:border-[var(--mpc-accent)] sm:p-5 sm:shadow-[0_16px_40px_rgba(0,0,0,0.35)] max-w-md w-full mx-auto"
              >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  {userRole === 'curator' && (
                    <button
                      onClick={() => handleCuratorStar('beat', String(beat.id))}
                      className="grid h-10 w-10 place-items-center rounded-full border border-yellow-400/60 bg-yellow-500/20 text-yellow-200 text-lg hover:bg-yellow-500/30"
                      title="Kurátorská hvězda"
                    >
                      ★
                    </button>
                  )}
                  <FireButton itemType="beat" itemId={String(beat.id)} className="scale-90" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="h-32 w-32 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                    {beat.user_id ? (
                      <Link href={`/u/${beat.user_id}`} className="block h-full w-full">
                        {beat.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toSupabaseThumb(beat.cover_url, 512)}
                            alt={beat.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                            NO COVER
                          </div>
                        )}
                      </Link>
                    ) : beat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toSupabaseThumb(beat.cover_url, 512)}
                        alt={beat.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                        NO COVER
                      </div>
                    )}
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                      {beat.user_id ? (
                        <Link href={`/u/${beat.user_id}`} className="text-white hover:text-[var(--mpc-accent)]">
                          {beatAuthorNames[beat.user_id] || beat.artist}
                        </Link>
                      ) : (
                        beat.artist
                      )}
                    </p>
                    <div className="text-lg font-semibold text-white">{beat.title}</div>
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                    {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                  </div>
                </div>

                <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-3">
                  <div className="mx-auto flex max-w-3xl items-center gap-3">
                    <button
                      className="grid h-12 w-12 min-h-[48px] min-w-[48px] place-items-center rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-lg text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] disabled:opacity-50"
                      onClick={() => {
                        if (gpCurrent?.id === beat.id) {
                          gpToggle();
                        } else {
                          handlePlay(beat.audio_url, beat);
                        }
                      }}
                      disabled={!beat.audio_url}
                    >
                      {gpCurrent?.id === beat.id && gpIsPlaying ? '▮▮' : '►'}
                    </button>
                    <div className="flex-1">
                      <p className="text-center text-sm font-semibold text-white">{beat.title}</p>
                      <div className="mt-2 space-y-1">
                        <div
                            className="overflow-hidden rounded-full border border-white/10 bg-white/10 cursor-pointer h-3"
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                              seekInTrack(beat, e.clientX - rect.left, rect.width);
                            }}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--mpc-accent)] transition-all duration-150"
                              style={{
                                width:
                                  currentTrack?.id === beat.id && duration
                                    ? `${(currentTime / duration) * 100}%`
                                    : '0%',
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                            <span>{currentTrack?.id === beat.id ? formatTime(currentTime) : '0:00'}</span>
                            <span>
                              {currentTrack?.id === beat.id && duration ? formatTime(duration) : '--:--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {beatList.length > beatsPerPage && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => setBeatPage((prev) => (prev - 1 + beatTotalPages) % beatTotalPages)}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                ←
              </button>
              <button
                onClick={() => setBeatPage((prev) => (prev + 1) % beatTotalPages)}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                →
              </button>
            </div>
          )}
        </section>

        {/* COMMUNITY */}
        <section className="w-full py-8" id="community">
          <div className="max-w-4xl mx-auto flex flex-col items-center gap-2 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">Komunita · Fórum</h2>
            <p className="text-[12px] text-[var(--mpc-muted)]">Diskuze, feedback, rychlé domluvy</p>
          </div>

          <div className="mt-4 space-y-3 max-w-4xl mx-auto">
            {forumError && (
              <div className="rounded-md border border-yellow-700/40 bg-yellow-900/25 px-3 py-2 text-xs text-yellow-100">
                {forumError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {forumCategories.map((cat) => (
                <Link
                  href="/forum"
                  key={cat.id}
                  className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur hover:border-[var(--mpc-accent)] transition"
                >
                  <span className="rounded-full bg-[var(--mpc-accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-accent)]">
                    {cat.name}
                  </span>
                  <p className="text-sm text-[var(--mpc-muted)]">Klikni pro nejnovější vlákna.</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              href="/forum"
              className="flex w-full max-w-4xl flex-col items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-[#0f1f1a] to-[#0a130f] p-5 text-sm text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]"
            >
              <div className="text-center space-y-1">
                <p className="text-base font-semibold text-white">{t('forum.cta.title', 'Přejít do fóra')}</p>
                <p>{t('forum.cta.subtitle', 'Hledej spolupráce, feedback na mix, nebo domluv vydání.')}</p>
              </div>
              <span className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]">
                {t('forum.cta.button', 'Otevřít fórum')}
              </span>
            </Link>
          </div>
        </section>

        {/* VIDEO */}
        <section className="w-full py-8" id="video">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">Video</h2>
          </div>
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)] sm:w-[90%] md:w-[80%]">
            <div className="relative w-full aspect-square md:aspect-video">
              {videoList.length === 0 ? (
                <div className="grid h-full w-full place-items-center rounded-xl border border-white/10 bg-black/40 text-[var(--mpc-muted)]">
                  Žádná videa nejsou k dispozici.
                </div>
              ) : (
                <iframe
                  key={videoList[videoIndex % videoList.length].id}
                  className="absolute inset-0 h-full w-full rounded-xl"
                  src={videoList[videoIndex % videoList.length].url}
                  title={videoList[videoIndex % videoList.length].title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
            <div className="flex items-center justify-center gap-3 w-full text-sm text-[var(--mpc-muted)]">
              <button
                onClick={prevVideo}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                ←
              </button>
              <button
                onClick={nextVideo}
                className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-white hover:border-[var(--mpc-accent)]"
              >
                →
              </button>
            </div>
          </div>
        </section>

        {/* INFO */}
        <section className="w-full py-8" id="info">
          <div className="grid gap-4 md:grid-cols-3 text-center">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
              <h3 className="text-base font-semibold">Pro producenty</h3>
              <p className="text-sm text-[var(--mpc-muted)]">Nahrávej beaty, sdílej instrumentály, feedback od CZ/SK komunity.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
              <h3 className="text-base font-semibold">Pro rapery</h3>
              <p className="text-sm text-[var(--mpc-muted)]">Hledej beaty, domlouvej spolupráce, přidávej akapely.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
              <h3 className="text-base font-semibold">CZ / SK komunita</h3>
              <p className="text-sm text-[var(--mpc-muted)]">Kurátorovaný vstup, žádné reklamy, čistá platforma pro hudbu.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/40 text-[var(--mpc-muted)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
          <div>© {yearToShow} MPC Showroom CZ · CZ / SK Beat Community</div>
          <div className="flex flex-wrap gap-3">
            <a href="https://beets.cz/podminky">Podmínky</a>
            <a href="https://beets.cz/zpracovani-osobnich-udaju">Zpracování osobních údajů</a>
          </div>
        </div>
      </footer>
    </div>
  );

}
