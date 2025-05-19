import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Removing getServerSession as it's causing compatibility issues

/**
 * API Route to check authentication status
 * Used by the auth-debug page to diagnose authentication issues
 */
export async function GET(request: Request) {
  try {
    // Skip session fetch to avoid compatibility issues
    const session = null;
    
    // Get the token from the request
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    // Get all cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = cookieHeader
      .split(';')
      .map(cookie => cookie.trim())
      .filter(cookie => cookie.startsWith('next-auth'))
      .reduce((obj, cookie) => {
        const [name, value] = cookie.split('=');
        return { ...obj, [name]: value };
      }, {});
    
    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        expires: session.expires,
        user: {
          name: session.user?.name,
          email: session.user?.email,
          image: session.user?.image,
        }
      } : null,
      token: token ? {
        name: token.name,
        email: token.email,
        exp: token.exp,
        iat: token.iat,
        jti: token.jti,
      } : null,
      cookies,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error.message, 
        stack: process.env.NODE_ENV === 'development' ? error.stack : null 
      },
      { status: 500 }
    );
  }
}