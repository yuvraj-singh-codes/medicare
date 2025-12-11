import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/signup"];
const PROTECTED_PATHS = ["/chat"];
const SESSION_COOKIE = "mc_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore API routes, Next internals, and assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Redirect logged-in users away from auth pages
  if (hasSession && AUTH_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated users trying to access protected pages
  if (!hasSession && PROTECTED_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|.*\\..*).*)"],
};

