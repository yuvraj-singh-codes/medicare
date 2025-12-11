import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/chat"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const session = request.cookies.get("mc_session")?.value;
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat"],
};

