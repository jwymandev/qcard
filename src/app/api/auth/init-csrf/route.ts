import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// GET /api/auth/init-csrf - Initialize CSRF token for NextAuth
export async function GET() {
  try {
    const cookieStore = cookies();
    
    // Check if CSRF token exists
    const existingToken = cookieStore.get('next-auth.csrf-token');
    
    if (existingToken) {
      // Token already exists, return success
      const [csrfTokenValue] = existingToken.value.split('|');
      return NextResponse.json({ 
        csrfToken: csrfTokenValue,
        success: true,
        message: 'CSRF token already exists' 
      });
    }
    
    // Generate a new CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const csrfTokenHash = crypto.createHash('sha256').update(csrfToken).digest('hex');
    
    // Create the CSRF cookie value in the format NextAuth expects
    const csrfCookieValue = `${csrfToken}|${csrfTokenHash}`;
    
    // Set the CSRF cookie
    const response = NextResponse.json({ 
      csrfToken,
      success: true,
      message: 'CSRF token generated successfully' 
    });
    
    // Set the cookie with the same parameters as in auth.ts
    response.cookies.set('next-auth.csrf-token', csrfCookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 // 1 hour
    });
    
    return response;
  } catch (error) {
    console.error('Error initializing CSRF token:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize CSRF token',
      success: false 
    }, { status: 500 });
  }
}