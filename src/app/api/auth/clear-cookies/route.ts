import { NextResponse } from 'next/server';

/**
 * This endpoint forcefully clears all auth-related cookies
 * without requiring a valid session
 */
export async function POST(request: Request) {
  console.log('Clear cookies endpoint called');
  
  // Create a response
  const response = NextResponse.json({ success: true });
  
  // List of all auth-related cookies to clear
  const cookiesToClear = [
    // NextAuth session cookies
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    
    // NextAuth CSRF and callback cookies
    'next-auth.callback-url',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    
    // Any other custom cookies we might be using
    'auth-state',
    'user-preferences'
  ];
  
  // Set each cookie to expire in the past with various paths/domains
  cookiesToClear.forEach(cookieName => {
    // Basic cookie clear
    response.cookies.set({
      name: cookieName,
      value: '',
      expires: new Date(0),
      path: '/',
    });
    
    // Also try with secure flag
    response.cookies.set({
      name: cookieName,
      value: '',
      expires: new Date(0),
      path: '/',
      secure: true,
    });
  });
  
  console.log('All auth cookies forcefully cleared');
  
  return response;
}