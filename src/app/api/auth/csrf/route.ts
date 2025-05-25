import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/auth/csrf - Get CSRF token for auth
export async function GET() {
  try {
    // Check if CSRF token exists in cookies
    const cookieStore = cookies();
    const csrfToken = cookieStore.get('next-auth.csrf-token');
    
    // If CSRF token exists, return it
    if (csrfToken) {
      const [csrfTokenValue] = csrfToken.value.split('|');
      
      return NextResponse.json({ 
        csrfToken: csrfTokenValue,
        success: true 
      });
    }
    
    // If CSRF token doesn't exist, return an error
    return NextResponse.json({ 
      error: 'CSRF token not found', 
      success: false 
    }, { status: 404 });
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch CSRF token',
      success: false 
    }, { status: 500 });
  }
}