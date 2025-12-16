import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase service env' }, { status: 500 });
  }
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const { data: rows, error } = await supabase
      .from('storage_orphans')
      .select('id,bucket,path')
      .is('resolved_at', null)
      .order('found_at', { ascending: true })
      .limit(20);
    if (error) throw error;

    const resolved: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const row of rows || []) {
      try {
        const { error: delErr } = await supabase.storage.from(row.bucket).remove([row.path]);
        if (delErr) throw delErr;
        await supabase
          .from('storage_orphans')
          .update({ resolved_at: new Date().toISOString(), note: 'deleted' })
          .eq('id', row.id);
        resolved.push(row.id);
      } catch (inner: any) {
        console.error('Cleanup failed for', row.bucket, row.path, inner);
        failed.push({ id: row.id, error: inner?.message || 'delete failed' });
        await supabase
          .from('storage_orphans')
          .update({ note: `delete_failed: ${inner?.message || 'unknown'}` })
          .eq('id', row.id);
      }
    }

    return NextResponse.json({ resolved, failed });
  } catch (err: any) {
    console.error('storage-orphans/cleanup failed:', err);
    return NextResponse.json({ error: err?.message || 'cleanup failed' }, { status: 500 });
  }
}
