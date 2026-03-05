import { NextResponse } from 'next/server';
import { getBessAdminConfig, mergeAdminConfig, saveBessAdminConfig } from '@/lib/bess-admin-config';

export const runtime = 'nodejs';

type AdminConfigPayload = {
  config?: unknown;
};

function isAuthorized(request: Request) {
  const expected = process.env.BESS_ADMIN_TOKEN;
  if (!expected) return true;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === expected;
}

export async function GET() {
  try {
    const config = await getBessAdminConfig();
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load config.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as AdminConfigPayload;
    const nextConfig = mergeAdminConfig(payload.config);
    const saved = await saveBessAdminConfig(nextConfig);
    return NextResponse.json({ ok: true, config: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save config.' }, { status: 500 });
  }
}
