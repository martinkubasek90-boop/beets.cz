import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export type LinkedInRunStatus = "queued" | "discovering" | "scraping" | "completed" | "failed";
export type LinkedInProfileStatus = "pending" | "scraped" | "skipped" | "failed";

export type LinkedInProfile = {
  id: string;
  run_id: string;
  full_name: string | null;
  headline: string | null;
  company_name: string | null;
  company_domain: string | null;
  location: string | null;
  linkedin_url: string;
  source_query: string | null;
  status: LinkedInProfileStatus;
  contact_email: string | null;
  contact_phone: string | null;
  contact_source: string | null;
  contact_confidence: number | null;
  icp_score?: number;
  icp_grade?: "A" | "B" | "C" | "D";
  icp_reasons?: string[];
  scraped_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

export type LinkedInRun = {
  id: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  name: string;
  source_query: string;
  status: LinkedInRunStatus;
  notes: string | null;
  last_error: string | null;
  total_candidates: number;
  total_profiles: number;
  filters: {
    runMode: "linkedin" | "company";
    keywords: string[];
    titles: string[];
    locations: string[];
    manualUrls: string[];
    companyNames: string[];
    companyDomains: string[];
    seedRows: string[];
    directoryUrls: string[];
    autonomousDiscovery: boolean;
    highVolume: boolean;
    minerMode: boolean;
    enrichLimit: number;
  };
};

export type LinkedInDashboardData = {
  runs: LinkedInRun[];
  profiles: LinkedInProfile[];
  ready: boolean;
  processorReady: boolean;
  searchProvider: string;
  enrichmentMode: string;
  error?: string;
};

export type LinkedInSearchPayload = {
  name?: string;
  runMode?: "linkedin" | "company";
  keywords?: string[];
  titles?: string[];
  locations?: string[];
  manualUrls?: string[];
  companyNames?: string[];
  companyDomains?: string[];
  seedRows?: string[];
  directoryUrls?: string[];
  autonomousDiscovery?: boolean;
  highVolume?: boolean;
  minerMode?: boolean;
  enrichLimit?: number;
  notes?: string;
};

export type LinkedInProcessResult = {
  run: LinkedInRun;
  discovered: number;
  processed: number;
  contactsFound: number;
  searchProvider: string;
  enrichmentMode: string;
};

type LinkedInRunRow = {
  id: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  name: string;
  source_query: string;
  status: LinkedInRunStatus;
  notes: string | null;
  last_error: string | null;
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
  company_domain: string | null;
  location: string | null;
  linkedin_url: string;
  source_query: string | null;
  status: LinkedInProfileStatus;
  contact_email: string | null;
  contact_phone: string | null;
  contact_source: string | null;
  contact_confidence: number | null;
  scraped_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

type ScrapedProfileDraft = {
  linkedinUrl: string;
  fullName: string | null;
  headline: string | null;
  companyName: string | null;
  companyCandidates: string[];
  location: string | null;
  rawPayload: Record<string, unknown>;
};

type PublicContact = {
  resolvedCompanyName: string | null;
  companyDomain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactSource: string | null;
  contactConfidence: number | null;
};

type LinkedInFilters = {
  runMode: "linkedin" | "company";
  keywords: string[];
  titles: string[];
  locations: string[];
  manualUrls: string[];
  companyNames: string[];
  companyDomains: string[];
  seedRows: string[];
  directoryUrls: string[];
  autonomousDiscovery: boolean;
  highVolume: boolean;
  minerMode: boolean;
  enrichLimit: number;
};

type CompanySeedStatus = "queued" | "crawled" | "failed";

type CompanySeedRow = {
  id: string;
  run_id: string;
  company_name: string | null;
  company_domain: string | null;
  location: string | null;
  segment: string | null;
  source: string | null;
  status: CompanySeedStatus;
  last_error: string | null;
  raw_payload: Record<string, unknown> | null;
};

const RUN_SELECT =
  "id,created_at,updated_at,started_at,finished_at,name,source_query,status,notes,last_error,total_candidates,total_profiles,filters";

const PROFILE_SELECT =
  "id,run_id,full_name,headline,company_name,company_domain,location,linkedin_url,source_query,status,contact_email,contact_phone,contact_source,contact_confidence,scraped_at,created_at,raw_payload";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const LINKEDIN_TABLES = {
  runs: "linkedin_scrape_runs",
  profiles: "linkedin_profile_candidates",
  companies: "linkedin_companies",
  companySeeds: "linkedin_company_seeds",
} as const;

const sampleRuns: LinkedInRun[] = [
  {
    id: "sample-run-usa-b2b-bd",
    created_at: "2026-03-19T08:30:00.000Z",
    updated_at: "2026-03-19T09:05:00.000Z",
    started_at: "2026-03-19T08:35:00.000Z",
    finished_at: "2026-03-19T09:05:00.000Z",
    name: "USA B2B Business Development",
    source_query:
      'site:linkedin.com/in/ ("business development" OR "partnerships") ("United States" OR USA) B2B SaaS',
    status: "completed",
    notes: "Ukazkovy run pro dashboard bez realneho providera.",
    last_error: null,
    total_candidates: 14,
    total_profiles: 3,
    filters: {
      runMode: "linkedin",
      keywords: ["B2B", "SaaS"],
      titles: ["business development", "partnerships"],
      locations: ["United States", "USA"],
      manualUrls: [],
      companyNames: [],
      companyDomains: [],
      seedRows: [],
      directoryUrls: [],
      autonomousDiscovery: false,
      highVolume: false,
      minerMode: false,
      enrichLimit: 50,
    },
  },
];

const sampleProfiles: LinkedInProfile[] = [
  {
    id: "sample-profile-1",
    run_id: "sample-run-usa-b2b-bd",
    full_name: "Alex Carter",
    headline: "Business Development Director at Example SaaS",
    company_name: "Example SaaS",
    company_domain: "https://example.com",
    location: "Austin, Texas, United States",
    linkedin_url: "https://www.linkedin.com/in/alex-carter-example/",
    source_query: "business development B2B USA",
    status: "scraped",
    contact_email: "sales@example.com",
    contact_phone: "+1 555 010 1111",
    contact_source: "https://example.com/contact",
    contact_confidence: 0.72,
    scraped_at: "2026-03-19T09:00:00.000Z",
    created_at: "2026-03-19T08:31:00.000Z",
    raw_payload: {
      source: "sample",
      public: true,
    },
  },
  {
    id: "sample-profile-2",
    run_id: "sample-run-usa-b2b-bd",
    full_name: "Morgan Lee",
    headline: "VP Partnerships | B2B Growth",
    company_name: "Northwind Cloud",
    company_domain: "https://northwind.example",
    location: "New York, United States",
    linkedin_url: "https://www.linkedin.com/in/morgan-lee-example/",
    source_query: "partnerships B2B USA",
    status: "scraped",
    contact_email: "hello@northwind.example",
    contact_phone: null,
    contact_source: "https://northwind.example",
    contact_confidence: 0.61,
    scraped_at: "2026-03-19T09:02:00.000Z",
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

function getSerperApiKey() {
  return process.env.SERPER_API_KEY || "";
}

function getSerpApiKey() {
  return process.env.SERPAPI_API_KEY || "";
}

export function getLinkedInServiceClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSearchProviderLabel() {
  if (getSerperApiKey()) return "serper";
  if (getSerpApiKey()) return "serpapi";
  return "none";
}

export function getEnrichmentModeLabel() {
  return "public-company-web";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeCompanyDomainInput(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    return `${url.protocol}//${url.hostname.replace(/^www\./, "")}`;
  } catch {
    return null;
  }
}

function parseCompanySeedLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(/\t|,/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length) return null;

  const [part1, part2, part3, part4] = parts;
  const firstAsDomain = normalizeCompanyDomainInput(part1 || "");
  const secondAsDomain = normalizeCompanyDomainInput(part2 || "");

  return {
    companyName: firstAsDomain ? null : part1 || null,
    companyDomain: firstAsDomain || secondAsDomain || null,
    location: firstAsDomain ? part2 || part3 || null : part3 || null,
    segment: firstAsDomain ? part3 || part4 || null : part4 || null,
    source: "manual-bulk",
  };
}

function looksLikeCompanyName(value: string) {
  return Boolean(
    value &&
      !/^https?:\/\//i.test(value) &&
      !/\b(contact|about|team|leadership|privacy|terms)\b/i.test(value) &&
      value.trim().length >= 3,
  );
}

function detectConstructionSegments(filters: LinkedInFilters) {
  const text = normalizeText(
    [
      ...filters.keywords,
      ...filters.titles,
      ...filters.companyNames,
      ...filters.locations,
      filters.runMode,
    ].join(" "),
  );

  const segments = new Set<string>();
  if (/\barchitect|architecture|design\b/.test(text)) segments.add("architect");
  if (/\bcontractor|construction|gc|general contractor|builder|preconstruction|estimating\b/.test(text)) segments.add("contractor");
  if (/\bdeveloper|development|real estate|property|multifamily\b/.test(text)) segments.add("developer");
  if (/\bfacade|glazing|window|door|fenestration\b/.test(text)) segments.add("facade");
  if (!segments.size) {
    segments.add("architect");
    segments.add("contractor");
    segments.add("developer");
  }
  return Array.from(segments);
}

function buildAutonomousDirectoryUrls(filters: LinkedInFilters) {
  const segments = detectConstructionSegments(filters);
  const usa = filters.locations.length === 0 || filters.locations.some((item) => /\busa|united states\b/i.test(item));
  const urls = new Set<string>();

  if (usa) {
    if (segments.includes("architect")) {
      [
        "https://www.bdcnetwork.com/top-architecture-engineering-firms",
        "https://www.architecturalrecord.com/top300",
        "https://www.archpaper.com/tag/top-50/",
        "https://www.enr.com/toplists/top-500-design-firms",
      ].forEach((url) => urls.add(url));
    }

    if (segments.includes("contractor")) {
      [
        "https://www.generalcontractors.org/the-top-general-contractors-in-the-united-states/",
        "https://www.enr.com/toplists",
        "https://www.enr.com/toplists/top-contractors",
        "https://www.constructiondive.com/news/",
      ].forEach((url) => urls.add(url));
    }

    if (segments.includes("developer")) {
      [
        "https://www.multihousingnews.com/top-multifamily-developers/",
        "https://www.commercialsearch.com/news/top-commercial-real-estate-developers/",
        "https://www.multihousingnews.com/top-multifamily-owners/",
        "https://www.nreionline.com/top-owners",
      ].forEach((url) => urls.add(url));
    }

    if (segments.includes("facade")) {
      [
        "https://www.glassmagazine.com/top-glazing-contractors",
        "https://www.usglassmag.com/category/commercial/",
        "https://www.architectmagazine.com/technology/products/",
        "https://www.glassonweb.com/directory",
      ].forEach((url) => urls.add(url));
    }
  }

  return Array.from(urls);
}

function normalizeFilters(value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    runMode: source.runMode === "company" ? "company" : "linkedin",
    keywords: toStringArray(source.keywords),
    titles: toStringArray(source.titles),
    locations: toStringArray(source.locations),
    manualUrls: toStringArray(source.manualUrls).map((item) => normalizeLinkedInProfileUrl(item) || "").filter(Boolean),
    companyNames: toStringArray(source.companyNames),
    companyDomains: toStringArray(source.companyDomains)
      .map((item) => normalizeCompanyDomainInput(item) || "")
      .filter(Boolean),
    seedRows: toStringArray(source.seedRows),
    directoryUrls: toStringArray(source.directoryUrls),
    autonomousDiscovery: typeof source.autonomousDiscovery === "boolean" ? source.autonomousDiscovery : false,
    highVolume: typeof source.highVolume === "boolean" ? source.highVolume : false,
    minerMode: typeof source.minerMode === "boolean" ? source.minerMode : false,
    enrichLimit:
      typeof source.enrichLimit === "number" && Number.isFinite(source.enrichLimit)
        ? Math.max(1, Math.min(250, Math.round(source.enrichLimit)))
        : 50,
  };
}

function mapRun(row: LinkedInRunRow): LinkedInRun {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    name: row.name,
    source_query: row.source_query,
    status: row.status,
    notes: row.notes,
    last_error: row.last_error,
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
    company_domain: row.company_domain,
    location: row.location,
    linkedin_url: row.linkedin_url,
    source_query: row.source_query,
    status: row.status,
    contact_email: row.contact_email,
    contact_phone: row.contact_phone,
    contact_source: row.contact_source,
    contact_confidence: row.contact_confidence,
    scraped_at: row.scraped_at,
    created_at: row.created_at,
    raw_payload: row.raw_payload,
  };
}

function normalizeText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasAnyMatch(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(normalizeText(needle)));
}

