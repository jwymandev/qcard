import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Skip middleware for static resources and API routes to prevent reloading
  if (
    path.startsWith('/api/') || 
    path.includes('_next') || 
    path.includes('favicon.ico') ||
    path.includes('.') // Skip files with extensions (images, js, css)
  ) {
    return NextResponse.next();
  }
  
  // Reduce logging in development to only key paths
  const isKeyPath = path === '/sign-in' || 
                    path === '/sign-up' || 
                    path === '/dashboard' ||
                    path === '/role-redirect' ||
                    path.startsWith('/studio/') || 
                    path.startsWith('/talent/');
  
  if (isKeyPath) {
    console.log(`Middleware processing path: ${path}`);
  }
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/sign-in' || 
                       path === '/sign-up' || 
                       path === '/';
  
  // Skip middleware for role-redirect page (avoids infinite loops)
  if (path === '/role-redirect') {
    return NextResponse.next();
  }
  
  // Check if user is authenticated from session cookie directly
  let token = null;
  let isAuthenticated = false;
  
  try {
    // Debug cookie details to diagnose the issue
    if (isKeyPath) {
      const cookieHeader = request.headers.get('cookie') || 'none';
      console.log(`Cookie header: ${cookieHeader !== 'none' ? 'present' : 'missing'}`);
    }
    
    // Look for session cookie directly
    const hasSessionCookie = request.cookies.has('next-auth.session-token');
    
    // Try to get token with explicit cookie name
    const tokenOptions = {
      req: request,
      cookieName: 'next-auth.session-token',
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
      secureCookie: false,
    };
    
    token = await getToken(tokenOptions);
    isAuthenticated = !!token;
    
    // Debug info
    if (isKeyPath) {
      console.log(`Session cookie: ${hasSessionCookie ? 'present' : 'missing'}`);
      console.log(`Token status: ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`);
      
      if (token) {
        console.log(`Token details: id=${token.id}, tenant=${token.tenantType || 'undefined'}`);
      }
    }
    
    // Special handling for protected routes without auth
    if (!isAuthenticated && !isPublicPath) {
      // Check if there's an API session but middleware can't see it
      // This helps us understand if it's a cross-domain cookie issue
      const apiSessionUrl = new URL('/api/auth/debug-token', request.url); 
      try {
        const apiResponse = await fetch(apiSessionUrl.toString(), {
          headers: { 
            cookie: request.headers.get('cookie') || '',
          },
        });
        
        if (apiResponse.ok) {
          const sessionData = await apiResponse.json();
          if (sessionData.tokenNoSecure) {
            // We have a session in the API but not middleware - this is a middleware cookie issue
            console.log('Session detected in API but not middleware - using fallback authentication');
            isAuthenticated = true;
            token = sessionData.tokenNoSecure;
          }
        }
      } catch (apiError) {
        console.error('Error checking API session:', apiError);
      }
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
    // Continue with token as null
  }
  
  // If user is logged in and accessing sign-in or sign-up or dashboard, redirect to appropriate dashboard
  if (token && (path === '/sign-in' || path === '/sign-up' || path === '/dashboard')) {
    // Redirect based on tenant type
    if (token.tenantType === 'STUDIO') {
      return NextResponse.redirect(new URL('/studio/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/talent/dashboard', request.url));
    }
  }
  
  // If trying to access protected routes without auth, redirect to sign-in
  if (!isAuthenticated && !isPublicPath && (
    path.startsWith('/studio/') || 
    path.startsWith('/talent/') ||
    path.startsWith('/opportunities/')
  )) {
    console.log(`Protected route access denied - redirecting to sign-in`);
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  
  // For most cases, allow the request to proceed
  return NextResponse.next();
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
    '/role-redirect',
  ],
};