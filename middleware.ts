import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Log middleware execution
  console.log('Middleware handling:', request.url, {
    hasToken: !!token,
    hasProfile: token?.hasProfile,
    pathname: request.nextUrl.pathname
  });

  // Allow access to all API routes that don't require auth
  if (request.nextUrl.pathname.startsWith('/api/auth') || 
      request.nextUrl.pathname === '/api/user/onboarding') {
    return NextResponse.next();
  }

  // Allow public assets and static files
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/assets') ||
      request.nextUrl.pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Handle media requests
  if (request.nextUrl.pathname.startsWith('/media/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Allow access to auth-related pages
  if (request.nextUrl.pathname.startsWith('/signin') || 
      request.nextUrl.pathname.startsWith('/auth/error')) {
    return NextResponse.next();
  }

  if (token) {
    // User is authenticated
    if (!token.hasProfile && request.nextUrl.pathname !== "/onboarding") {
      console.log('Redirecting to onboarding:', { from: request.nextUrl.pathname });
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (token.hasProfile && request.nextUrl.pathname === "/onboarding") {
      console.log('Redirecting to home: User already has profile');
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } else {
    // Not authenticated
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/media/:path*'
  ]
}
