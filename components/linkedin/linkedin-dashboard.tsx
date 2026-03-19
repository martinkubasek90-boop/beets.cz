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
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  keywords: "",
  titles: "",
  locations: "",
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
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string>(initialData.error || "");

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.profiles.filter((profile) => {
      if (activeRunId && profile.run_id !== activeRunId) return false;
      if (!q) return true;
      return [
        profile.full_name,
        profile.headline,
        profile.company_name,
        profile.location,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    });
  }, [activeRunId, data.profiles, query]);

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
          notes: form.notes,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Nepodarilo se zalozit scrape run.");
      }

      setForm(emptyForm);
      setNotice("Run byl zalozen. Dalsi krok je napojit worker, ktery doplni discovery a scraping.");
      await reloadDashboard(json.run.id);
    } catch (error: unknown) {
      setNotice(error instanceof Error ? error.message : "Nepodarilo se zalozit scrape run.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:px-6">
        <div className="overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_35%),linear-gradient(135deg,rgba(7,17,29,0.98),rgba(12,27,44,0.9))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">BEETS / LinkedIn</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                MVP dashboard pro scraper verejnych LinkedIn profilu
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Tahle verze umi zalozit scrape run, drzet metadata v Supabase a zobrazit nalezene profily.
                Discovery worker a parser se muzou doplnit bez predelani UI nebo DB.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Runy</div>
                <div className="mt-2 text-2xl font-semibold">{data.runs.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Profily</div>
                <div className="mt-2 text-2xl font-semibold">{data.profiles.length}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Datovy stav</div>
                <div className="mt-2 text-sm font-semibold text-cyan-200">{data.ready ? "Napojeno na Supabase" : "Ukazkovy mod"}</div>
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
                Zadavas pouze discovery parametry. Worker se napoji pozdeji na stejnou tabulku runu.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Nazev runu</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
                  placeholder="Praha ecommerce marketing"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Keywords</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="e-commerce, SaaS, B2B"
                  value={form.keywords}
                  onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Job titles</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="marketing manager, head of growth"
                  value={form.titles}
                  onChange={(event) => setForm((current) => ({ ...current, titles: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Lokace</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Praha, Brno"
                  value={form.locations}
                  onChange={(event) => setForm((current) => ({ ...current, locations: event.target.value }))}
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-300">Poznamka</span>
                <textarea
                  className="min-h-28 rounded-2xl border border-white/10 bg-[#091422] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                  placeholder="Napriklad priorita segmentu, ICP nebo export cil."
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
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
                  <p className="mt-1 text-sm text-slate-400">V tomhle kroku se uklada discovery zadani a stav pipeline.</p>
                </div>
                <button
                  type="button"
                  onClick={() => reloadDashboard(activeRunId)}
                  disabled={loading}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60"
                >
                  {loading ? "Nacitam..." : "Obnovit"}
                </button>
              </div>

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
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Nalezene profily</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Zatim UI pro list a filtry. Worker bude pozdeji doplnovat realne vysledky do stejne tabulky.
                  </p>
                </div>
                <input
                  className="rounded-full border border-white/10 bg-[#091422] px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="Filtrovat jmeno, firmu, lokaci"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[1.2fr,1.3fr,1fr,0.8fr] gap-3 border-b border-white/10 bg-[#091422] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <div>Profil</div>
                  <div>Headline / Firma</div>
                  <div>Lokace</div>
                  <div>Stav</div>
                </div>

                <div className="divide-y divide-white/10">
                  {filteredProfiles.length ? (
                    filteredProfiles.map((profile) => (
                      <a
                        key={profile.id}
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-white/5 md:grid-cols-[1.2fr,1.3fr,1fr,0.8fr]"
                      >
                        <div>
                          <div className="font-medium">{profile.full_name || "Neznamy profil"}</div>
                          <div className="mt-1 text-xs text-slate-500">{profile.linkedin_url}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-200">{profile.headline || "Bez headline"}</div>
                          <div className="mt-1 text-xs text-slate-500">{profile.company_name || "Firma nezjistena"}</div>
                        </div>
                        <div className="text-sm text-slate-300">{profile.location || "Lokace nezjistena"}</div>
                        <div className="flex items-start">
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                            {statusLabel(profile.status)}
                          </span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-sm text-slate-400">Zatim tu nejsou zadne profily pro vybrany run nebo filtr.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
