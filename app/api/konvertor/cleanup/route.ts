import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getStorageClient(): SupabaseClient<any> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function removeFolder(bucket: string, prefix: string, supabase: SupabaseClient<any>) {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data?.length) return;
  const paths = data.map((item) => `${prefix}/${item.name}`);
  await supabase.storage.from(bucket).remove(paths);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { jobId?: string };
    const jobId = payload?.jobId?.trim();
    if (!jobId) {
      return NextResponse.json({ error: 'Chybí jobId.' }, { status: 400 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Chybí Supabase service key.' }, { status: 500 });
    }

    const bucket = 'konvertor';
    await removeFolder(bucket, `jobs/${jobId}/input`, supabase);
    await removeFolder(bucket, `jobs/${jobId}/output`, supabase);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Cleanup selhal.' }, { status: 500 });
  }
}
