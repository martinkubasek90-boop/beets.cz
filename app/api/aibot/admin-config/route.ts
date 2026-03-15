import { NextResponse } from "next/server";
import {
  defaultAIBotAdminConfig,
  getAIBotAdminConfig,
  saveAIBotAdminConfig,
  type AIBotAdminConfig,
} from "@/lib/aibot-admin-config";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.AIBOT_ADMIN_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const config = await getAIBotAdminConfig();
    return NextResponse.json({ ok: true, config });
  } catch {
    return NextResponse.json({ ok: true, config: defaultAIBotAdminConfig });
  }
}

export async function PUT(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    config?: AIBotAdminConfig;
  };
  if (!body?.config) {
    return NextResponse.json({ error: "Missing config payload." }, { status: 400 });
  }

  try {
    const saved = await saveAIBotAdminConfig(body.config);
    return NextResponse.json({ ok: true, config: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
