import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Enhanced middleware with fallback to error page when database is unavailable
 * This helps prevent the white screen "Loading Authentication..." issue
 */
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Log all requests in development
  console.log(`Middleware request for path: ${path}`);
  
  // Skip middleware for static resources, API routes and debug pages
  if (
    path.startsWith('/api/') || 
    path.includes('_next') || 
    path.includes('favicon.ico') ||
    path.includes('.') ||
    path === '/db-error' ||
    path === '/emergency' ||
    path === '/auth-debug' ||
    path === '/debug' ||
    path === '/debug-session' ||
    path === '/emergency-logout'
  ) {
    return NextResponse.next();
  }
  
  // EMERGENCY BYPASS: Skip auth checks when bypass_auth is present
  const bypassAuth = request.nextUrl.searchParams.has('bypass_auth') || 
                     request.cookies.has('bypass_auth');
                     
  if (bypassAuth) {
    console.log(`Bypassing auth checks for ${path} (bypass_auth parameter present)`);
    const response = NextResponse.next();
    response.cookies.set('bypass_auth', 'true', { maxAge: 3600 }); // 1 hour
    return response;
  }
  
  // Public paths that don't require authentication
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/',
    '/subscription',
    '/unauthorized',
    '/role-redirect',
    '/auth-debug',
    '/debug-session'
  ];
  
  const isPublicPath = publicPaths.includes(path);
  
  // For public paths, always allow access
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // For non-public paths, attempt authentication with timeout
  try {
    // Create a timeout promise to avoid hanging on database connections
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Auth token check timed out')), 2000);
    });
    
    // Create the token promise
    const tokenPromise = getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    });
    
    // Race the token check against the timeout
    const token = await Promise.race([tokenPromise, timeoutPromise]);
    
    // If authenticated, allow access
    if (token) {
      return NextResponse.next();
    }
    
    // Not authenticated, redirect to sign-in
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    // If error is likely due to database issues, redirect to db-error page
    if (
      error instanceof Error && (
        error.message.includes('timed out') ||
        error.message.includes('database') ||
        error.message.includes('prisma') ||
        error.message.includes('connection')
      )
    ) {
      console.error('Database connection error detected, redirecting to error page');
      return NextResponse.redirect(new URL('/db-error', request.url));
    }
    
    // For other errors, set a debug cookie and continue
    const response = NextResponse.next();
    response.cookies.set('auth_error', 'true', { maxAge: 60 }); // 1 minute
    return response;
  }
}

// Configure which paths the middleware should run on
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