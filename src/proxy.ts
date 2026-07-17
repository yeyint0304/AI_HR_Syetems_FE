import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ADMIN_ROUTE_PREFIX,
  PUBLIC_ROUTES,
  USER_ROLES,
} from "@/lib/constants/auth.constants";
import { decodeJwt, isTokenExpired, mapClaimsToAuthUser } from "@/lib/utils/jwt";

/**
 * Edge-level route guard. In Next.js 16 this file convention replaced
 * `middleware.ts` (see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
 * — "Starting with Next.js 16, Middleware is now called Proxy"). Several
 * Server Components in this app (`(dashboard)/layout.tsx`,
 * `(dashboard)/admin/users/new/page.tsx`) already have comments assuming this
 * file exists and redirects unauthenticated visitors before render — this is
 * that implementation.
 *
 * IMPORTANT: this is an *optimistic* check only (presence + non-expiry of the
 * access-token cookie, decoded but never signature-verified — Proxy runs
 * before every request and must stay fast/dependency-free). It is NOT the
 * authorization boundary: every protected layout/page/route handler
 * re-validates server-side, and the .NET backend remains the ultimate source
 * of truth for authorization on every mutating request.
 */

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const claims = accessToken ? decodeJwt(accessToken) : null;
  const isAuthenticated = claims !== null && !isTokenExpired(claims);

  // Unauthenticated visitor hitting a protected route (including `/`):
  // send them to `/login` immediately, before any Server Component renders.
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Already-authenticated visitor hitting a public-only route (e.g. `/login`
  // after signing in from another tab): send them to the dashboard instead
  // of re-showing the login form.
  if (isAuthenticated && isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // RBAC (UX-layer only, see module docblock): SystemAdmin-only routes.
  if (isAuthenticated && pathname.startsWith(ADMIN_ROUTE_PREFIX)) {
    const user = mapClaimsToAuthUser(claims!);
    if (user?.role !== USER_ROLES.SYSTEM_ADMIN) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on every route except API routes (which enforce their own auth
     * via httpOnly cookies + the backend), static files, image optimization,
     * and favicon.ico.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
