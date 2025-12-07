/* Stránka Projektů – přehled všech projektů s přehrávačem a tracklistem
   UI a logika vychází z veřejných profilů: karty s obálkou, hlavním trackem, rozbalovacím tracklistem
   + napojení na globální přehrávač a možnost přidat „oheň“ (FireButton) pro přihlášené. */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useGlobalPlayer } from "../../components/global-player-provider";
import { FireButton } from "../../components/fire-button";

type ProjectTrack = { name: string; url?: string | null; path?: string | null };

type Project = {
  id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id?: string | null;
  author_name?: string | null;
  project_url?: string | null;
  access_mode?: "public" | "request" | "private";
  tracks_json?: ProjectTrack[];
  tracks?: ProjectTrack[];
  year?: number | null;
  hasAccess?: boolean;
};

export default function ProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [requesting, setRequesting] = useState<Record<number, boolean>>({});
  const [myRequests, setMyRequests] = useState<Record<number, "pending" | "approved" | "denied">>({});
  const [myGrants, setMyGrants] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [authorFilter, setAuthorFilter] = useState<string>("all");

  const { play, toggle, seek, current, isPlaying, currentTime, duration } = useGlobalPlayer();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  const publicUrlFromPath = (path?: string | null) =>
    path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}` : "";

  useEffect(() => {
    const resolveSignedUrl = async (path?: string | null) => {
      if (!path) return "";
      const { data, error } = await supabase.storage.from("projects").createSignedUrl(path, 3600);
      if (error) return "";
      return data?.signedUrl || "";
    };

    const load = async () => {
      setLoading(true);
      try {
        let rows: any[] = [];
        // Vybereme jen sloupce, které DB opravdu má (bez legacy "tracks" a bez autor_name/year)
        const { data, error: err } = await supabase
          .from("projects")
          .select("id,title,description,cover_url,user_id,project_url,tracks_json,access_mode")
          .order("id", { ascending: false });
        if (err) throw err;
        rows = data ?? [];

        // grants a requesty
        let grants = new Set<number>();
        let requests: Record<number, "pending" | "approved" | "denied"> = {};
        if (userId) {
          const { data: g } = await supabase.from("project_access_grants").select("project_id").eq("user_id", userId);
          if (g) grants = new Set(g.map((x: any) => x.project_id as number));
          const { data: r } = await supabase
            .from("project_access_requests")
            .select("project_id,status")
            .eq("requester_id", userId)
            .order("created_at", { ascending: false });
          if (r) {
            r.forEach((row: any) => {
              if (!requests[row.project_id]) requests[row.project_id] = row.status;
            });
          }
        }
        setMyGrants(grants);
        setMyRequests(requests);

        const userIds = Array.from(new Set(rows.map((p) => p.user_id).filter(Boolean) as string[]));
        let profilesMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", userIds);
          if (profs) profilesMap = Object.fromEntries(profs.map((p: any) => [p.id, p.display_name || ""]));
        }

        const normalized = await Promise.all(
          rows.map(async (p) => {
            const rawJson = p.tracks_json;
            const parsedJson =
              Array.isArray(rawJson) || typeof rawJson === "string"
                ? (() => {
                    try {
                      const parsed = Array.isArray(rawJson) ? rawJson : JSON.parse(rawJson);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch {
                      return [];
                    }
                  })()
                : [];
            const tracksSource = parsedJson.length ? parsedJson : [];
            const normalizedTracks: ProjectTrack[] = tracksSource.map((t: any, idx: number) => ({
              name: t?.name || t?.title || `Track ${idx + 1}`,
              url: t?.url || t?.audio_url || t?.file_url || null,
              path: t?.path || null,
            }));

            const mode: "public" | "request" | "private" = p.access_mode || "public";
            const isOwner = userId && p.user_id === userId;
            const hasGrant = grants.has(p.id);
            const hasAccess = mode === "public" || isOwner || hasGrant;

            const signedTracks = await Promise.all(
              normalizedTracks.map(async (t) => {
                if (!hasAccess) return { ...t, url: "" };
                if (t.path) {
                  const signed = await resolveSignedUrl(t.path);
                  return { ...t, url: signed || t.url || publicUrlFromPath(t.path) };
                }
                return { ...t };
              })
            );

            return {
              ...p,
              author_name: p.user_id ? profilesMap[p.user_id] || null : null,
              tracks_json: signedTracks,
              access_mode: mode,
              hasAccess,
            } as Project;
          })
        );

        setProjects(normalized);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Nepodařilo se načíst projekty.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  const projectsVisible = useMemo(
    () => projects.filter((p) => !p.access_mode || p.access_mode !== "private"),
    [projects]
  );

  const authorOptions = useMemo(() => {
    return Array.from(new Set(projectsVisible.map((p) => (p.author_name || "").trim()).filter(Boolean)));
  }, [projectsVisible]);

  const filteredProjects = useMemo(() => {
    return projectsVisible.filter((p) => {
      const haystack = `${p.title} ${p.description || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase().trim());
      const matchesAuthor =
        authorFilter === "all" || (p.author_name || "").toLowerCase() === authorFilter.toLowerCase();
      return matchesSearch && matchesAuthor;
    });
  }, [projectsVisible, search, authorFilter]);

  const handlePlay = (project: Project, track: ProjectTrack, idx: number) => {
    if (!track.url) return;
    const trackId = `project-${project.id}-${idx}`;
    play({
      id: trackId,
      title: track.name || `Track ${idx + 1}`,
      artist: project.author_name || "Neznámý autor",
      url: track.url,
      cover_url: project.cover_url,
      user_id: project.user_id || undefined,
      item_type: "project",
    });
  };

  const requestAccess = async (projectId: number) => {
    if (!userId) {
      alert("Pro odeslání žádosti se přihlas.");
      return;
    }
    setRequesting((prev) => ({ ...prev, [projectId]: true }));
    try {
      const { error: insertErr } = await supabase.from("project_access_requests").insert({
        project_id: projectId,
        requester_id: userId,
      });
      if (insertErr) throw insertErr;
      setMyRequests((prev) => ({ ...prev, [projectId]: "pending" }));
    } catch (e) {
      alert("Nepodařilo se odeslat žádost.");
    } finally {
      setRequesting((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Projekty</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#9ca3af)]">Vykladní skříň všech projektů na platformě.</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět na homepage
          </Link>
        </div>

        {loading && <p className="text-sm text-[var(--mpc-muted,#9ca3af)]">Načítám projekty…</p>}
        {error && (
          <div className="rounded-md border border-yellow-700/50 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-100">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat v názvu nebo popisu…"
            className="w-full max-w-md rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          />
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          >
            <option value="all">Všichni autoři</option>
            {authorOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredProjects.map((project) => {
            const tracks = project.tracks_json && project.tracks_json.length ? project.tracks_json : [];
            const primaryTrack = tracks[0];
            const isRequest = project.access_mode === "request";
            const isCurrentPrimary = current?.id === `project-${project.id}-0`;
            const progressPct =
              isCurrentPrimary && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : "0%";

            return (
              <div
                key={project.id}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                style={
                  project.cover_url
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.78), rgba(0,0,0,0.92)), url(${project.cover_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <div className="absolute left-4 top-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                  {isRequest && (
                    <span className="rounded-full border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-amber-200">
                      Na žádost
                    </span>
                  )}
                  {project.access_mode === "private" && (
                    <span className="rounded-full border border-red-400/60 bg-red-500/20 px-3 py-1 text-red-200">Soukromé</span>
                  )}
                </div>

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
                    {project.author_name && (
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                        Autor: {project.author_name}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-lg font-semibold text-white">{project.title}</p>
                      {userId && <FireButton itemType="project" itemId={`project-${project.id}`} className="scale-90" />}
                    </div>
                    {project.year && (
                      <p className="text-[12px] text-[var(--mpc-muted)]">{project.year}</p>
                    )}
                  </div>
                </div>

                {/* Hlavní track */}
                <div className="mt-5 w-full rounded-xl border border-white/10 bg-black/40 p-3">
                  {primaryTrack && project.hasAccess ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => handlePlay(project, primaryTrack, 0)}
                          disabled={!primaryTrack.url}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-black font-bold shadow-[0_10px_24px_rgba(243,116,51,0.35)] disabled:opacity-40"
                        >
                          {isCurrentPrimary && isPlaying ? "▮▮" : "►"}
                        </button>
                        <div className="flex-1 min-w-[180px]">
                          <p className="text-center text-sm font-semibold text-white">
                            {primaryTrack.name || "Track"}
                          </p>
                          <div
                            className="mt-2 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                            onClick={(e) => {
                              if (!isCurrentPrimary) return;
                              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                              seek((e.clientX - rect.left) / rect.width);
                            }}
                          >
                            <div
                              className="h-full rounded-full bg-[var(--mpc-accent)]"
                              style={{ width: progressPct }}
                            />
                          </div>
                          <div className="mt-1 flex justify-between text-[10px] text-[var(--mpc-muted)]">
                            <span>{Math.floor(isCurrentPrimary ? currentTime : 0)} s</span>
                            <span>{isCurrentPrimary && duration ? Math.floor(duration) : "--"} s</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : project.access_mode === "request" && !project.hasAccess ? (
                    <div className="space-y-3 text-sm text-[var(--mpc-muted)] text-center flex flex-col items-center">
                      <p>Projekt je na žádost.</p>
                      <button
                        type="button"
                        onClick={() => requestAccess(project.id)}
                        disabled={requesting[project.id]}
                        className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-60"
                      >
                        {requesting[project.id] ? "Odesílám…" : "Požádat o přístup"}
                      </button>
                      {myRequests[project.id] === "pending" && (
                        <p className="text-[12px] text-amber-200">Žádost odeslána, čeká na schválení.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--mpc-muted)]">Tracklist není dostupný.</p>
                  )}
                </div>

                {/* Tracklist */}
                {tracks.length > 0 && project.hasAccess && (
                  <div className="mt-4 rounded-lg border border-white/10 bg-black/35 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">Tracklist</span>
                      <button
                        onClick={() => setExpanded((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                        className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white transition hover:border-[var(--mpc-accent)]"
                        aria-label="Zobrazit tracklist"
                      >
                        <span
                          className="text-lg font-bold transition-transform"
                          style={{ transform: expanded[project.id] ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          ▼
                        </span>
                      </button>
                    </div>
                    {expanded[project.id] && (
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {tracks.map((t, idx) => {
                          const trackId = `project-${project.id}-${idx}`;
                          const isCurrent = current?.id === trackId;
                          return (
                            <div
                              key={trackId}
                              className="rounded border border-white/10 bg-black/45 px-3 py-2 transition hover:border-[var(--mpc-accent)]/70"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <span className="w-5 text-[11px] text-[var(--mpc-muted)]">{idx + 1}.</span>
                                  <span className="text-sm text-white">{t.name || `Track ${idx + 1}`}</span>
                                </div>
                                <button
                                  disabled={!t.url}
                                  onClick={() => handlePlay(project, t, idx)}
                                  className="rounded-full border border-[var(--mpc-accent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-40"
                                >
                                  {isCurrent && isPlaying ? "▮▮" : "►"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
