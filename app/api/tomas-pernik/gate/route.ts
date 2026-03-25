import crypto from "node:crypto";
import { NextResponse } from "next/server";

const GATE_COOKIE = "tp_gate";
const GATE_HASH = "4c710d0d9f52599d60e5af2fae3072c21247f47947ed1bef513c3e16f6a4531f";

function hashPassword(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let password = "";
  let next = "/tomas-pernik";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null);
    if (typeof body?.password === "string") password = body.password;
    if (typeof body?.next === "string") next = body.next;
  } else {
    const form = await request.formData().catch(() => null);
    const formPassword = form?.get("password");
    const formNext = form?.get("next");
    if (typeof formPassword === "string") password = formPassword;
    if (typeof formNext === "string") next = formNext;
  }

  if (!password || hashPassword(password) !== GATE_HASH) {
    return NextResponse.redirect(new URL("/tomas-pernik/gate?error=1", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(GATE_COOKIE, GATE_HASH, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
