import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { handleSubscriptionCheck } from './lib/subscription-middleware';

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
                    path.startsWith('/talent/') ||
                    path.startsWith('/admin/');
  
  if (isKeyPath) {
    console.log(`Middleware processing path: ${path}`);
  }
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/sign-in' || 
                       path === '/sign-up' || 
                       path === '/' ||
                       path === '/subscription';
                       
  // Admin paths that require special privileges
  const isAdminPath = path.startsWith('/admin/');
  
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
    
    // For protected routes without auth, simply continue with normal flow
    // Removed API fetch to debug-token as this may cause JSON response issues
    if (!isAuthenticated && !isPublicPath) {
      console.log('User not authenticated for protected route');
      // Just continue with normal authentication flow - middleware will handle redirects
    }
  } catch (error) {
    console.error('Error retrieving token:', error);
    // Continue with token as null
  }
  
  // If user is logged in and accessing sign-in or sign-up or dashboard, redirect to appropriate dashboard
  if (token && (path === '/sign-in' || path === '/sign-up' || path === '/dashboard')) {
    // Check if user is admin, redirect to admin dashboard
    if (token.isAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // Otherwise redirect based on tenant type
    else if (token.tenantType === 'STUDIO') {
      return NextResponse.redirect(new URL('/studio/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/talent/dashboard', request.url));
    }
  }
  
  // Check admin routes access - only allow admins
  if (isAdminPath) {
    if (!isAuthenticated) {
      console.log(`Admin route access denied - not authenticated`);
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
    
    if (!token?.isAdmin) {
      console.log(`Admin route access denied - not an admin`);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    
    // Admin is authenticated, allow access
    return NextResponse.next();
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
  
  // If accessing studio pages and authenticated as a studio user, check if studio needs initialization
  if (path.startsWith('/studio/') && isAuthenticated && token?.tenantType === 'STUDIO' && 
      path !== '/studio/init-studio' && path !== '/studio/init-studio-auto') {
    // Check if we need to initialize studio (this will only run once per user)
    try {
      const checkStudioUrl = new URL('/api/studio/check-access', request.url);
      const checkResponse = await fetch(checkStudioUrl.toString(), {
        headers: { cookie: request.headers.get('cookie') || '' },
      });
      
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        // If studio needs initialization, redirect to auto-init page
        if (checkResponse.status === 404 && errorData.error === 'Studio not found') {
          console.log('Studio needs initialization, redirecting to auto-init page');
          
          // Add the current URL as a query parameter for the redirect
          const initUrl = new URL('/studio/init-studio-auto', request.url);
          initUrl.searchParams.set('return_to', encodeURIComponent(request.url));
          
          return NextResponse.redirect(initUrl);
        }
      }
    } catch (error) {
      console.error('Error checking studio initialization:', error);
      // Continue even if check fails
    }
  }
  
  // Check subscription requirements for certain paths
  if (isAuthenticated) {
    // Only check subscription for authenticated users
    const subscriptionResponse = await handleSubscriptionCheck(request);
    if (subscriptionResponse) {
      // If a response is returned, it means subscription check failed
      // and we should redirect to subscription page
      return subscriptionResponse;
    }
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
    '/admin/:path*',
    '/role-redirect',
    '/unauthorized',
  ],
};