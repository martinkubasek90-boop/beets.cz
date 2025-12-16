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
    // vezmeme pár jobů, které čekají nebo se zasekly v processing
    const { data: jobs, error } = await supabase
      .from('media_jobs')
      .select('*')
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;

    const processed: string[] = [];
    const now = new Date().toISOString();
    for (const job of jobs || []) {
      // označíme jako processing (optimisticky)
      await supabase
        .from('media_jobs')
        .update({ status: 'processing', started_at: now })
        .eq('id', job.id)
        .in('status', ['queued', 'processing']);

      // TODO: skutečná validace/transcode/waveform – zde jen simulace úspěchu
      await supabase
        .from('media_jobs')
        .update({
          status: 'succeeded',
          finished_at: new Date().toISOString(),
          error_message: null,
          meta: { ...(job.meta || {}), simulated: true },
        })
        .eq('id', job.id);
      processed.push(job.id);
    }

    return NextResponse.json({ processed });
  } catch (err: any) {
    console.error('media-jobs/process failed:', err);
    return NextResponse.json({ error: err?.message || 'processing failed' }, { status: 500 });
  }
}
