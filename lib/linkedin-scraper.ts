import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type LinkedInRunStatus = "queued" | "discovering" | "scraping" | "completed" | "failed";
export type LinkedInProfileStatus = "pending" | "scraped" | "skipped" | "failed";

export type LinkedInProfile = {
  id: string;
  run_id: string;
  full_name: string | null;
  headline: string | null;
  company_name: string | null;
  location: string | null;
  linkedin_url: string;
  source_query: string | null;
  status: LinkedInProfileStatus;
  scraped_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

export type LinkedInRun = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  source_query: string;
  status: LinkedInRunStatus;
  notes: string | null;
  total_candidates: number;
  total_profiles: number;
  filters: {
    keywords: string[];
    titles: string[];
    locations: string[];
  };
};

export type LinkedInDashboardData = {
  runs: LinkedInRun[];
  profiles: LinkedInProfile[];
  ready: boolean;
  error?: string;
};

export type LinkedInSearchPayload = {
  name?: string;
  keywords?: string[];
  titles?: string[];
  locations?: string[];
  notes?: string;
};

type LinkedInRunRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  source_query: string;
  status: LinkedInRunStatus;
  notes: string | null;
  total_candidates: number | null;
  total_profiles: number | null;
  filters: Record<string, unknown> | null;
};

type LinkedInProfileRow = {
  id: string;
  run_id: string;
  full_name: string | null;
  headline: string | null;
  company_name: string | null;
  location: string | null;
  linkedin_url: string;
  source_query: string | null;
  status: LinkedInProfileStatus;
  scraped_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

export const LINKEDIN_TABLES = {
  runs: "linkedin_scrape_runs",
  profiles: "linkedin_profile_candidates",
  companies: "linkedin_companies",
} as const;

const sampleRuns: LinkedInRun[] = [
  {
    id: "sample-run-prague-ecommerce",
    created_at: "2026-03-19T08:30:00.000Z",
    updated_at: "2026-03-19T09:05:00.000Z",
    name: "Praha e-commerce marketing",
    source_query: 'site:linkedin.com/in/ ("marketing manager" OR "head of marketing") ("Praha" OR "Prague") e-commerce',
    status: "queued",
    notes: "Ukázkový run pro MVP dashboard. Po nasazení SQL migrace se nahradí reálnými daty.",
    total_candidates: 12,
    total_profiles: 3,
    filters: {
      keywords: ["e-commerce"],
      titles: ["marketing manager", "head of marketing"],
      locations: ["Praha"],
    },
  },
];

const sampleProfiles: LinkedInProfile[] = [
  {
    id: "sample-profile-1",
    run_id: "sample-run-prague-ecommerce",
    full_name: "Jana Novotna",
    headline: "Head of Marketing ve verejnem e-commerce brandu",
    company_name: "Example Commerce",
    location: "Praha, Cesko",
    linkedin_url: "https://www.linkedin.com/in/jana-novotna-example/",
    source_query: "marketing manager Praha e-commerce",
    status: "pending",
    scraped_at: null,
    created_at: "2026-03-19T08:31:00.000Z",
    raw_payload: {
      source: "sample",
      public: true,
    },
  },
  {
    id: "sample-profile-2",
    run_id: "sample-run-prague-ecommerce",
    full_name: "Petr Svoboda",
    headline: "Performance Marketing Lead",
    company_name: "Growth Studio",
    location: "Praha, Cesko",
    linkedin_url: "https://www.linkedin.com/in/petr-svoboda-example/",
    source_query: "performance marketing Praha",
    status: "pending",
    scraped_at: null,
    created_at: "2026-03-19T08:34:00.000Z",
    raw_payload: {
      source: "sample",
      public: true,
    },
  },
];

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY ||
    ""
  );
}

export function getLinkedInServiceClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeFilters(value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    keywords: toStringArray(source.keywords),
    titles: toStringArray(source.titles),
    locations: toStringArray(source.locations),
  };
}

function mapRun(row: LinkedInRunRow): LinkedInRun {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    name: row.name,
    source_query: row.source_query,
    status: row.status,
    notes: row.notes,
    total_candidates: row.total_candidates || 0,
    total_profiles: row.total_profiles || 0,
    filters: normalizeFilters(row.filters),
  };
}

function mapProfile(row: LinkedInProfileRow): LinkedInProfile {
  return {
    id: row.id,
    run_id: row.run_id,
    full_name: row.full_name,
    headline: row.headline,
    company_name: row.company_name,
    location: row.location,
    linkedin_url: row.linkedin_url,
    source_query: row.source_query,
    status: row.status,
    scraped_at: row.scraped_at,
    created_at: row.created_at,
    raw_payload: row.raw_payload,
  };
}

