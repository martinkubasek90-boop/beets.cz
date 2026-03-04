import { createClient } from '@supabase/supabase-js';

type SourceType = 'url' | 'text';

type KnowledgeItem = {
  type: SourceType;
  label?: string;
  url?: string;
  text?: string;
};

type KnowledgeChunk = {
  id: string;
  chunk_text: string;
  source_id: string;
  chunk_index: number;
  metadata: Record<string, unknown> | null;
  bess_knowledge_sources: {
    id: string;
    source_label: string | null;
    source_url: string | null;
    namespace: string;
  } | null;
};

export type KnowledgeCitation = {
  sourceLabel: string;
  sourceUrl?: string | null;
  snippet: string;
  score: number;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const stopWords = new Set([
  'a', 'i', 'o', 'u', 'v', 'z', 's', 'na', 'do', 'pro', 'po', 'od', 'k', 'se', 'si', 'je', 'to',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'will',
]);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');

const tokenize = (value: string) =>
  normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 2 && !stopWords.has(v));

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoChunks(text: string, chunkSize = 1200, overlap = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < clean.length) {
    let end = Math.min(clean.length, cursor + chunkSize);
    if (end < clean.length) {
      const boundary = clean.lastIndexOf(' ', end);
      if (boundary > cursor + chunkSize * 0.6) {
        end = boundary;
      }
    }

    const chunk = clean.slice(cursor, end).trim();
    if (chunk.length > 40) {
      chunks.push(chunk);
    }

    if (end >= clean.length) break;
    cursor = Math.max(0, end - overlap);
  }

  return chunks;
}

async function fetchUrlText(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'BEETS-BESS-KB-Bot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`URL fetch failed (${response.status})`);
  }

  const html = await response.text();
  return stripHtml(html);
}

export async function ingestKnowledgeItems(namespace: string, items: KnowledgeItem[]) {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error('Missing Supabase service configuration.');
  }

  const summary: Array<{ label: string; chunks: number }> = [];

  for (const item of items) {
    const sourceType = item.type;
    const sourceLabel = item.label?.trim() || (sourceType === 'url' ? item.url?.trim() : 'Text source');

    let content = '';
    let sourceUrl: string | null = null;

    if (sourceType === 'url') {
      if (!item.url?.trim()) {
        throw new Error('Missing URL in url-type knowledge item.');
      }
      sourceUrl = item.url.trim();
      content = await fetchUrlText(sourceUrl);
    } else {
      content = (item.text || '').trim();
    }

    if (!content || content.length < 120) {
      throw new Error(`Source "${sourceLabel || 'unknown'}" has too little content.`);
    }

    const chunks = splitIntoChunks(content);
    if (!chunks.length) {
      throw new Error(`No valid chunks generated for "${sourceLabel || 'unknown'}".`);
    }

    const { data: source, error: sourceError } = await supabase
      .from('bess_knowledge_sources')
      .insert({
        namespace,
        source_type: sourceType,
        source_label: sourceLabel || null,
        source_url: sourceUrl,
        content,
      })
      .select('id')
      .single();

    if (sourceError || !source?.id) {
      throw new Error(`Failed to insert source: ${sourceError?.message || 'unknown error'}`);
    }

    const chunkRows = chunks.map((chunk, index) => ({
      source_id: source.id,
      chunk_index: index,
      chunk_text: chunk,
      token_count: tokenize(chunk).length,
      metadata: { namespace, sourceType },
    }));

    const { error: chunkError } = await supabase.from('bess_knowledge_chunks').insert(chunkRows);
    if (chunkError) {
      throw new Error(`Failed to insert chunks: ${chunkError.message}`);
    }

    summary.push({ label: sourceLabel || `source-${source.id}`, chunks: chunkRows.length });
  }

  return summary;
}

function scoreChunk(queryTokens: string[], chunkText: string) {
  if (!queryTokens.length) return 0;

  const text = normalizeText(chunkText);
  let score = 0;

  for (const token of queryTokens) {
    const exactMatches = text.split(token).length - 1;
    if (exactMatches > 0) {
      score += exactMatches * 2;
      continue;
    }

    if (text.includes(token.slice(0, Math.max(3, token.length - 2)))) {
      score += 0.8;
    }
  }

  return score;
}

export async function retrieveKnowledge(namespace: string, question: string, maxItems = 4) {
  const supabase = getServiceClient();
  if (!supabase) {
    return [] as KnowledgeCitation[];
  }

  const queryTokens = tokenize(question);
  if (!queryTokens.length) return [] as KnowledgeCitation[];

  const { data, error } = await supabase
    .from('bess_knowledge_chunks')
    .select(
      'id,chunk_text,source_id,chunk_index,metadata,bess_knowledge_sources(id,source_label,source_url,namespace)'
    )
    .order('created_at', { ascending: false })
    .limit(400);

  if (error || !data?.length) {
    return [] as KnowledgeCitation[];
  }

  const rows = (data as unknown as KnowledgeChunk[]).filter(
    (row) => row.bess_knowledge_sources?.namespace === namespace
  );

  const ranked = rows
    .map((row) => {
      const score = scoreChunk(queryTokens, row.chunk_text);
      return { row, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((entry) => ({
      sourceLabel: entry.row.bess_knowledge_sources?.source_label || 'Neoznačený zdroj',
      sourceUrl: entry.row.bess_knowledge_sources?.source_url,
      snippet: `${entry.row.chunk_text.slice(0, 220).trim()}...`,
      score: Number(entry.score.toFixed(2)),
    }));

  return ranked;
}
