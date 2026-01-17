import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type CreateSharePayload = {
  item_type: 'beat' | 'project';
  item_id: string;
  allow_download?: boolean;
  expires_in_hours?: number; // default 72
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = (await req.json()) as CreateSharePayload;
  if (!body?.item_type || !body?.item_id) {
    return NextResponse.json({ error: 'Missing item_type or item_id' }, { status: 400 });
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Pokusíme se použít service role, abychom nepadali na RLS/ACL při insertu do share_links
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbClient =
    supabaseUrl && serviceKey
      ? createSupabaseClient(supabaseUrl, serviceKey)
      : supabase;

  const expiresHours = body.expires_in_hours && body.expires_in_hours > 0 ? body.expires_in_hours : 72;
  const expires_at = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();
  const token = randomUUID().replace(/-/g, '');

  const { error } = await dbClient.from('share_links').insert({
    item_type: body.item_type,
    item_id: body.item_id,
    token,
    allow_download: Boolean(body.allow_download),
    expires_at,
    created_by: auth.user.id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : '');

  return NextResponse.json({
    ok: true,
    token,
    url: `${baseUrl}/share/${token}`,
    expires_at,
    allow_download: Boolean(body.allow_download),
  });
}
