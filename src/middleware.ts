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
  
  // Check for cookie-based session
  const authCookie = request.cookies.get('next-auth.session-token');
  const secureCookie = request.cookies.get('__Secure-next-auth.session-token');
  
  const hasCookie = !!authCookie || !!secureCookie;
  console.log(`Auth cookies present: ${hasCookie ? 'Yes' : 'No'}`);
  
  // DEVELOPMENT MODE ONLY: Allow access based on cookie presence
  if (process.env.NODE_ENV === 'development' && hasCookie) {
    console.log('Development mode: Cookie present, allowing access');
    return NextResponse.next();
  }
  
  // For all protected paths, attempt authentication with generous timeout
  try {
    // Create a timeout promise to avoid hanging on database connections
    // Use a much longer timeout to accommodate slower database connections
    const timeoutPromise = new Promise<null>((_, reject) => {
      setTimeout(() => reject(new Error('Auth token check timed out')), 10000); // 10 seconds
    });
    
    // Create the token promise with detailed options
    const tokenPromise = getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
      cookieName: authCookie ? 'next-auth.session-token' : 
                 secureCookie ? '__Secure-next-auth.session-token' : undefined,
      secureCookie: !!secureCookie,
    });
    
    // Race the token check against the timeout
    let token;
    try {
      token = await Promise.race([tokenPromise, timeoutPromise]);
      console.log(`Token validation result: ${token ? 'Valid token' : 'No token'}`);
      if (token) {
        console.log(`Token data: id=${token.id}, role=${token.role}, tenantType=${token.tenantType}`);
      }
    } catch (tokenError) {
      console.error('Token verification error or timeout:', tokenError);
      
      // DEVELOPMENT MODE: For timeout errors, allow access if cookie is present
      if (process.env.NODE_ENV === 'development' && hasCookie) {
        console.log('Development mode: Auth timeout but cookie present, allowing access');
        return NextResponse.next();
      }
      
      // Production mode: For timeout errors, redirect to sign-in
      if (tokenError instanceof Error && tokenError.message.includes('timed out')) {
        console.log('Authentication timed out, redirecting to sign-in');
        const signInUrl = new URL('/sign-in', request.url);
        signInUrl.searchParams.set('callbackUrl', path);
        signInUrl.searchParams.set('auth_timeout', 'true');
        return NextResponse.redirect(signInUrl);
      }
      
      // For other token errors, set token to null
      token = null;
    }
    
    // If authenticated, allow access
    if (token) {
      console.log('Token validation successful, allowing access');
      return NextResponse.next();
    }
    
    // DEVELOPMENT MODE: Last chance check for auth cookie
    if (process.env.NODE_ENV === 'development' && hasCookie) {
      console.log('Development fallback: Cookie present but no token, allowing access anyway');
      return NextResponse.next();
    }
    
    // Not authenticated, redirect to sign-in
    console.log('Not authenticated, redirecting to sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    // DEVELOPMENT MODE: Allow access on errors if cookie is present
    if (process.env.NODE_ENV === 'development' && hasCookie) {
      console.log('Development mode: Error occurred but cookie present, allowing access');
      return NextResponse.next();
    }
    
    // Production mode: For all errors, redirect to sign-in
    console.log('Middleware encountered an error, redirecting to sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', path);
    signInUrl.searchParams.set('error', 'AuthError');
    return NextResponse.redirect(signInUrl);
  }
}

// IMPORTANT: Configure middleware to only run on protected paths
// Do NOT include homepage, sign-in, sign-up, or auth-test pages
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