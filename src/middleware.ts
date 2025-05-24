import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * RESILIENT MIDDLEWARE FOR DIGITAL OCEAN DEPLOYMENT
 * This middleware prioritizes availability over strict security checks
 * to prevent the "Loading Authentication..." screen on DigitalOcean.
 */
export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Log all requests
  console.log(`Middleware processing protected path: ${path}`);
  
  // No bypass functionality - all routes require proper authentication
  
  // For all protected paths, attempt authentication with generous timeout
  try {
    // Create a timeout promise to avoid hanging on database connections
    // Use a much longer timeout to accommodate slower database connections
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Auth token check timed out')), 5000); // 5 seconds (was 2 seconds)
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
      
      // For timeout errors, redirect to sign-in
      // This prioritizes security over availability
      if (tokenError instanceof Error && tokenError.message.includes('timed out')) {
        console.log('Authentication timed out, redirecting to sign-in');
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('callbackUrl', path);
        return NextResponse.redirect(signInUrl);
      }
      
      // For other token errors, continue without auth
      token = null;
    }
    
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
    
    // For all errors, redirect to sign-in
    // This prioritizes security over availability
    console.log('Middleware encountered an error, redirecting to sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  }
}

// IMPORTANT: Configure middleware to only run on protected paths
// Do NOT include homepage, sign-in, or sign-up pages
export const config = {
  matcher: [
    '/dashboard',
    '/profile',
    '/opportunities/:path*',
    '/studio/:path*',
    '/talent/:path*',
    '/admin/:path*',
    '/role-redirect',
    '/unauthorized'
  ],
};