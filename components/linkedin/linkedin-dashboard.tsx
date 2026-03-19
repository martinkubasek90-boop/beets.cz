"use client";

import { useMemo, useState } from "react";
import type { LinkedInDashboardData, LinkedInProfile, LinkedInRun } from "@/lib/linkedin-scraper";

type Props = {
  initialData: LinkedInDashboardData;
};

type FormState = {
  name: string;
  keywords: string;
  titles: string;
  locations: string;
  manualUrls: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  keywords: "",
  titles: "",
  locations: "",
  manualUrls: "",
  notes: "",
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string | null) {
  if (!value) return "Nezname";
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  }).format(new Date(value));
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number") return "n/a";
  return `${Math.round(value * 100)} %`;
}

function statusLabel(status: LinkedInRun["status"] | LinkedInProfile["status"]) {
  switch (status) {
    case "queued":
      return "Ve fronte";
    case "discovering":
      return "Discovery";
    case "scraping":
      return "Scraping";
    case "completed":
      return "Hotovo";
    case "failed":
      return "Chyba";
    case "pending":
      return "Pending";
    case "scraped":
      return "Scraped";
    case "skipped":
      return "Skipped";
    default:
      return status;
  }
}

export function LinkedInDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeRunId, setActiveRunId] = useState<string>(initialData.runs[0]?.id || "");
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(60);
  const [contactsOnly, setContactsOnly] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>(initialData.error || "");

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.profiles.filter((profile) => {
      if (activeRunId && profile.run_id !== activeRunId) return false;
      if (contactsOnly && !profile.contact_email && !profile.contact_phone) return false;
      if ((profile.icp_score || 0) < minScore) return false;
      if (!q) return true;
      return [
        profile.full_name,
        profile.headline,
        profile.company_name,
        profile.location,
        profile.contact_email,
        profile.contact_phone,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    });
  }, [activeRunId, contactsOnly, data.profiles, minScore, query]);

  const activeRun = data.runs.find((run) => run.id === activeRunId) || null;
  const activeRunCanProcess = Boolean(activeRunId) && (data.processorReady || Boolean(activeRun?.filters.manualUrls?.length));

  async function reloadDashboard(nextRunId?: string) {
    setLoading(true);
    try {
      const response = await fetch("/api/linkedin/results?mode=dashboard", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Nepodarilo se nacist dashboard.");
      }

      setData({
        runs: json.runs,
        profiles: json.profiles,
        ready: json.ready,
        processorReady: json.processorReady,
        searchProvider: json.searchProvider,
        enrichmentMode: json.enrichmentMode,
        error: json.error,
      });
      setActiveRunId(nextRunId || json.runs[0]?.id || "");
      setNotice(json.error || "");
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Nepodarilo se nacist dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch("/api/linkedin/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          keywords: splitCsv(form.keywords),
          titles: splitCsv(form.titles),
          locations: splitCsv(form.locations),
          manualUrls: form.manualUrls
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          notes: form.notes,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Nepodarilo se zalozit scrape run.");
      }

      setForm(emptyForm);
      setNotice("Run byl zalozen. Ted ho muzes rovnou zpracovat tlacitkem Start processing.");
      await reloadDashboard(json.run.id);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Nepodarilo se zalozit scrape run.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProcessRun() {
    if (!activeRunId) return;
    setProcessing(true);
    setNotice("");

    try {
      const response = await fetch("/api/linkedin/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: activeRunId }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Nepodarilo se zpracovat run.");
      }

      setNotice(
        `Run zpracovan. Discovery: ${json.discovered}, profily: ${json.processed}, kontakty: ${json.contactsFound}.`,
      );
      await reloadDashboard(activeRunId);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Nepodarilo se zpracovat run.");
      await reloadDashboard(activeRunId);
    } finally {
      setProcessing(false);
    }
  }

  const exportUrl = `/api/linkedin/export?runId=${encodeURIComponent(activeRunId || "")}&q=${encodeURIComponent(
    query,
  )}&minScore=${minScore}&contactsOnly=${contactsOnly ? "1" : "0"}`;

  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_35%),linear-gradient(135deg,rgba(7,17,29,0.98),rgba(12,27,44,0.9))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">BEETS / LinkedIn</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                Discovery + public contact enrichment pro verejne LinkedIn profily
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Run se nejdriv postavi z query, pak jde pres search provider pro discovery profilu a nakonec z
                firemnich webu vytahne verejne kontakty. Osobni maily a telefony to negarantuje.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Runy</div>
                <div className="mt-2 text-2xl font-semibold">{data.runs.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Profily</div>
                <div className="mt-2 text-2xl font-semibold">{data.profiles.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Search provider</div>
                <div className="mt-2 text-sm font-semibold text-cyan-200">{data.searchProvider}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Enrichment</div>
                <div className="mt-2 text-sm font-semibold text-cyan-200">{data.enrichmentMode}</div>
              </div>
            </div>
          </div>
        </div>

        {notice ? (
          <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            {notice}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[420px,minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
          >
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Novy scrape run</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Priklad: `keywords=B2B,SaaS`, `titles=business development,partnerships`, `locations=USA`.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Nazev runu</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="USA B2B business development"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Keywords</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="B2B, SaaS"
                  value={form.keywords}
                  onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Job titles</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="business development, sales director"
                  value={form.titles}
                  onChange={(event) => setForm((current) => ({ ...current, titles: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Lokace</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="USA, United States"
                  value={form.locations}
                  onChange={(event) => setForm((current) => ({ ...current, locations: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Poznamka</span>
                <textarea
                  className="min-h-28 rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Napriklad ICP, obor nebo export cil."
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Manual LinkedIn URL</span>
                <textarea
                  className="min-h-24 rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder={"https://www.linkedin.com/in/first-profile/\nhttps://www.linkedin.com/in/second-profile/"}
                  value={form.manualUrls}
                  onChange={(event) => setForm((current) => ({ ...current, manualUrls: event.target.value }))}
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Zakladam run..." : "Zalozit run"}
              </button>
            </div>
          </form>

          <div className="grid gap-6">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Scrape runs</h2>
                  <p className="mt-1 text-sm text-slate-400">Vyber run a spust discovery + enrichment pipeline.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reloadDashboard(activeRunId)}
                    disabled={loading}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60"
                  >
                    {loading ? "Nacitam..." : "Obnovit"}
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessRun}
                    disabled={!activeRunCanProcess || processing}
                    className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? "Bezi processing..." : "Start processing"}
                  </button>
                </div>
              </div>

              {!data.processorReady ? (
                <div className="mb-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  Search discovery neni aktivni. Nastav `SERPER_API_KEY` nebo `SERPAPI_API_KEY`, nebo pouzij manualni LinkedIn URL.
                </div>
              ) : null}

              <div className="grid gap-3">
                {data.runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setActiveRunId(run.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      activeRunId === run.id
                        ? "border-cyan-300/60 bg-cyan-300/10"
                        : "border-white/10 bg-[#091422]/70 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-base font-semibold">{run.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{statusLabel(run.status)}</div>
                      </div>
                      <div className="text-xs text-slate-400">{formatDate(run.created_at)}</div>
                    </div>
                    <div className="mt-3 text-sm leading-6 text-slate-300">{run.source_query}</div>
                    {run.last_error ? <div className="mt-3 text-xs text-red-300">{run.last_error}</div> : null}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                      {run.filters.keywords.map((item) => (
                        <span key={`${run.id}-kw-${item}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {item}
                        </span>
                      ))}
                      {run.filters.titles.map((item) => (
                        <span key={`${run.id}-title-${item}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {item}
                        </span>
                      ))}
                      {run.filters.locations.map((item) => (
                        <span key={`${run.id}-loc-${item}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {item}
                        </span>
                      ))}
                      {run.filters.manualUrls.length ? (
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-200">
                          manual URLs: {run.filters.manualUrls.length}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Nalezene profily a kontakty</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Kontakty jsou jen verejne dohledane firemni udaje z webu, ne garantovane osobni kontakty.
                  </p>
                </div>
              </div>

              {activeRun ? (
                <div className="mb-4 rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-sm text-slate-300">
                  Aktivni run: <span className="font-semibold text-white">{activeRun.name}</span>
                  {" · "}
                  kandidati {activeRun.total_candidates}
                  {" · "}
                  profily {activeRun.total_profiles}
                  {" · "}
                  start {formatDate(activeRun.started_at)}
                  {" · "}
                  konec {formatDate(activeRun.finished_at)}
                </div>
              ) : null}

              <div className="mb-4 grid gap-3 md:grid-cols-[1fr,220px,220px,auto]">
                <input
                  className="rounded-full border border-white/10 bg-[#091422] px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Filtrovat jmeno, firmu, email, lokaci"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <label className="flex items-center gap-3 rounded-full border border-white/10 bg-[#091422] px-4 py-2 text-sm text-slate-300">
                  <span>Min ICP score</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minScore}
                    onChange={(event) => setMinScore(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                  <span className="w-8 text-right text-white">{minScore}</span>
                </label>
                <label className="flex items-center gap-3 rounded-full border border-white/10 bg-[#091422] px-4 py-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={contactsOnly}
                    onChange={(event) => setContactsOnly(event.target.checked)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  <span>Pouze s kontaktem</span>
                </label>
                <a
                  href={exportUrl}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950"
                >
                  Export CSV
                </a>
              </div>

              <div className="grid gap-4">
                {filteredProfiles.length ? (
                  filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="rounded-2xl border border-white/10 bg-[#091422]/80 p-4 transition hover:border-white/20"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lg font-semibold text-white underline-offset-4 hover:underline"
                          >
                            {profile.full_name || "Neznamy profil"}
                          </a>
                          <div className="mt-1 text-sm text-slate-300">{profile.headline || "Bez headline"}</div>
                          <div className="mt-2 text-xs text-slate-500">
                            {profile.company_name || "Firma nezjistena"}
                            {profile.location ? ` · ${profile.location}` : ""}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                              {statusLabel(profile.status)}
                            </span>
                            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                              ICP {profile.icp_score || 0} / {profile.icp_grade || "D"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Firma / domena</div>
                          <div className="mt-2 text-sm text-slate-200">{profile.company_name || "n/a"}</div>
                          <div className="mt-1 text-xs text-slate-500">{profile.company_domain || "n/a"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Email</div>
                          <div className="mt-2 break-all text-sm text-slate-200">{profile.contact_email || "n/a"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Telefon</div>
                          <div className="mt-2 text-sm text-slate-200">{profile.contact_phone || "n/a"}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Zdroj / confidence</div>
                          <div className="mt-2 text-sm text-slate-200">{profile.contact_source || "n/a"}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatConfidence(profile.contact_confidence)}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        ICP signaly: {profile.icp_reasons?.length ? profile.icp_reasons.join(" · ") : "zadne"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-8 text-sm text-slate-400">
                    Zatim tu nejsou zadne profily pro vybrany run nebo filtr.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
