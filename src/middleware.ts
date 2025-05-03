import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const isPublicPath = path === '/sign-in' || 
                       path === '/sign-up' || 
                       path === '/' ||
                       path.startsWith('/api/') ||
                       path.includes('_next') ||
                       path.includes('favicon.ico');
                       
  // Skip middleware for all API routes to prevent constant reloading
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Check if the user is authenticated for all routes
  // Add debugging info to help diagnose issues
  console.log(`Middleware processing path: ${path}`);
  
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Debug token without exposing sensitive data
  console.log(`Token status: ${token ? 'authenticated' : 'unauthenticated'}`);
  if (token) {
    console.log(`Token tenant type: ${token.tenantType || 'undefined'}`);
  }
  
  // Skip middleware for role-redirect page (avoids infinite loops)
  if (path === '/role-redirect') {
    return NextResponse.next();
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
  if (!token && (
    path.startsWith('/studio/') || 
    path.startsWith('/talent/') ||
    path.startsWith('/opportunities/')
  )) {
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
  ],
};