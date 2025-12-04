'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';

type Beat = {
  id: number;
  title: string;
  artist: string;
  user_id?: string | null;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
};

type Artist = {
  id: number | string;
  name: string;
  initials: string;
  beatsCount: number;
  city: string;
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
  { id: 1, name: 'Northside', initials: 'NS', beatsCount: 24, city: 'Praha' },
  { id: 2, name: 'Blockboy', initials: 'BB', beatsCount: 15, city: 'Ostrava' },
  { id: 3, name: 'LoFi Karel', initials: 'LK', beatsCount: 19, city: 'Brno' },
  { id: 4, name: 'GreyTone', initials: 'GT', beatsCount: 11, city: 'Plzeň' },
  { id: 5, name: 'Elevated', initials: 'EL', beatsCount: 31, city: 'Brno' },
  { id: 6, name: 'GoodVibe', initials: 'GV', beatsCount: 28, city: 'Praha' },
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(dummyBlog);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [isLoadingBlog, setIsLoadingBlog] = useState<boolean>(true);
  const [forumCategories, setForumCategories] = useState<{ id: string; name: string }[]>([]);
  const [newPost, setNewPost] = useState({ title: '', titleEn: '', excerpt: '', excerptEn: '', body: '', bodyEn: '', author: '', date: '', coverUrl: '', embedUrl: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<{ id: number | string; title: string; artist: string; user_id?: string | null; url: string; cover_url?: string | null } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [peaksMap, setPeaksMap] = useState<Record<number, number[]>>({});
  const [openProjectTracks, setOpenProjectTracks] = useState<Record<number, boolean>>({});
  const [videoIndex, setVideoIndex] = useState(0);
  const [forumError, setForumError] = useState<string | null>(null);
  const { lang, setLang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang, key, fallback);
  const [blogIndex, setBlogIndex] = useState(0);
  const [artistIndex, setArtistIndex] = useState(0);
  const [artists, setArtists] = useState<Artist[]>(dummyArtists);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const projectTrackProgress = (trackId: number | string) => {
    if (currentTrack?.id === trackId && duration) {
      return Math.min((currentTime / duration) * 100, 100);
    }
    return 0;
  };

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => {
    const loadArtists = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .limit(20);

        if (error || !data || data.length === 0) {
          setArtists(dummyArtists);
          return;
        }

        const mapped: Artist[] = data.map((p: any, idx: number) => ({
          id: p.id,
          name: p.display_name || 'Bez jména',
          initials: getInitials(p.display_name || '??'),
          beatsCount: idx + 1,
          city: '',
          avatar_url: p.avatar_url || null,
        }));
        setArtists(mapped);
      } catch (err) {
        console.error('Chyba při načítání umělců:', err);
        setArtists(dummyArtists);
      }
    };
    void loadArtists();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    checkSession();
  }, [supabase]);

  useEffect(() => {
    const loadBeats = async () => {
      try {
        setIsLoadingBeats(true);

        const { data, error } = await supabase
          .from('beats')
          .select('id, title, artist, user_id, bpm, mood, audio_url, cover_url, created_at')
          .order('id', { ascending: false })
          .limit(3);

        if (error) {
          setBeatsError(`Nepodařilo se načíst beaty ze Supabase: ${error.message}. Zobrazuji lokální demo data.`);
          setBeats(dummyBeats);
          setBeatAuthorNames({});
        } else if (data && data.length > 0) {
          const ids = Array.from(new Set((data as any[]).map((b) => b.user_id).filter(Boolean) as string[]));
          let profileNames: Record<string, string> = {};
          if (ids.length) {
            const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', ids);
            if (profiles) {
              profileNames = Object.fromEntries((profiles as any[]).map((p) => [p.id, p.display_name || '']));
              setBeatAuthorNames(profileNames);
            }
          }
          const mappedBeats = (data as any[]).map((b) => ({
            ...b,
            artist: b.user_id ? profileNames[b.user_id] || b.artist || '' : b.artist || '',
          })) as Beat[];
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
    const loadProjects = async () => {
      try {
        let data: any[] | null = null;
        try {
          const { data: d1, error: err1 } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, user_id, project_url, tracks_json, author_name, access_mode')
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
            .select('id, title, description, cover_url, user_id, project_url, tracks_json, access_mode')
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

  async function ensurePeaks(beat: Beat) {
    if (peaksMap[beat.id] || !beat.audio_url) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const res = await fetch(beat.audio_url);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await audioCtxRef.current.decodeAudioData(arrayBuf);
      const data = audioBuf.getChannelData(0);
      const bars = 120;
      const samplesPerBar = Math.max(1, Math.floor(data.length / bars));
      const peaks: number[] = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          const idx = i * samplesPerBar + j;
          if (idx < data.length) {
            sum += Math.abs(data[idx]);
          }
        }
        peaks.push(sum / samplesPerBar);
      }
      const max = Math.max(...peaks, 1);
      const normalized = peaks.map((p) => p / max);
      setPeaksMap((prev) => ({ ...prev, [beat.id]: normalized }));
    } catch (err) {
      console.error('Chyba při generování waveformu:', err);
    }
  }

  function handlePlay(url: string | null | undefined, beat: { id: number; title: string; artist: string; cover_url?: string | null; user_id?: string | null }) {
    if (!url) {
      setPlayerError('Pro tento beat není nahrán audio soubor.');
      return;
    }
    setPlayerError(null);
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    void ensurePeaks(beat as Beat);
    setCurrentTrack({ id: beat.id, title: beat.title, artist: beat.artist, user_id: beat.user_id, url, cover_url: beat.cover_url });
    setIsPlaying(true);
  }

  function handlePlayProjectTrack(project: Project, track: { id: number | string; title: string; url?: string | null }) {
    if (!track.url) {
      setPlayerError('Pro tuto skladbu chybí audio URL.');
      return;
    }

    const isSame = currentTrack?.id === track.id;
    // toggle pause/play pokud je to stejný track
    if (isSame) {
      setIsPlaying((prev) => !prev);
      setPlayerError(null);
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }

    setPlayerError(null);
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    setCurrentTrack({
      id: track.id,
      title: track.title,
      artist: project.author_name || project.title,
      user_id: project.user_id,
      url: track.url,
      cover_url: project.cover_url ?? undefined,
    });
    setIsPlaying(true);
  }

  function renderTrackBars(seedA: number | string, seedB: number | string, bars = 50) {
    const seedStr = `${seedA}-${seedB}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
    }
    return Array.from({ length: bars }).map((_, idx) => {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      const height = 10 + (hash % 50);
      const opacity = idx / bars <= 0.9 ? 0.9 : 0.5;
      return (
        <span
          key={idx}
          className="w-[3px] rounded-sm"
          style={{
            height,
            background: 'linear-gradient(180deg,#00e096,#00b07a)',
            opacity,
          }}
        />
      );
    });
  }

  function togglePlayPause() {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    setIsPlaying((prev) => !prev);
  }

  function playableBeats() {
    return beats.filter((b) => b.audio_url);
  }

  function handleNext() {
    const list = playableBeats();
    if (!currentTrack || list.length === 0) return;
    const idx = list.findIndex((b) => b.id === currentTrack.id);
    const nextIndex = isShuffle
      ? Math.floor(Math.random() * list.length)
      : (idx + 1) % list.length;
    const next = list[nextIndex];
    if (next) {
      setCurrentTrack({
        id: next.id,
        title: next.title,
        artist: next.artist,
        user_id: next.user_id,
        url: next.audio_url as string,
        cover_url: next.cover_url,
      });
      setIsPlaying(true);
    }
  }

  function handlePrev() {
    const list = playableBeats();
    if (!currentTrack || list.length === 0) return;
    const idx = list.findIndex((b) => b.id === currentTrack.id);
    const prevIndex = isShuffle
      ? Math.floor(Math.random() * list.length)
      : (idx - 1 + list.length) % list.length;
    const prev = list[prevIndex];
    if (prev) {
      setCurrentTrack({
        id: prev.id,
        title: prev.title,
        artist: prev.artist,
        user_id: prev.user_id,
        url: prev.audio_url as string,
        cover_url: prev.cover_url,
      });
      setIsPlaying(true);
    }
  }

  function seekInTrack(beat: Beat, clientX: number, targetWidth: number) {
    if (!currentTrack || currentTrack.id !== beat.id || !duration) return;
    const ratio = Math.min(Math.max(clientX / targetWidth, 0), 1);
    const el = audioRef.current;
    if (!el) return;
    const next = ratio * duration;
    el.currentTime = next;
    setCurrentTime(next);
    setIsPlaying(true);
    void el.play();
  }

  function closePlayer() {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setPlayerError(null);
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const run = async () => {
      try {
        if (isPlaying) {
          await el.play();
        } else {
          el.pause();
        }
      } catch (err) {
        console.error('Chyba při přehrávání audia:', err);
        setPlayerError('Nepodařilo se spustit audio.');
      }
    };
    if (currentTrack?.url) {
      el.src = currentTrack.url;
      run();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  // Waveform analyser setup
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    // jistota, že volume je nastavené i po změně tracku
    el.volume = volume;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (!sourceRef.current) {
      sourceRef.current = audioCtxRef.current.createMediaElementSource(el);
    }
    if (!analyserRef.current) {
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    }

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      const barWidth = (w / bufferLength);
      const el = audioRef.current;
      const progress = el && el.duration ? el.currentTime / el.duration : 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (h * 0.75);
        const x = i * barWidth;
        const isPlayed = x / w <= progress;
        const grad = ctx.createLinearGradient(0, h - barHeight, 0, h);
        if (isPlayed) {
          grad.addColorStop(0, '#00e096');
          grad.addColorStop(1, '#00b07a');
        } else {
          grad.addColorStop(0, 'rgba(0,128,96,0.55)');
          grad.addColorStop(1, 'rgba(0,128,96,0.25)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, h - barHeight, barWidth * 0.85, barHeight);
      }

      // jemný baseline
      ctx.fillStyle = 'rgba(0,128,96,0.55)';
      ctx.fillRect(0, h - 3, w, 3);
    };

    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
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
    setVideoIndex((prev) => (prev + 1) % videoItems.length);
  }

  function prevVideo() {
    setVideoIndex((prev) => (prev - 1 + videoItems.length) % videoItems.length);
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

      {/* NAV */}
      <header className="sticky top-0 z-10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[conic-gradient(from_90deg,var(--mpc-accent),var(--mpc-accent-2),var(--mpc-accent))] text-xs font-black text-[#050505] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              B
            </div>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Beet komunita</p>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-white">Beets.cz</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--mpc-muted)] md:flex">
            <a className="relative py-1 hover:text-white" href="#beats">
              Beaty
              <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 hover:scale-x-100" />
            </a>
            <Link className="relative py-1 hover:text-white" href="/projects">
              Projekty
              <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 hover:scale-x-100" />
            </Link>
            <Link className="relative py-1 hover:text-white" href="/artists">
              Umělci
              <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 hover:scale-x-100" />
            </Link>
            <Link className="relative py-1 hover:text-white" href="/collabs">
              Spolupráce
              <span className="absolute inset-x-0 -bottom-1 h-[2px] origin-center scale-x-0 bg-[var(--mpc-accent)] transition-transform duration-200 hover:scale-x-100" />
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-right">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[var(--mpc-muted)]">
              <button
                onClick={() => setLang('cs')}
                className={`rounded-full px-2 py-1 ${lang === 'cs' ? 'bg-[var(--mpc-accent)] text-white' : 'hover:text-white'}`}
              >
                Česky
              </button>
              <button
                onClick={() => setLang('en')}
                className={`rounded-full px-2 py-1 ${lang === 'en' ? 'bg-[var(--mpc-accent)] text-white' : 'hover:text-white'}`}
              >
                English
              </button>
            </div>
            {isLoggedIn ? (
              <Link
                href="/profile"
                className="inline-flex items-center rounded-full border border-white/20 bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)]"
              >
                {translate(lang, 'nav.profile', 'Můj profil')}
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
              >
                {translate(lang, 'nav.login', 'Přihlásit se')}
              </Link>
            )}
          </div>
        </div>
      </header>

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
          <div className="relative flex flex-col items-center gap-4 text-center">
            <h1 className="font-['Space_Grotesk'] text-[clamp(2rem,3vw+1rem,3.4rem)] font-black uppercase leading-tight tracking-[0.08em] text-white">
              {t('hero.title', 'Beets.cz')}
            </h1>
            <p className="max-w-3xl text-[var(--mpc-muted)]">
              {t(
                'hero.subtitle',
                'Platforma pro beatmakery. Nahrávej, sdílej akapely, domlouvej spolupráce. Bez reklam a nesmyslů, jen hudba.'
              )}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/komunita"
                className="rounded-full border border-white/20 bg-[var(--mpc-accent)] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(243,116,51,0.35)] transition hover:translate-y-[1px]"
              >
                Více o komunitě
              </Link>
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section className="w-full py-8" id="projects">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">
              {t('projects.title', 'Nejnovější projekty')}
            </h2>
          </div>
          {projectsError && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <span>⚠</span> {projectsError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="h-40 w-40 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                    {project.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
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
                    <div className="text-lg font-semibold text-white">{project.title}</div>
                    <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                      Beat tape / EP
                    </div>
                    <p className="text-sm text-[var(--mpc-muted)] max-w-2xl">
                      {project.description || 'Instrumentální beat tape.'}
                    </p>
                  </div>

                    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-3">
                      <div className="mx-auto flex max-w-3xl items-center gap-3">
                        <button
                          onClick={() =>
                            project.tracks && project.tracks[0] ? handlePlayProjectTrack(project, project.tracks[0]) : null
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
                              <span>0:00</span>
                              <span>{duration ? formatTime(duration) : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={() =>
                        setOpenProjectTracks((prev) => ({
                          ...prev,
                          [project.id]: !prev[project.id],
                        }))
                      }
                      className="text-[11px] uppercase tracking-[0.1em] text-[var(--mpc-muted)] hover:text-white flex items-center gap-1"
                    >
                      {openProjectTracks[project.id] ? '▲ Skrýt projekt' : '▼ Celý projekt'}
                    </button>
                  </div>

                  {openProjectTracks[project.id] && (
                    <div className="w-full space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                      {project.tracks && project.tracks.length > 0 ? (
                        <div
                          className="flex flex-col gap-2"
                          style={{
                            maxHeight: '260px',
                            overflowY: 'auto',
                          }}
                        >
                          {project.tracks.map((t, i) => (
                            <div
                              key={t.id}
                              className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 text-[11px] text-[var(--mpc-muted)]">
                                    {i + 1}.
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
                                  onClick={() => handlePlayProjectTrack(project, t)}
                                  className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)] px-2 py-1 text-white shadow-[0_6px_14px_rgba(243,116,51,0.35)] hover:border-[var(--mpc-accent)]"
                                >
                                  {currentTrack?.id === t.id && isPlaying ? '▮▮' : '►'}
                                </button>
                              </div>
                              <div className="flex h-10 items-end gap-[2px] rounded bg-black/30 px-2">
                                {renderTrackBars(project.id, t.id, 60)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--mpc-muted)]">Tracklist zatím není k dispozici.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
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
                <div className="flex items-center justify-between">
                  <Link
                    href={`/blog/${post.id}`}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
                  >
                    {t('blog.readMore', 'Číst víc')}
                  </Link>
                  <span className="text-[11px] text-[var(--mpc-muted)]">Článek</span>
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

          {isLoggedIn && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur space-y-4">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowBlogForm((p) => !p)}
                  className="rounded-full border border-[var(--mpc-accent)] px-5 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                >
                  {showBlogForm ? 'Schovat' : 'Přidat článek'}
                </button>
              </div>
              {showBlogForm && (
                <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreatePost}>
                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Název</label>
                  <input
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    value={newPost.title}
                    onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Název (English)</label>
                  <input
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    value={newPost.titleEn}
                    onChange={(e) => setNewPost((p) => ({ ...p, titleEn: e.target.value }))}
                  />
                </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Autor</label>
                    <input
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                      value={newPost.author}
                      onChange={(e) => setNewPost((p) => ({ ...p, author: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Datum</label>
                    <input
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                      value={newPost.date}
                      onChange={(e) => setNewPost((p) => ({ ...p, date: e.target.value }))}
                      placeholder="12. 2. 2025"
                      required
                    />
                  </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Perex</label>
                  <textarea
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    rows={3}
                    value={newPost.excerpt}
                    onChange={(e) => setNewPost((p) => ({ ...p, excerpt: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Perex (English)</label>
                  <textarea
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    rows={3}
                    value={newPost.excerptEn}
                    onChange={(e) => setNewPost((p) => ({ ...p, excerptEn: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Celý text</label>
                  <textarea
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    rows={6}
                    value={newPost.body}
                    onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Celý text (English)</label>
                  <textarea
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    rows={6}
                    value={newPost.bodyEn}
                    onChange={(e) => setNewPost((p) => ({ ...p, bodyEn: e.target.value }))}
                  />
                </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Cover URL (volitelně)</label>
                    <input
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                      value={newPost.coverUrl}
                      onChange={(e) => setNewPost((p) => ({ ...p, coverUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Embed (YouTube / Bandcamp / SoundCloud)</label>
                    <input
                      className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                      value={newPost.embedUrl}
                      onChange={(e) => setNewPost((p) => ({ ...p, embedUrl: e.target.value }))}
                      placeholder="https://youtu.be/..., https://bandcamp.com/..., https://soundcloud.com/..."
                    />
                    <p className="text-[11px] text-[var(--mpc-muted)]">
                      Vkládej přímo embed/track URL. U YouTube stačí běžný link, převedeme ho na embed.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Nahrát cover (Storage)</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                      className="w-full text-[12px] text-white"
                    />
                    {uploadingCover && <p className="text-[11px] text-[var(--mpc-muted)]">Nahrávám cover…</p>}
                  </div>
                  <div className="md:col-span-2 flex items-center justify-between">
                    <p className="text-[11px] text-[var(--mpc-muted)]">Obrázky se ukládají do bucketu blog_covers. Vyplň buď URL, nebo nahraj soubor.</p>
                    <button
                      type="submit"
                      disabled={isSavingPost}
                      className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                    >
                      {isSavingPost ? 'Ukládám…' : 'Přidat článek'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>

        {/* VIDEO */}
        <section className="w-full py-8" id="video">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">Video</h2>
          </div>
          <div className="mx-auto flex w-[80%] max-w-5xl flex-col items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="relative w-full" style={{ paddingTop: '39.375%' }}>
              <iframe
                key={videoItems[videoIndex].id}
                className="absolute inset-0 h-full w-full rounded-xl"
                src={videoItems[videoIndex].url}
                title={videoItems[videoIndex].title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
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
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur hover:border-[var(--mpc-accent)] transition"
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

        {/* ARTISTS (carousel) */}
        <section className="w-full py-8" id="artists">
          <div className="relative mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">Umělci</h2>
            <Link
              href="/artists"
              className="absolute right-0 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
            >
              Zobrazit vše
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => {
              const list = artists.length ? artists : dummyArtists;
              const artist = list[(artistIndex + idx) % list.length];
              const followers = artist.beatsCount
                ? `${(artist.beatsCount * 3200 + 1500).toLocaleString('cs-CZ')} followers`
                : 'Profil';
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
                  href={`/artists`}
                  key={artist.id}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-center shadow-[0_12px_28px_rgba(0,0,0,0.35)] hover:border-[var(--mpc-accent)]"
                >
                  <div
                    className={`relative h-20 w-20 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br ${gradient} shadow-[0_8px_18px_rgba(0,0,0,0.35)]`}
                  >
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-xl font-black text-white">
                        {artist.initials}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-center w-full">
                    <p className="text-sm font-semibold text-white">{artist.name}</p>
                    <p className="text-[11px] text-[var(--mpc-muted)]">{followers}</p>
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

        {/* BEATS */}
        <section className="w-full py-8" id="beats">
          <div className="mb-4 flex w-full flex-wrap items-center justify-center gap-3 text-center">
            <h2 className="text-lg font-semibold tracking-[0.16em] uppercase">Nejnovější beaty</h2>
            {isLoadingBeats && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám beaty…</p>}
          </div>
          {beatsError && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-200">
              <span>⚠</span> {beatsError}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {beats.map((beat) => (
              <div
                key={beat.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="h-32 w-32 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                    {beat.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
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
                          if (currentTrack?.id === beat.id) {
                            togglePlayPause();
                          } else {
                            handlePlay(beat.audio_url, beat);
                          }
                        }}
                        disabled={!beat.audio_url}
                      >
                        {currentTrack?.id === beat.id && isPlaying ? '▮▮' : '►'}
                      </button>
                      <div className="flex-1">
                        <p className="text-center text-sm font-semibold text-white">{beat.title}</p>
                        <div className="mt-2 space-y-1">
                          <div
                            className="overflow-hidden rounded-lg border border-white/10 bg-white/5 px-2 py-2 cursor-pointer"
                            style={{ height: '50px' }}
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                              seekInTrack(beat, e.clientX - rect.left, rect.width);
                            }}
                          >
                            <div className="flex h-full items-end gap-[2px] pointer-events-none">
                              {peaksMap[beat.id]
                                ? peaksMap[beat.id].map((p, idx) => {
                                    const progress =
                                      currentTrack?.id === beat.id && duration ? currentTime / duration : 0;
                                    const played = idx / peaksMap[beat.id].length <= progress;
                                    const height = Math.min(60, Math.max(14, p * 120));
                                    return (
                                      <span
                                        key={idx}
                                        className="w-[3px] rounded-sm"
                                        style={{
                                          height,
                                          backgroundColor: played ? '#00e096' : 'rgba(0,128,96,0.4)',
                                          boxShadow: played ? '0 4px 12px rgba(0,224,150,0.45)' : 'none',
                                        }}
                                      />
                                    );
                                  })
                                : Array.from({ length: 32 }).map((_, idx) => (
                                    <span
                                      key={idx}
                                      className="w-[3px] rounded-sm"
                                      style={{
                                        height: 16 + (idx % 5) * 6,
                                        backgroundColor: 'rgba(0,128,96,0.35)',
                                      }}
                                    />
                                  ))}
                            </div>
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
            <a href="#">Podmínky</a>
            <a href="#">O projektu</a>
            <a href="#">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );

}
