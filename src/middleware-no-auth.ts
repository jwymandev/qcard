/**
 * NO-AUTH MIDDLEWARE
 * 
 * This is a simplified middleware that skips all authentication checks.
 * Replace your normal middleware.ts with this file to bypass authentication completely.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log(`[NO-AUTH] Request for path: ${request.nextUrl.pathname}`);
  
  // Allow all requests to proceed without authentication
  return NextResponse.next();
}

// Match the same paths as your regular middleware
export const config = {
  matcher: [
    '/dashboard',
    '/profile',
    '/opportunities',
    '/opportunities/:path*',
    '/sign-in',
    '/sign-up',
    '/studio/:path*',
    '/talent/:path*',
    '/admin/:path*',
    '/role-redirect',
    '/unauthorized',
    '/auth-debug',
    '/debug-session',
    '/emergency-logout'
  ],
};