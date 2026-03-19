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
    keywords: string[];
    titles: string[];
    locations: string[];
    manualUrls: string[];
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
  keywords?: string[];
  titles?: string[];
  locations?: string[];
  manualUrls?: string[];
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
  location: string | null;
  rawPayload: Record<string, unknown>;
};

type PublicContact = {
  companyDomain: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactSource: string | null;
  contactConfidence: number | null;
};

type LinkedInFilters = {
  keywords: string[];
  titles: string[];
  locations: string[];
  manualUrls: string[];
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
      keywords: ["B2B", "SaaS"],
      titles: ["business development", "partnerships"],
      locations: ["United States", "USA"],
      manualUrls: [],
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

function normalizeFilters(value: unknown) {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    keywords: toStringArray(source.keywords),
    titles: toStringArray(source.titles),
    locations: toStringArray(source.locations),
    manualUrls: toStringArray(source.manualUrls).map((item) => normalizeLinkedInProfileUrl(item) || "").filter(Boolean),
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

  if (/\b(vp|head|director|chief|senior|lead|manager|partnerships|business development|sales)\b/.test(headline)) {
    score += 8;
    reasons.push("seniorita nebo revenue role");
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
    .trim();
}

function extractCompanyFromHeadline(value: string | null) {
  if (!value) return null;
  const atMatch = value.match(/\b(?:at|@)\s+(.+)$/i);
  if (atMatch?.[1]) return cleanupCompanyName(atMatch[1]);
  return null;
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

async function searchWeb(query: string, num = 10): Promise<SearchResult[]> {
  if (getSerperApiKey()) {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": getSerperApiKey(),
      },
      body: JSON.stringify({ q: query, num }),
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
  const titleSegments = usableTitle
    .replace(/\s+\|\s+LinkedIn$/i, "")
    .split(/\s+-\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!fullName && titleSegments[0]) {
    fullName = titleSegments[0];
  }
  if (!headline && titleSegments.length > 1) {
    headline = titleSegments.slice(1).join(" - ");
  }
  if (!companyName) {
    companyName = extractCompanyFromHeadline(headline) || extractCompanyFromHeadline(metaDescription);
  }
  if (!location) {
    location = extractLocation(metaDescription, headline);
  }

  return {
    linkedinUrl,
    fullName,
    headline,
    companyName,
    location,
    rawPayload: {
      title,
      ogTitle,
      metaDescription,
      jsonLdCount: jsonLdObjects.length,
    },
  };
}

async function discoverCompanyDomain(companyName: string) {
  const results = await searchWeb(`"${companyName}" official website`, 5);
  const candidate = results.find((item) => {
    const host = toAbsoluteOrigin(item.link);
    return (
      host &&
      !/linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|youtube\.com/i.test(host)
    );
  });
  return candidate ? toAbsoluteOrigin(candidate.link) : null;
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
  const matches = html.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{2,4}/g) || [];
  return matches
    .map((item) => item.trim())
    .filter((item) => item.replace(/\D/g, "").length >= 7);
}

async function enrichPublicCompanyContact(companyName: string | null): Promise<PublicContact> {
  if (!companyName) {
    return {
      companyDomain: null,
      contactEmail: null,
      contactPhone: null,
      contactSource: null,
      contactConfidence: null,
    };
  }

  const companyDomain = await discoverCompanyDomain(companyName);
  if (!companyDomain) {
    return {
      companyDomain: null,
      contactEmail: null,
      contactPhone: null,
      contactSource: null,
      contactConfidence: null,
    };
  }

  const paths = ["", "/contact", "/kontakt", "/about", "/team"];
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
    companyDomain,
    contactEmail,
    contactPhone,
    contactSource,
    contactConfidence: hits ? Math.min(0.45 + hits * 0.2, 0.9) : null,
  };
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
  const manualUrls = uniqueStrings(raw.manualUrls).map((item) => normalizeLinkedInProfileUrl(item) || "").filter(Boolean);
  const sourceQuery = buildSourceQuery({ keywords, titles, locations });

  return {
    name: raw.name?.trim() || `LinkedIn run ${new Date().toLocaleDateString("cs-CZ")}`,
    notes: raw.notes?.trim() || null,
    sourceQuery,
    filters: { keywords, titles, locations, manualUrls },
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
  if (!normalized.filters.keywords.length && !normalized.filters.titles.length && !normalized.filters.locations.length) {
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
    const manualUrls = selectedRun.filters.manualUrls || [];
    let discoveredUrls: string[] = [];

    if (manualUrls.length) {
      discoveredUrls = manualUrls;
    } else {
      if (getSearchProviderLabel() === "none") {
        throw new Error("Chybi search provider. Nastav SERPER_API_KEY nebo SERPAPI_API_KEY, nebo pouzij manualni LinkedIn URL.");
      }
      const searchResults = await searchWeb(selectedRun.source_query, 10);
      discoveredUrls = pickBestLinkedInUrls(searchResults);
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

    for (const linkedinUrl of discoveredUrls) {
      try {
        const profile = await scrapeLinkedInPublicProfile(linkedinUrl);
        const contact = await enrichPublicCompanyContact(profile.companyName);
        if (contact.contactEmail || contact.contactPhone) contactsFound += 1;

        const { error: profileError } = await supabase
          .from(LINKEDIN_TABLES.profiles)
          .update({
            full_name: profile.fullName,
            headline: profile.headline,
            company_name: profile.companyName,
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
