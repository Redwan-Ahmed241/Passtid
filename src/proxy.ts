import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Only signed-in users can see slots. This is the fast first gate: no session
 * cookie means a redirect to /login before the page renders. The API still
 * verifies the cookie on every request, so this is not the only protection.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("tl_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/console/:path*"],
};
