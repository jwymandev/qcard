import { auth } from '@/auth';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get session from auth()
    const session = await auth();
    
    // Get all cookie names
    const cookieHeader = request.headers.get('cookie') || 'none';
    const cookieNames = cookieHeader !== 'none' 
      ? cookieHeader.split(';').map(c => c.trim().split('=')[0]) 
      : [];
    
    // Check specific cookies
    const hasSessionCookie = request.cookies.has('next-auth.session-token');
    const hasSecureSessionCookie = request.cookies.has('__Secure-next-auth.session-token');
    
    // Try to get token directly with different options
    const tokenOptions = {
      req: request,
      cookieName: 'next-auth.session-token',
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
      secureCookie: false,
    };
    
    const token = await getToken(tokenOptions);
    
    return NextResponse.json({
      status: "Auth status check",
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          tenantType: session.user.tenantType,
        } : null,
      },
      cookies: {
        cookieHeaderExists: cookieHeader !== 'none',
        cookieNames,
        hasSessionCookie,
        hasSecureSessionCookie,
      },
      token: {
        exists: !!token,
        details: token ? {
          id: token.id,
          email: token.email,
          tenantType: token.tenantType,
          role: token.role,
        } : null,
      },
      env: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      }
    });
  } catch (error) {
    console.error("Error in auth status check:", error);
    return NextResponse.json({
      error: "Failed to check auth status",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}