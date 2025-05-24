import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Extract cookie names for debugging
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieNames = cookieHeader
      .split(';')
      .map(cookie => cookie.trim().split('=')[0])
      .filter(Boolean);
    
    // Create a response with all auth cookies cleared
    const response = NextResponse.json({
      success: true,
      message: 'Auth cookies cleared',
      cookiesFound: cookieNames
    });
    
    // Clear all auth-related cookies
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.callback-url',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
    ];
    
    cookiesToClear.forEach(cookieName => {
      // Clear on root path
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
      });
      
      // Also try clearing with domain settings
      response.cookies.set({
        name: cookieName,
        value: '',
        expires: new Date(0),
        path: '/',
        domain: '',
      });
    });
    
    return response;
  } catch (error) {
    console.error('Error in signout-fix route:', error);
    return NextResponse.json(
      { error: 'Failed to clear auth cookies' }, 
      { status: 500 }
    );
  }
}