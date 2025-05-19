import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
// Fix: Use Auth.js compatible import path
import { getServerSession } from 'next-auth';

/**
 * Raw debug API route for authentication diagnostics
 * Use this to get detailed information about the authentication state
 */
export async function GET(request: Request) {
  try {
    // Get headers for debugging
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Get the session if available
    let session = null;
    try {
      // Skip the server session to avoid errors
      // We'll just use the token information
      session = null;
    } catch (error) {
      console.error('Session error:', error);
    }

    // Get the token if available
    let token = null;
    try {
      token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } catch (error) {
      console.error('Token error:', error);
    }

    // Return debug information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      },
      request: {
        url: request.url,
        method: request.method,
        headers: {
          // Only include non-sensitive headers
          host: headers.host,
          referer: headers.referer,
          'user-agent': headers['user-agent'],
          cookie: headers.cookie ? '(cookie present)' : '(no cookie)',
        },
      },
      auth: {
        hasSession: !!session,
        hasToken: !!token,
        sessionExpires: session?.expires,
        tokenExpires: token?.exp ? new Date(token.exp * 1000).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json(
      { 
        error: error.message, 
        stack: process.env.NODE_ENV === 'development' ? error.stack : null 
      },
      { status: 500 }
    );
  }
}