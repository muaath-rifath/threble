import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Check if this is a media request
  if (request.nextUrl.pathname.startsWith('/media/')) {
    if (!token) {
      // For media requests, return 401 instead of redirecting
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Allow the request to continue to the media API handler
    return NextResponse.next();
  }

  // Allow access to signin and error pages without redirection
  if (request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/auth/error')) {
    return NextResponse.next();
  }

  if (token) {
    // User is authenticated
    if (!token.hasProfile && request.nextUrl.pathname !== "/onboarding") {
      // Redirect to onboarding if the user doesn't have a profile
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (token.hasProfile && request.nextUrl.pathname === "/onboarding") {
      // Redirect to home if onboarding is complete
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else {
    // Not authenticated - redirect to signin
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    // For API routes, return 401 instead of redirecting
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Include media routes
    '/media/:path*'
  ]
};
