import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/auth");
  if (isAuthRoute) return NextResponse.next();

  // Check for NextAuth session token cookie without importing the heavy auth module
  const sessionCookie =
    cookies.get("authjs.session-token")?.value ||
    cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionCookie) {
    const signInUrl = new URL("/auth/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/transactions/:path*", "/budgets/:path*", "/settings/:path*"],
};


