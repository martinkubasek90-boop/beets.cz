import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() || "";
  const pathname = request.nextUrl.pathname;

  if (host === "tomaspernik.cz" || host === "www.tomaspernik.cz") {
    const url = request.nextUrl.clone();

    if (pathname === "/tomas-pernik") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    if (pathname === "/tomas-pernik/admin") {
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    if (pathname === "/tomas-pernik/admin/news") {
      url.pathname = "/admin/news";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      url.pathname = "/tomas-pernik";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/admin") {
      url.pathname = "/tomas-pernik/admin";
      return NextResponse.rewrite(url);
    }

    if (pathname === "/admin/news") {
      url.pathname = "/tomas-pernik/admin/news";
      return NextResponse.rewrite(url);
    }

    if (!pathname.startsWith("/api/tomas-pernik/")) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/memodo" || pathname.startsWith("/memodo/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/memodo/, "/Memodo");
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
