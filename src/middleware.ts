import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ENHANCED MIDDLEWARE WITH DATABASE ERROR HANDLING
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Log all requests in development
  console.log(`Middleware request for path: ${path}`);
  
  // EMERGENCY BYPASS: Skip all middleware checks to bypass database issues
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
    path === '/db-error' ||        // Add db-error page
    path === '/emergency' ||       // Add emergency page
    path === '/emergency-logout' || // Add emergency logout
    path === '/debug-auth' ||
    path === '/debug' ||
    path === '/basic-debug' ||
    path === '/debug.html' ||
    path === '/auth-debug' ||
    path === '/debug-session'
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
  
  // For non-public paths, attempt authentication with timeout protection
  try {
    // Create a timeout promise to prevent hanging on database connections
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Auth token check timed out')), 2000);
    });
    
    // Create the token promise 
    const tokenPromise = getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    });
    
    // Race the token check against the timeout
    let token;
    try {
      token = await Promise.race([tokenPromise, timeoutPromise]);
    } catch (tokenError) {
      console.error('Token verification error or timeout:', tokenError);
      
      // If token check timed out, redirect directly to sign-in for most paths
      if (tokenError instanceof Error && tokenError.message.includes('timed out')) {
        console.log('Authentication timed out, redirecting to sign-in page');
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('auth_timeout', 'true');
        signInUrl.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(signInUrl);
      }
      
      // For other token errors, continue without auth
      token = null;
    }
    
    // If authenticated, allow access to all routes
    if (token) {
      return NextResponse.next();
    }
    
    // Not authenticated and not timed out, redirect to sign-in
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
    
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    // If error suggests database issues, redirect to the database error page
    if (
      error instanceof Error && (
        error.message.includes('database') ||
        error.message.includes('connection') ||
        error.message.includes('timed out') ||
        error.message.includes('prisma')
      )
    ) {
      console.log('Database-related error detected, redirecting to error page');
      return NextResponse.redirect(new URL('/db-error', request.url));
    }
    
    // For other errors, set a debug cookie and allow access
    const response = NextResponse.next();
    response.cookies.set('auth_error', error instanceof Error ? error.message : 'Unknown error', { 
      maxAge: 300 // 5 minutes
    });
    return response;
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
    '/debug-session',
    '/emergency-logout'
  ],
};