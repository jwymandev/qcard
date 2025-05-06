import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

/**
 * API route to provide debugging information about the session
 */
export async function GET(req: Request) {
  try {
    // Get session
    const session = await auth();
    
    // Get token
    const token = await getToken({
      req,
      cookieName: 'next-auth.session-token',
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    });
    
    // Get cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(cookie => cookie.name);
    const sessionCookie = cookieStore.get('next-auth.session-token');
    
    // Prepare response
    const response = {
      session: {
        exists: \!\!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          tenantType: session.user.tenantType,
          isAdmin: session.user.isAdmin
        } : null
      },
      token: {
        exists: \!\!token,
        id: token?.id,
        email: token?.email,
        role: token?.role,
        tenantType: token?.tenantType,
        isAdmin: token?.isAdmin,
        exp: token?.exp, // Expiration time
      },
      cookies: {
        all: cookieNames,
        hasSessionCookie: \!\!sessionCookie,
        sessionCookieExpires: sessionCookie?.expires,
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in debug session route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
ENDFILE < /dev/null