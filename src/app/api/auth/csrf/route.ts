import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// GET /api/auth/csrf - Get or generate CSRF token
export async function GET() {
  try {
    console.log('[CSRF] Getting CSRF token from cookies');
    
    // Get existing CSRF token from cookies
    const cookieStore = cookies();
    let csrfCookie = cookieStore.get('next-auth.csrf-token');
    
    // In production, look for the secure cookie name
    if (!csrfCookie && process.env.NODE_ENV === 'production') {
      csrfCookie = cookieStore.get('__Host-next-auth.csrf-token');
    }
    
    if (csrfCookie) {
      // Extract the token value (NextAuth stores token|hash)
      const [tokenValue] = csrfCookie.value.split('|');
      console.log('[CSRF] Found existing CSRF token');
      
      return NextResponse.json({ 
        csrfToken: tokenValue,
        success: true 
      });
    }
    
    // If no CSRF token exists, create one
    console.log('[CSRF] No CSRF token found, generating new one');
    const newToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(newToken + (process.env.NEXTAUTH_SECRET || 'development-secret')).digest('hex');
    const cookieValue = `${newToken}|${tokenHash}`;
    
    // Set the CSRF cookie
    const response = NextResponse.json({ 
      csrfToken: newToken,
      success: true,
      generated: true
    });
    
    const cookieName = process.env.NODE_ENV === 'production' 
      ? '__Host-next-auth.csrf-token'
      : 'next-auth.csrf-token';
    
    response.cookies.set(cookieName, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error('Error handling CSRF token:', error);
    return NextResponse.json({ 
      error: 'Failed to handle CSRF token',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}