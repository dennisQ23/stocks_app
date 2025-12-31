import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Enforces authentication by redirecting unauthenticated requests to the root path.
 *
 * @param request - The incoming NextRequest to inspect for a session cookie.
 * @returns A `NextResponse` that redirects to `/` if no session cookie is present, or a `NextResponse` that continues processing the request otherwise.
 */
export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|assets).*)",
  ],
};