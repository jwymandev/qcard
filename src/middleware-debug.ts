import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// EMERGENCY DEBUG MIDDLEWARE - SKIPS MOST AUTH CHECKS
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Log all requests
  console.log(`[DEBUG MIDDLEWARE] Request for path: ${path}`);
  
  // Emergency bypass: Allow all requests to proceed
  // This will completely skip authentication checks
  if (request.nextUrl.searchParams.has('emergency_bypass')) {
    console.log(`[DEBUG MIDDLEWARE] EMERGENCY BYPASS for ${path}`);
    const response = NextResponse.next();
    response.cookies.set('emergency_bypass', 'true', { 
      maxAge: 3600, // 1 hour
      path: '/'
    });
    return response;
  }
  
  // Check for existing bypass cookie
  if (request.cookies.has('emergency_bypass')) {
    console.log(`[DEBUG MIDDLEWARE] Using existing emergency bypass for ${path}`);
    return NextResponse.next();
  }
  
  // Skip middleware for static resources, API routes, and debug pages
  if (
    path.startsWith('/api/') || 
    path.includes('_next') || 
    path.includes('favicon.ico') ||
    path.includes('.') ||
    path === '/auth-debug' ||
    path === '/debug-session' ||
    path === '/emergency-logout'
  ) {
    return NextResponse.next();
  }
  
  // Expanded list of public paths that don't require authentication
  const publicPaths = [
    '/sign-in',
    '/sign-up',
    '/',
    '/subscription',
    '/unauthorized',
    '/role-redirect',
    '/auth-debug',
    '/debug-session',
    '/emergency-logout'
  ];
  
  // Check if current path is public
  const isPublicPath = publicPaths.includes(path);
  
  // Always allow access to public paths
  if (isPublicPath) {
    console.log(`[DEBUG MIDDLEWARE] Public path access: ${path}`);
    return NextResponse.next();
  }
  
  try {
    // Simple auth check with timeout to avoid hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth token check timed out')), 500)
    );
    
    const tokenPromise = getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    });
    
    // Race between token check and timeout
    const token = await Promise.race([tokenPromise, timeoutPromise]);
    
    // If we have a valid token, allow access
    if (token) {
      console.log(`[DEBUG MIDDLEWARE] Valid token found for path: ${path}`);
      return NextResponse.next();
    }
    
    // No token found, redirect to sign-in for protected routes
    console.log(`[DEBUG MIDDLEWARE] No token found, redirecting to sign-in from: ${path}`);
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
    
  } catch (error) {
    // Log error but allow access anyway for debugging
    console.error('[DEBUG MIDDLEWARE] Auth error:', error);
    console.log('[DEBUG MIDDLEWARE] Allowing access despite auth error');
    
    // Add a query parameter to indicate auth was bypassed
    const url = new URL(request.url);
    url.searchParams.set('auth_bypassed', 'true');
    
    // Use redirect instead of rewrite to make the bypass visible in the URL
    return NextResponse.redirect(url);
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