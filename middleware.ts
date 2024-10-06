import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

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
    // User is not authenticated
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