function uniqueStrings(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values || [])
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function buildSourceQuery(payload: LinkedInSearchPayload) {
  const keywords = uniqueStrings(payload.keywords);
  const titles = uniqueStrings(payload.titles);
  const locations = uniqueStrings(payload.locations);

  const groups = [
    "site:linkedin.com/in/",
    titles.length ? `(${titles.map((title) => `"${title}"`).join(" OR ")})` : "",
    locations.length ? `(${locations.map((location) => `"${location}"`).join(" OR ")})` : "",
    keywords.join(" "),
  ].filter(Boolean);

  return groups.join(" ");
}

export function normalizeSearchPayload(raw: LinkedInSearchPayload) {
  const keywords = uniqueStrings(raw.keywords);
  const titles = uniqueStrings(raw.titles);
  const locations = uniqueStrings(raw.locations);
  const sourceQuery = buildSourceQuery({ keywords, titles, locations });

  return {
    name: raw.name?.trim() || `LinkedIn run ${new Date().toLocaleDateString("cs-CZ")}`,
    notes: raw.notes?.trim() || null,
    sourceQuery,
    filters: { keywords, titles, locations },
  };
}

export async function getLinkedInDashboardData(): Promise<LinkedInDashboardData> {
  const supabase = getLinkedInServiceClient();
  if (!supabase) {
    return {
      runs: sampleRuns,
      profiles: sampleProfiles,
      ready: false,
      error: "Chybi Supabase service role. Dashboard bezi v ukazkovem modu.",
    };
  }

  const [runsRes, profilesRes] = await Promise.all([
    supabase
      .from(LINKEDIN_TABLES.runs)
      .select("id,created_at,updated_at,name,source_query,status,notes,total_candidates,total_profiles,filters")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from(LINKEDIN_TABLES.profiles)
      .select("id,run_id,full_name,headline,company_name,location,linkedin_url,source_query,status,scraped_at,created_at,raw_payload")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (runsRes.error || profilesRes.error) {
    return {
      runs: sampleRuns,
      profiles: sampleProfiles,
      ready: false,
      error:
        runsRes.error?.message ||
        profilesRes.error?.message ||
        "LinkedIn tabulky zatim nejsou pripravene. Spust SQL migraci.",
    };
  }

  return {
    runs: ((runsRes.data || []) as LinkedInRunRow[]).map(mapRun),
    profiles: ((profilesRes.data || []) as LinkedInProfileRow[]).map(mapProfile),
    ready: true,
  };
}

export async function createLinkedInRun(raw: LinkedInSearchPayload) {
  const supabase = getLinkedInServiceClient();
  if (!supabase) {
    throw new Error("Chybi Supabase service role. Nelze vytvorit scrape run.");
  }

  const normalized = normalizeSearchPayload(raw);
  if (!normalized.filters.keywords.length && !normalized.filters.titles.length && !normalized.filters.locations.length) {
    throw new Error("Vypln alespon jedno klicove slovo, job title nebo lokaci.");
  }

  const insertPayload = {
    name: normalized.name,
    source_query: normalized.sourceQuery,
    status: "queued" as LinkedInRunStatus,
    notes: normalized.notes,
    total_candidates: 0,
    total_profiles: 0,
    filters: normalized.filters,
  };

  const { data, error } = await supabase
    .from(LINKEDIN_TABLES.runs)
    .insert(insertPayload)
    .select("id,created_at,updated_at,name,source_query,status,notes,total_candidates,total_profiles,filters")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRun(data as LinkedInRunRow);
}

export async function listLinkedInResults(params: {
  runId?: string | null;
  q?: string | null;
  limit?: number | null;
}) {
  const supabase = getLinkedInServiceClient();
  if (!supabase) {
    return {
      ready: false,
      items: sampleProfiles,
      total: sampleProfiles.length,
    };
  }

  const limit = Math.max(1, Math.min(100, Number(params.limit || 30)));
  let query = supabase
    .from(LINKEDIN_TABLES.profiles)
    .select("id,run_id,full_name,headline,company_name,location,linkedin_url,source_query,status,scraped_at,created_at,raw_payload", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.runId) {
    query = query.eq("run_id", params.runId);
  }

  if (params.q?.trim()) {
    query = query.or(
      `full_name.ilike.%${params.q.trim()}%,headline.ilike.%${params.q.trim()}%,company_name.ilike.%${params.q.trim()}%,location.ilike.%${params.q.trim()}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    ready: true,
    items: ((data || []) as LinkedInProfileRow[]).map(mapProfile),
    total: count || 0,
  };
}
