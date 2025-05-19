import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ULTRA SIMPLIFIED MIDDLEWARE FOR DATABASE MISMATCH DEBUGGING
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Log all requests in development
  console.log(`Middleware request for path: ${path}`);
  
  // TEMPORARY: Skip all middleware checks to bypass database issues
  // This allows access to the app even with database schema mismatches
  const bypassAuth = request.nextUrl.searchParams.has('bypass_auth') || 
                     request.cookies.has('bypass_auth');
                     
  if (bypassAuth) {
    console.log(`Bypassing auth checks for ${path} (bypass_auth parameter present)`);
    const response = NextResponse.next();
    response.cookies.set('bypass_auth', 'true', { maxAge: 3600 }); // 1 hour
    return response;
  }
  
  // Skip middleware for static resources, API routes and debug pages
  if (
    path.startsWith('/api/') || 
    path.includes('_next') || 
    path.includes('favicon.ico') ||
    path.includes('.') ||
    path === '/debug-auth' ||
    path === '/debug' ||
    path === '/basic-debug' ||
    path === '/debug.html'
  ) {
    return NextResponse.next();
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
  
  // For non-public paths, attempt authentication but with error fallback
  try {
    // Get token with simplified options
    const tokenOptions = {
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    };
    
    // Try to get token but don't block on failure
    try {
      const token = await getToken(tokenOptions);
      const isAuthenticated = !!token;
      
      // If authenticated, allow access to all routes
      if (isAuthenticated) {
        return NextResponse.next();
      }
    } catch (tokenError) {
      console.error('Token verification error, continuing without auth:', tokenError);
      // Continue without auth check
    }
    
    // For development/testing, allow access anyway with a flag
    // This keeps the middleware chain working but skips actual auth checks
    const response = NextResponse.next();
    response.cookies.set('auth_bypassed', 'true', { maxAge: 60 }); // 1 minute
    return response;
    
  } catch (error) {
    console.error('Middleware auth error:', error);
    // Allow access despite errors during database mismatch debugging
    return NextResponse.next();
  }
}

// Configure which paths the middleware should run on
// Added debug routes for troubleshooting
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
    '/debug-session'
  ],
};