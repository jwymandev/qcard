import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
  
  // Enhanced token retrieval with selective logging
  let token = null;
  try {
    token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
      secureCookie: process.env.NODE_ENV === "production",
    });
    
    // Only log on key paths to reduce console spam
    if (isKeyPath) {
      console.log(`Token status: ${token ? 'authenticated' : 'unauthenticated'}`);
      if (token) {
        console.log(`Token details: id=${token.id}, tenant=${token.tenantType || 'undefined'}`);
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
  if (!token && !isPublicPath && (
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