import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!projectId || !password) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const dbClient =
      supabaseUrl && serviceKey
        ? createSupabaseClient(supabaseUrl, serviceKey)
        : supabase;
    const { data: project, error } = await dbClient
      .from('projects')
      .select('id, access_mode, access_password_hash')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !project) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    if (project.access_mode !== 'request') {
      return NextResponse.json({ ok: true });
    }

    if (!project.access_password_hash) {
      return NextResponse.json({ ok: true });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    return NextResponse.json({ ok: hash === project.access_password_hash });
  } catch (err) {
    console.error('Verify password failed:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