function uniqueReasons(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

export function scoreProfileAgainstFilters(profile: LinkedInProfile, filters: LinkedInFilters) {
  const headline = normalizeText(profile.headline);
  const company = normalizeText(profile.company_name);
  const location = normalizeText(profile.location);
  const query = normalizeText(profile.source_query);
  const merged = [headline, company, location, query].join(" ");
  const reasons: string[] = [];
  let score = 0;

  if (filters.titles.length && hasAnyMatch(headline, filters.titles)) {
    score += 42;
    reasons.push("headline match na job title");
  } else if (filters.titles.length && hasAnyMatch(merged, filters.titles)) {
    score += 24;
    reasons.push("slaby match na job title");
  }

  if (filters.keywords.length) {
    const keywordHits = filters.keywords.filter((keyword) => merged.includes(normalizeText(keyword)));
    if (keywordHits.length) {
      score += Math.min(24, keywordHits.length * 10);
      reasons.push(`keyword match: ${keywordHits.slice(0, 3).join(", ")}`);
    }
  }

  if (filters.locations.length && hasAnyMatch(location || merged, filters.locations)) {
    score += 18;
    reasons.push("lokace odpovida ICP");
  }

  if (
    /\b(developer|development|general contractor|contractor|construction|architect|architecture|facade|glazing|window|door|procurement|purchasing|estimating|preconstruction)\b/.test(
      merged,
    )
  ) {
    score += 14;
    reasons.push("stavebni nebo specifikacni signal");
  }

  if (/\b(vp|head|director|chief|senior|lead|manager|partnerships|business development|sales)\b/.test(headline)) {
    score += 8;
    reasons.push("seniorita nebo revenue role");
  }

  if (/\b(owner|founder|principal|partner|procurement|purchasing|estimating|preconstruction|project manager|architect)\b/.test(headline)) {
    score += 10;
    reasons.push("decision maker nebo specifikacni role");
  }

  if (/\b(b2b|saas|enterprise|software|cloud|platform|solutions)\b/.test(`${headline} ${company}`)) {
    score += 8;
    reasons.push("B2B nebo SaaS signal");
  }

  if (profile.contact_email) {
    score += 8;
    reasons.push("ma verejny email");
  }

  if (profile.contact_phone) {
    score += 4;
    reasons.push("ma verejny telefon");
  }

  if (typeof profile.contact_confidence === "number") {
    score += Math.round(profile.contact_confidence * 6);
  }

  const capped = Math.max(0, Math.min(100, score));
  return {
    score: capped,
    grade: toGrade(capped),
    reasons: uniqueReasons(reasons),
  };
}

function attachScore(profile: LinkedInProfile, filters?: LinkedInFilters) {
  if (!filters) {
    return {
      ...profile,
      icp_score: 0,
      icp_grade: "D" as const,
      icp_reasons: [],
    };
  }

  const scored = scoreProfileAgainstFilters(profile, filters);
  return {
    ...profile,
    icp_score: scored.score,
    icp_grade: scored.grade,
    icp_reasons: scored.reasons,
  };
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
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

function chunkStrings(values: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function buildScopedSearchQuery(params: {
  titles?: string[];
  locations?: string[];
  keywords?: string[];
}) {
  const titles = uniqueStrings(params.titles);
  const locations = uniqueStrings(params.locations);
  const keywords = uniqueStrings(params.keywords);

  return [
    "site:linkedin.com/in/",
    titles.length ? `(${titles.map((title) => `"${title}"`).join(" OR ")})` : "",
    locations.length ? `(${locations.map((location) => `"${location}"`).join(" OR ")})` : "",
    keywords.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function expandIcpTerms(filters: LinkedInFilters) {
  const keywordBag = new Set(filters.keywords);
  const titleBag = new Set(filters.titles);
  const text = normalizeText([...filters.keywords, ...filters.titles].join(" "));

  if (/\barchitect|architecture|design studio|architecture firm\b/.test(text)) {
    [
      "architecture firm",
      "architectural designer",
      "commercial architecture",
      "residential architect",
      "design studio",
      "interior architecture",
      "urban design",
      "architectural studio",
      "planning and design",
    ].forEach((item) => keywordBag.add(item));
    [
      "principal architect",
      "project architect",
      "architect",
      "design director",
      "founder",
      "managing principal",
      "studio director",
      "architectural designer",
      "project designer",
    ].forEach((item) => titleBag.add(item));
  }

  if (/\bconstruction|contractor|builder|preconstruction\b/.test(text)) {
    [
      "construction company",
      "general contractor",
      "commercial construction",
      "commercial contractor",
      "builder",
      "design build",
      "real estate construction",
      "construction management",
      "multifamily construction",
    ].forEach((item) => keywordBag.add(item));
    [
      "owner",
      "founder",
      "preconstruction manager",
      "director of construction",
      "business development",
      "construction executive",
      "project executive",
      "operations manager",
      "estimator",
    ].forEach((item) => titleBag.add(item));
  }

  if (/\bdeveloper|development|real estate|property\b/.test(text)) {
    [
      "real estate developer",
      "property developer",
      "multifamily developer",
      "commercial real estate",
      "land development",
      "development company",
    ].forEach((item) => keywordBag.add(item));
    [
      "developer",
      "development director",
      "real estate developer",
      "development manager",
      "acquisitions manager",
      "principal",
    ].forEach((item) => titleBag.add(item));
  }

  return {
    runMode: filters.runMode,
    keywords: Array.from(keywordBag),
    titles: Array.from(titleBag),
    locations: filters.locations,
    manualUrls: filters.manualUrls,
    companyNames: filters.companyNames,
    companyDomains: filters.companyDomains,
    seedRows: filters.seedRows,
    directoryUrls: filters.directoryUrls,
    autonomousDiscovery: filters.autonomousDiscovery,
    highVolume: filters.highVolume,
    minerMode: filters.minerMode,
    enrichLimit: filters.enrichLimit,
  };
}

function generateSearchQueries(filters: LinkedInFilters) {
  const expanded = expandIcpTerms(filters);
  const titleChunkSize = expanded.highVolume || expanded.minerMode ? 1 : 2;
  const keywordChunkSize = expanded.highVolume || expanded.minerMode ? 1 : 2;
  const titleChunks = chunkStrings(expanded.titles, titleChunkSize);
  const keywordChunks = chunkStrings(expanded.keywords, keywordChunkSize);
  const locationChunks = chunkStrings(expanded.locations.length ? expanded.locations : ["United States"], 2);
  const maxQueries = expanded.minerMode ? 120 : expanded.highVolume ? 36 : 12;
  const queries: string[] = [];

  if (!titleChunks.length && !keywordChunks.length) {
    return [buildScopedSearchQuery({ locations: expanded.locations })];
  }

  for (const locationGroup of locationChunks) {
    for (const titleGroup of titleChunks.length ? titleChunks : [[]]) {
      for (const keywordGroup of keywordChunks.length ? keywordChunks : [[]]) {
        const query = buildScopedSearchQuery({
          titles: titleGroup,
          locations: locationGroup,
          keywords: keywordGroup,
        });
        if (query) queries.push(query);
        if (queries.length >= maxQueries) return queries;
      }
    }
  }

  return queries.length
    ? queries
    : [buildScopedSearchQuery({ titles: expanded.titles, locations: expanded.locations, keywords: expanded.keywords })];
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toAbsoluteOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function decodeHtml(value: string | null) {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractTagContent(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return decodeHtml(match?.[1]?.trim() || "");
}

function extractJsonLdBlocks(html: string) {
  const matches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  return matches
    .map((block) => block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim())
    .filter(Boolean);
}

function parseJsonLdObject(block: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(block) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

function normalizeLinkedInProfileUrl(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.endsWith("linkedin.com")) return null;
    if (!url.pathname.startsWith("/in/")) return null;
    const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
    return `https://www.linkedin.com${pathname}`;
  } catch {
    return null;
  }
}

function pickBestLinkedInUrls(results: SearchResult[]) {
  return Array.from(
    new Set(
      results
        .map((item) => normalizeLinkedInProfileUrl(item.link))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function cleanupCompanyName(value: string | null) {
  if (!value) return null;
  return value
    .replace(/\s+\|\s+LinkedIn$/i, "")
    .replace(/^at\s+/i, "")
    .replace(/\s+on LinkedIn.*$/i, "")
    .replace(/\s+view .*$/i, "")
    .replace(/\s+500\+\s+connections.*$/i, "")
    .replace(/\s+location:.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractCompanyFromHeadline(value: string | null) {
  if (!value) return null;
  const cleaned = cleanupCompanyName(value);
  if (!cleaned) return null;
  const atMatch = value.match(/\b(?:at|@)\s+(.+)$/i);
  if (atMatch?.[1]) return cleanupCompanyName(atMatch[1]);
  const pipeParts = cleaned.split("|").map((item) => item.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    const candidate = pipeParts[0];
    if (!/\barchitect|director|founder|owner|manager|principal|project\b/i.test(candidate)) {
      return cleanupCompanyName(candidate);
    }
  }
  const dashParts = cleaned.split(" - ").map((item) => item.trim()).filter(Boolean);
  if (dashParts.length >= 2 && !/\barchitect|director|founder|owner|manager|principal|project\b/i.test(dashParts[0])) {
    return cleanupCompanyName(dashParts[0]);
  }
  return null;
}

function maybeCompanyFromHeadline(value: string | null) {
  if (!value) return null;
  const cleaned = cleanupCompanyName(value);
  if (!cleaned) return null;
  if (/\b(architecture|architects|design studio|studio|construction|contractor|builders|developer|development|real estate)\b/i.test(cleaned)) {
    return cleaned;
  }
  return null;
}

function extractTitleParts(title: string) {
  return title
    .replace(/\s+\|\s+LinkedIn$/i, "")
    .split(/\s+-\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function companyCandidateLooksValid(value: string | null, fullName: string | null) {
  if (!value) return false;
  const cleaned = cleanupCompanyName(value);
  if (!cleaned) return false;
  if (fullName && normalizeText(cleaned) === normalizeText(fullName)) return false;
  if (cleaned.length < 3 || cleaned.length > 120) return false;
  if (/\b(location|connections|linkedin|profile|view)\b/i.test(cleaned)) return false;
  return true;
}

function dedupeCandidates(values: Array<string | null | undefined>, fullName: string | null) {
  const out: string[] = [];
  for (const value of values) {
    const cleaned = cleanupCompanyName(value || null);
    if (!companyCandidateLooksValid(cleaned, fullName)) continue;
    if (!out.some((item) => normalizeText(item) === normalizeText(cleaned))) {
      out.push(cleaned!);
    }
  }
  return out;
}

function extractLocation(metaDescription: string, headline: string | null) {
  const locationPatterns = [
    /(?:location|based in)\s*[:,-]?\s*([^|.]+)/i,
    /,\s*([^,]+,\s*(?:United States|USA|Cesko|Czech Republic|Germany|UK|United Kingdom))/i,
  ];

  for (const pattern of locationPatterns) {
    const match = metaDescription.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const headlineMatch = headline?.match(/\b(?:in|based in)\s+([^|]+)/i);
  return headlineMatch?.[1]?.trim() || null;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Fetch ${url} selhal (${response.status}).`);
  }

  return response.text();
}

async function searchWeb(query: string, num = 10, start = 0): Promise<SearchResult[]> {
  if (getSerperApiKey()) {
    const page = Math.floor(start / Math.max(1, num)) + 1;
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": getSerperApiKey(),
      },
      body: JSON.stringify({ q: query, num, page }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`Serper search selhal (${response.status}).`);
    }

    const json = (await response.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    return (json.organic || [])
      .map((item) => ({
        title: item.title || "",
        link: item.link || "",
        snippet: item.snippet,
      }))
      .filter((item) => item.link);
  }

  if (getSerpApiKey()) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(num));
    url.searchParams.set("start", String(start));
    url.searchParams.set("api_key", getSerpApiKey());

    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      throw new Error(`SerpAPI search selhal (${response.status}).`);
    }

    const json = (await response.json()) as {
      organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    return (json.organic_results || [])
      .map((item) => ({
        title: item.title || "",
        link: item.link || "",
        snippet: item.snippet,
      }))
      .filter((item) => item.link);
  }

  throw new Error("Chybi search provider. Nastav SERPER_API_KEY nebo SERPAPI_API_KEY.");
}

async function scrapeLinkedInPublicProfile(linkedinUrl: string): Promise<ScrapedProfileDraft> {
  const html = await fetchText(linkedinUrl);
  const title = extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i);
  const metaDescription = extractTagContent(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  const ogTitle = extractTagContent(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  const jsonLdObjects = extractJsonLdBlocks(html).map(parseJsonLdObject).filter(Boolean) as Array<Record<string, unknown>>;

  let fullName: string | null = null;
  let headline: string | null = null;
  let companyName: string | null = null;
  let location: string | null = null;

  for (const item of jsonLdObjects) {
    const typeValue = typeof item["@type"] === "string" ? item["@type"] : "";
    if (typeValue.toLowerCase() === "person") {
      fullName = typeof item.name === "string" ? item.name.trim() : fullName;
      headline = typeof item.jobTitle === "string" ? item.jobTitle.trim() : headline;
      const worksFor = item.worksFor;
      if (worksFor && typeof worksFor === "object" && !Array.isArray(worksFor)) {
        const org = worksFor as Record<string, unknown>;
        companyName = typeof org.name === "string" ? org.name.trim() : companyName;
      }
    }
  }

  const usableTitle = ogTitle || title;
  const titleSegments = extractTitleParts(usableTitle);

  if (!fullName && titleSegments[0]) {
    fullName = titleSegments[0];
  }
  if (!headline && titleSegments.length > 1) {
    headline = titleSegments.slice(1).join(" - ");
  }
  if (!location) {
    location = extractLocation(metaDescription, headline);
  }

  const metaParts = metaDescription
    .split("·")
    .map((item) => item.trim())
    .filter(Boolean);
  const titleCandidates = titleSegments.slice(1);
  const companyCandidates = dedupeCandidates(
    [
      companyName,
      extractCompanyFromHeadline(headline),
      maybeCompanyFromHeadline(headline),
      titleCandidates[0],
      titleCandidates[1],
      maybeCompanyFromHeadline(titleCandidates[0] || null),
      maybeCompanyFromHeadline(metaParts[0] || null),
      extractCompanyFromHeadline(metaParts[0] || null),
      metaParts.find((item) => /\b(architect|architecture|construction|contractor|studio|developer|development|design)\b/i.test(item)),
    ],
    fullName,
  );

  if (!companyName) {
    companyName = companyCandidates[0] || null;
  }

  return {
    linkedinUrl,
    fullName,
    headline,
    companyName,
    companyCandidates,
    location,
    rawPayload: {
      title,
      ogTitle,
      metaDescription,
      metaParts,
      jsonLdCount: jsonLdObjects.length,
    },
  };
}

function selectBestWebResult(results: SearchResult[]) {
  const candidate = results.find((item) => {
    const host = toAbsoluteOrigin(item.link);
    return host && !/linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com|mapquest|yelp/i.test(host);
  });
  return candidate ? toAbsoluteOrigin(candidate.link) : null;
}

async function discoverCompanyDomain(profile: {
  companyName: string | null;
  companyCandidates: string[];
  fullName: string | null;
  location: string | null;
  headline: string | null;
}) {
  const companyCandidates = dedupeCandidates(
    [profile.companyName, ...profile.companyCandidates, maybeCompanyFromHeadline(profile.headline)],
    profile.fullName,
  );

  for (const companyCandidate of companyCandidates.slice(0, 4)) {
    const queries = [
      `"${companyCandidate}" official website`,
      `"${companyCandidate}" ${profile.location || ""} official website`,
      `"${companyCandidate}" architecture`,
      `"${companyCandidate}" construction`,
    ].filter(Boolean);

    for (const query of queries) {
      const results = await searchWeb(query, 5);
      const domain = selectBestWebResult(results);
      if (domain) return { companyDomain: domain, resolvedCompanyName: companyCandidate };
      await delay(150);
    }
  }

  if (profile.fullName) {
    const fallbackQuery = `"${profile.fullName}" ${profile.location || ""} ${profile.headline || ""}`;
    const results = await searchWeb(fallbackQuery, 5);
    const domain = selectBestWebResult(results);
    if (domain) return { companyDomain: domain, resolvedCompanyName: profile.companyName };
  }

  return { companyDomain: null, resolvedCompanyName: profile.companyName };
}

function pickBestEmail(emails: string[], companyDomain: string | null) {
  const deduped = Array.from(new Set(emails.map((item) => item.toLowerCase())));
  if (!deduped.length) return null;
  if (companyDomain) {
    try {
      const host = new URL(companyDomain).hostname.replace(/^www\./, "");
      const exact = deduped.find((item) => item.endsWith(`@${host}`));
      if (exact) return exact;
    } catch {
      // ignore invalid host
    }
  }
  return deduped[0];
}

function pickBestPhone(phones: string[]) {
  const normalized = Array.from(new Set(phones.map((item) => item.trim()).filter(Boolean)));
  return normalized[0] || null;
}

function extractEmailsFromHtml(html: string) {
  const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return matches.filter((item) => !/example\.com$/i.test(item));
}

function extractPhonesFromHtml(html: string) {
  const telLinks = Array.from(html.matchAll(/href=["']tel:([^"']+)["']/gi)).map((match) => decodeURIComponent(match[1]));
  const plainMatches = html.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-])?(?:\d{2,4}[\s.-]){2,4}\d{2,4}/g) || [];
  return Array.from(new Set([...telLinks, ...plainMatches]))
    .map((item) => item.replace(/^tel:/i, "").trim())
    .filter((item) => {
      const digits = item.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 15) return false;
      if (/^(19|20)\d{6,}$/.test(digits)) return false;
      return /[+\-().\s]/.test(item) || item.startsWith("+");
    });
}

async function enrichPublicCompanyContact(profile: {
  companyName: string | null;
  companyCandidates: string[];
  fullName: string | null;
  location: string | null;
  headline: string | null;
}, options?: { aggressive?: boolean }): Promise<PublicContact> {
  if (!profile.companyName && !profile.companyCandidates.length) {
    return {
      resolvedCompanyName: null,
      companyDomain: null,
      contactEmail: null,
      contactPhone: null,
      contactSource: null,
      contactConfidence: null,
    };
  }

  const { companyDomain, resolvedCompanyName } = await discoverCompanyDomain(profile);
  if (!companyDomain) {
    return {
      resolvedCompanyName,
      companyDomain: null,
      contactEmail: null,
      contactPhone: null,
      contactSource: null,
      contactConfidence: null,
    };
  }

  const basePaths = ["", "/contact", "/kontakt", "/about", "/team"];
  const aggressivePaths = ["/leadership", "/our-team", "/people", "/staff", "/contact-us", "/company", "/about-us"];
  const paths = options?.aggressive ? [...basePaths, ...aggressivePaths] : basePaths;
  const emails: string[] = [];
  const phones: string[] = [];
  let contactSource: string | null = null;

  for (const path of paths) {
    try {
      const pageUrl = `${companyDomain}${path}`;
      const html = await fetchText(pageUrl);
      emails.push(...extractEmailsFromHtml(html));
      phones.push(...extractPhonesFromHtml(html));
      if ((emails.length || phones.length) && !contactSource) {
        contactSource = pageUrl;
      }
      await delay(250);
    } catch {
      // Some paths simply won't exist.
    }
  }

  const contactEmail = pickBestEmail(emails, companyDomain);
  const contactPhone = pickBestPhone(phones);
  const hits = Number(Boolean(contactEmail)) + Number(Boolean(contactPhone));

  return {
    resolvedCompanyName,
    companyDomain,
    contactEmail,
    contactPhone,
    contactSource,
    contactConfidence: hits ? Math.min(0.45 + hits * 0.2, 0.9) : null,
  };
}

function stripHtmlToLines(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?(?:p|div|section|article|li|h1|h2|h3|h4|h5|h6|br|tr|td|th)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => decodeHtml(line).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function slugifyText(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function looksLikePersonName(value: string) {
  const cleaned = value.trim();
  if (!/^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(cleaned)) return false;
  if (/\b(architecture|architects|construction|contractor|studio|design|contact|about|team|leadership)\b/i.test(cleaned)) {
    return false;
  }
  return true;
}

function looksLikeRole(value: string) {
  return /\b(architect|founder|owner|principal|partner|director|manager|lead|president|ceo|coo|cto|designer|engineer|development|construction|project|business)\b/i.test(
    value,
  );
}

function extractInternalCompanyLinks(html: string, baseOrigin: string) {
  const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi))
    .map((match) => match[1])
    .map((href) => {
      try {
        return new URL(href, baseOrigin);
      } catch {
        return null;
      }
    })
    .filter((url): url is URL => Boolean(url))
    .filter((url) => url.origin === baseOrigin)
    .map((url) => `${url.origin}${url.pathname.replace(/\/+$/, "") || "/"}`);

  return Array.from(
    new Set(
      links.filter((link) =>
        /\/(team|about|leadership|people|staff|company|contact|about-us|our-team|who-we-are|management|principals)/i.test(
          link,
        ),
      ),
    ),
  ).slice(0, 12);
}

function extractCompanyNameFromWebsite(html: string, domain: string) {
  const ogSite = extractTagContent(
    html,
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  const title = extractTagContent(html, /<title[^>]*>([^<]+)<\/title>/i);
  const metaTitle = extractTagContent(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );

  const candidates = [ogSite, title.split("|")[0], title.split("-")[0], metaTitle.split("|")[0]]
    .map((item) => cleanupCompanyName(item || null))
    .filter(Boolean);

  return candidates[0] || new URL(domain).hostname.replace(/^www\./, "");
}

function extractTeamMembersFromHtml(html: string, companyName: string) {
  const lines = stripHtmlToLines(html);
  const leads: Array<{ fullName: string; headline: string | null }> = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!looksLikePersonName(line)) continue;

    const nextLines = lines.slice(index + 1, index + 4);
    const role = nextLines.find((item) => looksLikeRole(item)) || null;
    if (normalizeText(line) === normalizeText(companyName)) continue;

    if (!leads.some((lead) => normalizeText(lead.fullName) === normalizeText(line))) {
      leads.push({ fullName: line, headline: role });
    }
  }

  return leads.slice(0, 24);
}

async function crawlCompanyWebsite(params: {
  companyDomain: string;
  companyName: string | null;
  filters: LinkedInFilters;
}) {
  const homepageHtml = await fetchText(params.companyDomain);
  const resolvedCompanyName = params.companyName || extractCompanyNameFromWebsite(homepageHtml, params.companyDomain);
  const pageUrls = Array.from(
    new Set([
      params.companyDomain,
      `${params.companyDomain}/contact`,
      `${params.companyDomain}/about`,
      `${params.companyDomain}/team`,
      `${params.companyDomain}/leadership`,
      ...extractInternalCompanyLinks(homepageHtml, params.companyDomain),
    ]),
  ).slice(0, 12);

  const emails: string[] = extractEmailsFromHtml(homepageHtml);
  const phones: string[] = extractPhonesFromHtml(homepageHtml);
  const leadMap = new Map<string, { fullName: string | null; headline: string | null; sourceUrl: string }>();
  let bestContactSource: string | null = emails.length || phones.length ? params.companyDomain : null;

  for (const pageUrl of pageUrls) {
    try {
      const html = pageUrl === params.companyDomain ? homepageHtml : await fetchText(pageUrl);
      extractEmailsFromHtml(html).forEach((email) => emails.push(email));
      extractPhonesFromHtml(html).forEach((phone) => phones.push(phone));
      if ((emails.length || phones.length) && !bestContactSource) {
        bestContactSource = pageUrl;
      }

      extractTeamMembersFromHtml(html, resolvedCompanyName).forEach((lead) => {
        const key = normalizeText(lead.fullName);
        if (!leadMap.has(key)) {
          leadMap.set(key, { ...lead, sourceUrl: pageUrl });
        }
      });
      await delay(200);
    } catch {
      // Ignore missing pages for company-first crawl.
    }
  }

  const contactEmail = pickBestEmail(emails, params.companyDomain);
  const contactPhone = pickBestPhone(phones);
  const contactConfidence =
    Number(Boolean(contactEmail)) || Number(Boolean(contactPhone))
      ? Math.min(0.45 + Number(Boolean(contactEmail)) * 0.25 + Number(Boolean(contactPhone)) * 0.2, 0.9)
      : null;

  const leads = Array.from(leadMap.values()).slice(0, Math.max(1, params.filters.enrichLimit)).map((lead) => ({
    fullName: lead.fullName,
    headline: lead.headline,
    companyName: resolvedCompanyName,
    companyDomain: params.companyDomain,
    location: params.filters.locations[0] || null,
    sourceUrl: `${lead.sourceUrl}#${slugifyText(lead.fullName || resolvedCompanyName)}`,
    contactEmail,
    contactPhone,
    contactSource: bestContactSource,
    contactConfidence,
  }));

  if (!leads.length) {
    leads.push({
      fullName: null,
      headline: "Company website contact",
      companyName: resolvedCompanyName,
      companyDomain: params.companyDomain,
      location: params.filters.locations[0] || null,
      sourceUrl: params.companyDomain,
      contactEmail,
      contactPhone,
      contactSource: bestContactSource,
      contactConfidence,
    });
  }

  return {
    companyName: resolvedCompanyName,
    companyDomain: params.companyDomain,
    contactEmail,
    contactPhone,
    contactSource: bestContactSource,
    contactConfidence,
    leads,
  };
}

async function resolveCompanySeedDomains(filters: LinkedInFilters) {
  const directDomains = uniqueStrings(filters.companyDomains)
    .map((item) => normalizeCompanyDomainInput(item) || "")
    .filter(Boolean);

  const resolved = new Map<string, string | null>();
  directDomains.forEach((domain) => resolved.set(domain, null));

  if (getSearchProviderLabel() === "none") {
    return Array.from(resolved.entries()).map(([companyDomain]) => ({
      companyDomain,
      companyName: null,
    }));
  }

  for (const companyName of filters.companyNames) {
    const query = `"${companyName}" official website`;
    try {
      const results = await searchWeb(query, 5);
      const companyDomain = selectBestWebResult(results);
      if (companyDomain) {
        resolved.set(companyDomain, companyName);
      }
      await delay(150);
    } catch {
      // Company-name-only resolution is best-effort.
    }
  }

  return Array.from(resolved.entries()).map(([companyDomain, companyName]) => ({
    companyDomain,
    companyName,
  }));
}

async function loadQueuedCompanySeeds(supabase: ReturnType<typeof getLinkedInServiceClient>, runId: string) {
  if (!supabase) throw new Error("Chybi Supabase service role.");

  const { data, error } = await supabase
    .from(LINKEDIN_TABLES.companySeeds)
    .select("id,run_id,company_name,company_domain,location,segment,source,status,last_error,raw_payload")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as CompanySeedRow[];
}

async function extractCompanySeedsFromDirectoryUrl(directoryUrl: string) {
  const html = await fetchText(directoryUrl);
  const matches = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const seeds = new Map<
    string,
    {
      companyName: string | null;
      companyDomain: string | null;
      location: string | null;
      segment: string | null;
      source: string;
    }
  >();

  for (const [, href, anchorHtml] of matches) {
    const companyDomain = normalizeCompanyDomainInput(href || "");
    if (!companyDomain) continue;
    if (/linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com|google\.com|maps\.apple\.com/i.test(companyDomain)) {
      continue;
    }

    const anchorText = decodeHtml(anchorHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const companyName = looksLikeCompanyName(anchorText) ? anchorText : null;
    const key = normalizeText(companyDomain);
    if (!seeds.has(key)) {
      seeds.set(key, {
        companyName,
        companyDomain,
        location: null,
        segment: "directory-seed",
        source: directoryUrl,
      });
    }
  }

  return Array.from(seeds.values());
}

async function retryPendingContactEnrichment(supabase: ReturnType<typeof getLinkedInServiceClient>, runId: string) {
  if (!supabase) throw new Error("Chybi Supabase service role.");

  const { data: retryRows, error: retryLoadError } = await supabase
    .from(LINKEDIN_TABLES.profiles)
    .select(PROFILE_SELECT)
    .eq("run_id", runId)
    .or("contact_email.is.null,contact_phone.is.null");

  if (retryLoadError) {
    throw new Error(retryLoadError.message);
  }

  let contactsFound = 0;

  for (const retryRow of ((retryRows || []) as LinkedInProfileRow[]).slice(0, 100)) {
    const retryProfile = mapProfile(retryRow);
    if (retryProfile.contact_email || retryProfile.contact_phone) continue;

    try {
      const retryContact = await enrichPublicCompanyContact(
        {
          companyName: retryProfile.company_name,
          companyCandidates: retryProfile.company_name ? [retryProfile.company_name] : [],
          fullName: retryProfile.full_name,
          location: retryProfile.location,
          headline: retryProfile.headline,
        },
        { aggressive: true },
      );

      if (!retryContact.contactEmail && !retryContact.contactPhone && !retryContact.companyDomain) {
        continue;
      }

      if (retryContact.contactEmail || retryContact.contactPhone) {
        contactsFound += 1;
      }

      await supabase
        .from(LINKEDIN_TABLES.profiles)
        .update({
          company_name: retryContact.resolvedCompanyName || retryProfile.company_name,
          company_domain: retryContact.companyDomain || retryProfile.company_domain,
          contact_email: retryContact.contactEmail || retryProfile.contact_email,
          contact_phone: retryContact.contactPhone || retryProfile.contact_phone,
          contact_source: retryContact.contactSource || retryProfile.contact_source,
          contact_confidence: retryContact.contactConfidence || retryProfile.contact_confidence,
          raw_payload: {
            ...(retryProfile.raw_payload || {}),
            retryEnrichment: true,
          },
        })
        .eq("id", retryProfile.id);

      await delay(200);
    } catch {
      // Retry enrichment is best-effort only.
    }
  }

  return contactsFound;
}

async function loadRunById(runId: string) {
  const supabase = getLinkedInServiceClient();
  if (!supabase) throw new Error("Chybi Supabase service role.");

  const { data, error } = await supabase
    .from(LINKEDIN_TABLES.runs)
    .select(RUN_SELECT)
    .eq("id", runId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("LinkedIn run nebyl nalezen.");
  return { supabase, run: mapRun(data as LinkedInRunRow) };
}

export function buildSourceQuery(payload: LinkedInSearchPayload) {
  if (payload.runMode === "company") {
    const companyNames = uniqueStrings(payload.companyNames);
    const companyDomains = uniqueStrings(payload.companyDomains)
      .map((item) => normalizeCompanyDomainInput(item) || item)
      .filter(Boolean);
    const locations = uniqueStrings(payload.locations);
    const keywords = uniqueStrings(payload.keywords);
    const seedRows = uniqueStrings(payload.seedRows);
    const directoryUrls = uniqueStrings(payload.directoryUrls);
    const autonomousDiscovery = Boolean(payload.autonomousDiscovery);

    return [
      "company-first",
      companyNames.length ? `names:${companyNames.join(" | ")}` : "",
      companyDomains.length ? `domains:${companyDomains.join(" | ")}` : "",
      seedRows.length ? `bulk:${seedRows.length}` : "",
      directoryUrls.length ? `directories:${directoryUrls.length}` : "",
      autonomousDiscovery ? "auto:on" : "",
      locations.length ? `locations:${locations.join(" | ")}` : "",
      keywords.length ? `keywords:${keywords.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

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
  const runMode = raw.runMode === "company" ? "company" : "linkedin";
  const keywords = uniqueStrings(raw.keywords);
  const titles = uniqueStrings(raw.titles);
  const locations = uniqueStrings(raw.locations);
  const manualUrls = uniqueStrings(raw.manualUrls).map((item) => normalizeLinkedInProfileUrl(item) || "").filter(Boolean);
  const companyNames = uniqueStrings(raw.companyNames);
  const companyDomains = uniqueStrings(raw.companyDomains)
    .map((item) => normalizeCompanyDomainInput(item) || "")
    .filter(Boolean);
  const seedRows = uniqueStrings(raw.seedRows);
  const directoryUrls = uniqueStrings(raw.directoryUrls);
  const autonomousDiscovery = Boolean(raw.autonomousDiscovery);
  const autonomousFiltersBase = {
    runMode,
    keywords,
    titles,
    locations,
    manualUrls,
    companyNames,
    companyDomains,
    seedRows,
    directoryUrls,
    autonomousDiscovery,
    highVolume: Boolean(raw.highVolume),
    minerMode: Boolean(raw.minerMode),
    enrichLimit:
      typeof raw.enrichLimit === "number" && Number.isFinite(raw.enrichLimit)
        ? Math.max(1, Math.min(250, Math.round(raw.enrichLimit)))
        : 50,
  } satisfies LinkedInFilters;
  const mergedDirectoryUrls = uniqueStrings([
    ...directoryUrls,
    ...(autonomousDiscovery && runMode === "company" ? buildAutonomousDirectoryUrls(autonomousFiltersBase) : []),
  ]);
  const sourceQuery = buildSourceQuery({
    runMode,
    keywords,
    titles,
    locations,
    companyNames,
    companyDomains,
    seedRows,
    directoryUrls: mergedDirectoryUrls,
    autonomousDiscovery,
  });
  const enrichLimit =
    typeof raw.enrichLimit === "number" && Number.isFinite(raw.enrichLimit)
      ? Math.max(1, Math.min(250, Math.round(raw.enrichLimit)))
      : 50;

  return {
    name: raw.name?.trim() || `LinkedIn run ${new Date().toLocaleDateString("cs-CZ")}`,
    notes: raw.notes?.trim() || null,
    sourceQuery,
    filters: {
      runMode,
      keywords,
      titles,
      locations,
      manualUrls,
      companyNames,
      companyDomains,
      seedRows,
      directoryUrls: mergedDirectoryUrls,
      autonomousDiscovery,
      highVolume: Boolean(raw.highVolume),
      minerMode: Boolean(raw.minerMode),
      enrichLimit,
    },
  };
}

export async function getLinkedInDashboardData(): Promise<LinkedInDashboardData> {
  const supabase = getLinkedInServiceClient();
  const searchProvider = getSearchProviderLabel();
  const enrichmentMode = getEnrichmentModeLabel();

  if (!supabase) {
    return {
      runs: sampleRuns,
      profiles: sampleProfiles.map((profile) => attachScore(profile, sampleRuns[0]?.filters)),
      ready: false,
      processorReady: false,
      searchProvider,
      enrichmentMode,
      error: "Chybi Supabase service role. Dashboard bezi v ukazkovem modu.",
    };
  }

  const [runsRes, profilesRes] = await Promise.all([
    supabase.from(LINKEDIN_TABLES.runs).select(RUN_SELECT).order("created_at", { ascending: false }).limit(12),
    supabase.from(LINKEDIN_TABLES.profiles).select(PROFILE_SELECT).order("created_at", { ascending: false }).limit(50),
  ]);

  if (runsRes.error || profilesRes.error) {
    return {
      runs: sampleRuns,
      profiles: sampleProfiles,
      ready: false,
      processorReady: false,
      searchProvider,
      enrichmentMode,
      error:
        runsRes.error?.message ||
        profilesRes.error?.message ||
        "LinkedIn tabulky zatim nejsou pripravene. Spust SQL migraci.",
    };
  }

  const runs = ((runsRes.data || []) as LinkedInRunRow[]).map(mapRun);
  const runFilterMap = new Map(runs.map((run) => [run.id, run.filters]));
  const profiles = ((profilesRes.data || []) as LinkedInProfileRow[])
    .map(mapProfile)
    .map((profile) => attachScore(profile, runFilterMap.get(profile.run_id)))
    .sort((a, b) => (b.icp_score || 0) - (a.icp_score || 0));

  return {
    runs,
    profiles,
    ready: true,
    processorReady: searchProvider !== "none",
    searchProvider,
    enrichmentMode,
  };
}

export async function createLinkedInRun(raw: LinkedInSearchPayload) {
  const supabase = getLinkedInServiceClient();
  if (!supabase) {
    throw new Error("Chybi Supabase service role. Nelze vytvorit scrape run.");
  }

  const normalized = normalizeSearchPayload(raw);
  if (normalized.filters.runMode === "company") {
    if (
      !normalized.filters.seedRows.length &&
      !normalized.filters.companyDomains.length &&
      !normalized.filters.companyNames.length &&
      !normalized.filters.directoryUrls.length &&
      !normalized.filters.autonomousDiscovery
    ) {
      throw new Error("Pro company miner zadej bulk seeds, domeny, nazvy firem, directory URL nebo zapni autonomous discovery.");
    }
    if (
      !normalized.filters.seedRows.length &&
      !normalized.filters.companyDomains.length &&
      !normalized.filters.directoryUrls.length &&
      !normalized.filters.autonomousDiscovery &&
      normalized.filters.companyNames.length &&
      getSearchProviderLabel() === "none"
    ) {
      throw new Error("Bez search provideru potrebuje company miner primo domeny firem. Samotne nazvy firmy nestaci.");
    }
  } else if (!normalized.filters.keywords.length && !normalized.filters.titles.length && !normalized.filters.locations.length) {
    if (!normalized.filters.manualUrls.length) {
      throw new Error("Vypln alespon jedno klicove slovo, job title, lokaci nebo manualni LinkedIn URL.");
    }
  }

  const { data, error } = await supabase
    .from(LINKEDIN_TABLES.runs)
    .insert({
      name: normalized.name,
      source_query: normalized.sourceQuery,
      status: "queued" as LinkedInRunStatus,
      notes: normalized.notes,
      last_error: null,
      total_candidates: 0,
      total_profiles: 0,
      filters: normalized.filters,
    })
    .select(RUN_SELECT)
    .single();

  if (error) throw new Error(error.message);

  if (normalized.filters.runMode === "company") {
    const directorySeedPayloads = [];
    for (const directoryUrl of normalized.filters.directoryUrls) {
      try {
        const generatedSeeds = await extractCompanySeedsFromDirectoryUrl(directoryUrl);
        directorySeedPayloads.push(...generatedSeeds);
      } catch {
        // Directory seed generation is best-effort during run creation.
      }
    }

    const seedPayloads = [
      ...directorySeedPayloads,
      ...normalized.filters.seedRows.map(parseCompanySeedLine).filter(Boolean),
      ...normalized.filters.companyDomains.map((companyDomain) => ({
        companyName: null,
        companyDomain,
        location: normalized.filters.locations[0] || null,
        segment: normalized.filters.keywords[0] || null,
        source: "manual-domain",
      })),
      ...normalized.filters.companyNames
        .filter((companyName) => !normalized.filters.seedRows.some((row) => normalizeText(row).includes(normalizeText(companyName))))
        .map((companyName) => ({
          companyName,
          companyDomain: null,
          location: normalized.filters.locations[0] || null,
          segment: normalized.filters.keywords[0] || null,
          source: "manual-name",
        })),
    ];

    if (seedPayloads.length) {
      const dedupedSeeds = Array.from(
        new Map(
          seedPayloads
            .filter((seed) => seed?.companyName || seed?.companyDomain)
            .map((seed) => [
              normalizeText(seed!.companyDomain || seed!.companyName || ""),
              {
                run_id: data.id,
                company_name: seed!.companyName,
                company_domain: seed!.companyDomain,
                location: seed!.location,
                segment: seed!.segment,
                source: seed!.source,
                status: "queued" as CompanySeedStatus,
                raw_payload: {
                  importedAt: new Date().toISOString(),
                  sourceKind: seed!.source === "manual-bulk" ? "bulk" : seed!.source === "manual-domain" ? "domain" : "directory",
                },
              },
            ]),
        ).values(),
      );

      const { error: seedInsertError } = await supabase.from(LINKEDIN_TABLES.companySeeds).upsert(dedupedSeeds, {
        onConflict: "run_id,company_domain,company_name",
      });

      if (seedInsertError) throw new Error(seedInsertError.message);
    }
  }

  return mapRun(data as LinkedInRunRow);
}

export async function processLinkedInRun(runId?: string | null): Promise<LinkedInProcessResult> {
  const { supabase, run: selectedRun } = runId
    ? await loadRunById(runId)
    : await (async () => {
        const supabaseClient = getLinkedInServiceClient();
        if (!supabaseClient) throw new Error("Chybi Supabase service role.");
        const { data, error } = await supabaseClient
          .from(LINKEDIN_TABLES.runs)
          .select(RUN_SELECT)
          .in("status", ["queued", "failed"])
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Neni zadny queued run ke zpracovani.");
        return { supabase: supabaseClient, run: mapRun(data as LinkedInRunRow) };
      })();

  const startedAt = new Date().toISOString();
  await supabase
    .from(LINKEDIN_TABLES.runs)
    .update({
      status: "discovering",
      started_at: startedAt,
      finished_at: null,
      last_error: null,
    })
    .eq("id", selectedRun.id);

  try {
    if (selectedRun.filters.runMode === "company") {
      let queuedSeeds = await loadQueuedCompanySeeds(supabase, selectedRun.id);
      if (!queuedSeeds.length && selectedRun.filters.directoryUrls.length) {
        const directorySeeds = [];
        for (const directoryUrl of selectedRun.filters.directoryUrls) {
          try {
            directorySeeds.push(...(await extractCompanySeedsFromDirectoryUrl(directoryUrl)));
          } catch {
            // Best-effort seed generation during processing.
          }
        }

        if (directorySeeds.length) {
          const dedupedDirectorySeeds = Array.from(
            new Map(
              directorySeeds.map((seed) => [
                normalizeText(seed.companyDomain || seed.companyName || ""),
                {
                  run_id: selectedRun.id,
                  company_name: seed.companyName,
                  company_domain: seed.companyDomain,
                  location: seed.location,
                  segment: seed.segment,
                  source: seed.source,
                  status: "queued" as CompanySeedStatus,
                  raw_payload: {
                    importedAt: new Date().toISOString(),
                    sourceKind: "directory",
                  },
                },
              ]),
            ).values(),
          );

          const { error: seedInsertError } = await supabase.from(LINKEDIN_TABLES.companySeeds).upsert(dedupedDirectorySeeds, {
            onConflict: "run_id,company_domain,company_name",
          });
          if (seedInsertError) throw new Error(seedInsertError.message);
          queuedSeeds = await loadQueuedCompanySeeds(supabase, selectedRun.id);
        }
      }

      const resolvedSeeds = queuedSeeds.length
        ? queuedSeeds
        : (await resolveCompanySeedDomains(selectedRun.filters)).map((seed) => ({
            id: seed.companyDomain || seed.companyName || crypto.randomUUID(),
            run_id: selectedRun.id,
            company_name: seed.companyName,
            company_domain: seed.companyDomain,
            location: selectedRun.filters.locations[0] || null,
            segment: selectedRun.filters.keywords[0] || null,
            source: "legacy-filters",
            status: "queued" as CompanySeedStatus,
            last_error: null,
            raw_payload: null,
          }));
      if (!resolvedSeeds.length) {
        throw new Error("Company miner nema zadne pouzitelne domeny. Zadej domeny firem, pripadne nazvy firem s aktivnim search providerem.");
      }

      await supabase
        .from(LINKEDIN_TABLES.runs)
        .update({
          status: "scraping",
          total_candidates: resolvedSeeds.length,
        })
        .eq("id", selectedRun.id);

      let processed = 0;
      let contactsFound = 0;

      for (const seed of resolvedSeeds) {
        try {
          let resolvedDomain = seed.company_domain;
          if (!resolvedDomain) {
            const resolved = await resolveCompanySeedDomains({
              ...selectedRun.filters,
              companyNames: seed.company_name ? [seed.company_name] : [],
              companyDomains: [],
              seedRows: [],
            });
            resolvedDomain = resolved[0]?.companyDomain || null;
          }

          if (!resolvedDomain) {
            throw new Error("Nepodarilo se dohledat domenu firmy.");
          }

          const crawled = await crawlCompanyWebsite({
            companyDomain: resolvedDomain,
            companyName: seed.company_name,
            filters: selectedRun.filters,
          });

          const rows = crawled.leads.map((lead) => ({
            run_id: selectedRun.id,
            linkedin_url: lead.sourceUrl,
            source_query: selectedRun.source_query,
            full_name: lead.fullName,
            headline: lead.headline,
            company_name: lead.companyName,
            company_domain: lead.companyDomain,
            location: lead.location,
            contact_email: lead.contactEmail,
            contact_phone: lead.contactPhone,
            contact_source: lead.contactSource,
            contact_confidence: lead.contactConfidence,
            status: "scraped" as LinkedInProfileStatus,
            scraped_at: new Date().toISOString(),
            raw_payload: {
              sourceType: "company-website",
              runMode: "company",
            },
          }));

          const { error: insertError } = await supabase
            .from(LINKEDIN_TABLES.profiles)
            .upsert(rows, { onConflict: "run_id,linkedin_url" });

          if (insertError) throw new Error(insertError.message);

          const { error: companyUpsertError } = await supabase.from(LINKEDIN_TABLES.companies).upsert(
            {
              normalized_name: normalizeText(crawled.companyName || resolvedDomain),
              company_name: crawled.companyName || resolvedDomain,
              company_domain: crawled.companyDomain,
              location: selectedRun.filters.locations[0] || null,
              source: "company-miner",
              raw_payload: {
                runId: selectedRun.id,
                contactEmail: crawled.contactEmail,
                contactPhone: crawled.contactPhone,
              },
            },
            { onConflict: "normalized_name" },
          );

          if (companyUpsertError) throw new Error(companyUpsertError.message);

          if (queuedSeeds.length) {
            await supabase
              .from(LINKEDIN_TABLES.companySeeds)
              .update({
                company_domain: resolvedDomain,
                status: "crawled" as CompanySeedStatus,
                last_error: null,
                raw_payload: {
                  ...(seed.raw_payload || {}),
                  processedAt: new Date().toISOString(),
                  leadsFound: rows.length,
                },
              })
              .eq("id", seed.id);
          }

          processed += rows.length;
          contactsFound += rows.filter((row) => row.contact_email || row.contact_phone).length;
          await delay(250);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Company crawl selhal.";
          await supabase
            .from(LINKEDIN_TABLES.profiles)
            .upsert(
              {
                run_id: selectedRun.id,
                linkedin_url: seed.company_domain || seed.company_name || crypto.randomUUID(),
                source_query: selectedRun.source_query,
                full_name: null,
                headline: "Company crawl failed",
                company_name: seed.company_name,
                company_domain: seed.company_domain,
                location: selectedRun.filters.locations[0] || null,
                status: "failed" as LinkedInProfileStatus,
                raw_payload: {
                  sourceType: "company-website",
                  error: message,
                },
              },
              { onConflict: "run_id,linkedin_url" },
            );

          if (queuedSeeds.length) {
            await supabase
              .from(LINKEDIN_TABLES.companySeeds)
              .update({
                status: "failed" as CompanySeedStatus,
                last_error: message,
              })
              .eq("id", seed.id);
          }
        }
      }

      const finishedAt = new Date().toISOString();
      const { data: finalRunRow, error: finalRunError } = await supabase
        .from(LINKEDIN_TABLES.runs)
        .update({
          status: "completed",
          total_candidates: resolvedSeeds.length,
          total_profiles: processed,
          finished_at: finishedAt,
          last_error: null,
        })
        .eq("id", selectedRun.id)
        .select(RUN_SELECT)
        .single();

      if (finalRunError) throw new Error(finalRunError.message);

      return {
        run: mapRun(finalRunRow as LinkedInRunRow),
        discovered: resolvedSeeds.length,
        processed,
        contactsFound,
        searchProvider: "company-seed",
        enrichmentMode: "company-website-crawl",
      };
    }

    const manualUrls = selectedRun.filters.manualUrls || [];
    let discoveredUrls: string[] = [];

    if (manualUrls.length) {
      discoveredUrls = manualUrls;
    } else {
      if (getSearchProviderLabel() === "none") {
        throw new Error("Chybi search provider. Nastav SERPER_API_KEY nebo SERPAPI_API_KEY, nebo pouzij manualni LinkedIn URL.");
      }
      const queries = generateSearchQueries(selectedRun.filters);
      const discoveredMap = new Map<string, number>();
      const pageStarts = selectedRun.filters.minerMode
        ? [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]
        : selectedRun.filters.highVolume
          ? [0, 10, 20]
          : [0];

      for (const query of queries) {
        for (const start of pageStarts) {
          const searchResults = await searchWeb(query, 10, start);
          const queryUrls = pickBestLinkedInUrls(searchResults);
          queryUrls.forEach((url) => discoveredMap.set(url, (discoveredMap.get(url) || 0) + 1));
          if (!queryUrls.length) break;
          await delay(selectedRun.filters.minerMode ? 80 : 250);
        }
      }

      discoveredUrls = Array.from(discoveredMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([url]) => url);
    }

    if (discoveredUrls.length) {
      const rows = discoveredUrls.map((linkedinUrl) => ({
        run_id: selectedRun.id,
        linkedin_url: linkedinUrl,
        source_query: selectedRun.source_query,
        status: "pending" as LinkedInProfileStatus,
        raw_payload: {
          discoverySource: manualUrls.length ? "manual" : getSearchProviderLabel(),
          discoveredAt: new Date().toISOString(),
          discoveryRank: discoveredUrls.indexOf(linkedinUrl) + 1,
        },
      }));

      const { error: upsertError } = await supabase
        .from(LINKEDIN_TABLES.profiles)
        .upsert(rows, { onConflict: "run_id,linkedin_url" });

      if (upsertError) throw new Error(upsertError.message);
    }

    await supabase
      .from(LINKEDIN_TABLES.runs)
      .update({
        status: "scraping",
        total_candidates: discoveredUrls.length,
      })
      .eq("id", selectedRun.id);

    let processed = 0;
    let contactsFound = 0;
    const enrichmentUrls = selectedRun.filters.minerMode
      ? discoveredUrls.slice(0, Math.min(selectedRun.filters.enrichLimit, discoveredUrls.length))
      : discoveredUrls;

    for (const linkedinUrl of enrichmentUrls) {
      try {
        const profile = await scrapeLinkedInPublicProfile(linkedinUrl);
        const contact = await enrichPublicCompanyContact({
      companyName: profile.companyName,
      companyCandidates: profile.companyCandidates,
      fullName: profile.fullName,
      location: profile.location,
      headline: profile.headline,
        });
        if (contact.contactEmail || contact.contactPhone) contactsFound += 1;

        const { error: profileError } = await supabase
          .from(LINKEDIN_TABLES.profiles)
          .update({
            full_name: profile.fullName,
            headline: profile.headline,
            company_name: contact.resolvedCompanyName || profile.companyName,
            company_domain: contact.companyDomain,
            location: profile.location,
            contact_email: contact.contactEmail,
            contact_phone: contact.contactPhone,
            contact_source: contact.contactSource,
            contact_confidence: contact.contactConfidence,
            status: "scraped",
            scraped_at: new Date().toISOString(),
            raw_payload: {
              ...profile.rawPayload,
              searchProvider: manualUrls.length ? "manual" : getSearchProviderLabel(),
              enrichmentMode: getEnrichmentModeLabel(),
            },
          })
          .eq("run_id", selectedRun.id)
          .eq("linkedin_url", linkedinUrl);

        if (profileError) throw new Error(profileError.message);
        processed += 1;
        await delay(450);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Scraping profilu selhal.";
        await supabase
          .from(LINKEDIN_TABLES.profiles)
          .update({
            status: "failed",
            raw_payload: {
              error: message,
              failedAt: new Date().toISOString(),
            },
          })
          .eq("run_id", selectedRun.id)
          .eq("linkedin_url", linkedinUrl);
      }
    }

    contactsFound += await retryPendingContactEnrichment(supabase, selectedRun.id);

    const finishedAt = new Date().toISOString();
    const { data: finalRunRow, error: finalRunError } = await supabase
      .from(LINKEDIN_TABLES.runs)
      .update({
        status: "completed",
        total_candidates: discoveredUrls.length,
        total_profiles: processed,
        finished_at: finishedAt,
        last_error: null,
      })
      .eq("id", selectedRun.id)
      .select(RUN_SELECT)
      .single();

    if (finalRunError) throw new Error(finalRunError.message);

    return {
      run: mapRun(finalRunRow as LinkedInRunRow),
      discovered: discoveredUrls.length,
      processed,
      contactsFound,
      searchProvider: manualUrls.length ? "manual" : getSearchProviderLabel(),
      enrichmentMode: getEnrichmentModeLabel(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "LinkedIn processing selhal.";
    await supabase
      .from(LINKEDIN_TABLES.runs)
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: message,
      })
      .eq("id", selectedRun.id);
    throw new Error(message);
  }
}

export async function enrichPendingLinkedInRun(runId: string) {
  const { supabase, run } = await loadRunById(runId);
  const contactsFound = await retryPendingContactEnrichment(supabase, runId);

  const { data, error } = await supabase
    .from(LINKEDIN_TABLES.runs)
    .select(RUN_SELECT)
    .eq("id", runId)
    .single();

  if (error) throw new Error(error.message);

  return {
    run: mapRun(data as LinkedInRunRow),
    discovered: run.total_candidates,
    processed: run.total_profiles,
    contactsFound,
    searchProvider: getSearchProviderLabel(),
    enrichmentMode: `${getEnrichmentModeLabel()}-retry`,
  };
}

export async function listLinkedInResults(params: {
  runId?: string | null;
  q?: string | null;
  limit?: number | null;
  minScore?: number | null;
  contactsOnly?: boolean | null;
}) {
  const supabase = getLinkedInServiceClient();
  if (!supabase) {
    const filters = sampleRuns.find((run) => run.id === params.runId)?.filters || sampleRuns[0]?.filters;
    const scored = sampleProfiles.map((profile) => attachScore(profile, filters));
    return {
      ready: false,
      items: scored,
      total: scored.length,
    };
  }

  let runFilters: LinkedInFilters | undefined;
  if (params.runId) {
    const { data: runRow, error: runError } = await supabase
      .from(LINKEDIN_TABLES.runs)
      .select("filters")
      .eq("id", params.runId)
      .maybeSingle();
    if (runError) throw new Error(runError.message);
    runFilters = normalizeFilters(runRow?.filters);
  }

  const limit = Math.max(1, Math.min(100, Number(params.limit || 30)));
  let query = supabase
    .from(LINKEDIN_TABLES.profiles)
    .select(PROFILE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.runId) {
    query = query.eq("run_id", params.runId);
  }

  if (params.q?.trim()) {
    const safe = params.q.trim();
    query = query.or(
      `full_name.ilike.%${safe}%,headline.ilike.%${safe}%,company_name.ilike.%${safe}%,location.ilike.%${safe}%,contact_email.ilike.%${safe}%,contact_phone.ilike.%${safe}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let items = ((data || []) as LinkedInProfileRow[]).map(mapProfile).map((profile) => attachScore(profile, runFilters));

  if (params.contactsOnly) {
    items = items.filter((profile) => profile.contact_email || profile.contact_phone);
  }

  if (typeof params.minScore === "number" && Number.isFinite(params.minScore)) {
    items = items.filter((profile) => (profile.icp_score || 0) >= params.minScore!);
  }

  items.sort((a, b) => (b.icp_score || 0) - (a.icp_score || 0));

  return {
    ready: true,
    items,
    total: items.length || count || 0,
  };
}

export async function exportLinkedInResultsCsv(params: {
  runId?: string | null;
  q?: string | null;
  minScore?: number | null;
  contactsOnly?: boolean | null;
}) {
  const results = await listLinkedInResults({
    runId: params.runId,
    q: params.q,
    minScore: params.minScore,
    contactsOnly: params.contactsOnly,
    limit: 500,
  });

  const header = [
    "full_name",
    "headline",
    "company_name",
    "company_domain",
    "location",
    "source_url",
    "linkedin_url",
    "contact_email",
    "contact_phone",
    "contact_source",
    "contact_confidence",
    "icp_score",
    "icp_grade",
    "icp_reasons",
    "status",
    "scraped_at",
  ];

  const rows = results.items.map((profile) =>
    [
      profile.full_name,
      profile.headline,
      profile.company_name,
      profile.company_domain,
      profile.location,
      profile.linkedin_url,
      profile.linkedin_url,
      profile.contact_email,
      profile.contact_phone,
      profile.contact_source,
      profile.contact_confidence,
      profile.icp_score,
      profile.icp_grade,
      profile.icp_reasons?.join("; "),
      profile.status,
      profile.scraped_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [header.map(csvEscape).join(","), ...rows].join("\n");
}
