import { NextResponse } from "next/server";
import {
  defaultMemodoAdminConfig,
  getMemodoAdminConfig,
  saveMemodoAdminConfig,
  type MemodoAdminConfig,
} from "@/lib/memodo-admin-config";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.MEMODO_ADMIN_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function GET() {
  try {
    const config = await getMemodoAdminConfig();
    return NextResponse.json({ ok: true, config });
  } catch {
    return NextResponse.json({ ok: true, config: defaultMemodoAdminConfig });
  }
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { config?: MemodoAdminConfig };
  if (!body?.config) {
    return NextResponse.json({ error: "Missing config payload." }, { status: 400 });
  }

  try {
    const saved = await saveMemodoAdminConfig(body.config);
    return NextResponse.json({ ok: true, config: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

