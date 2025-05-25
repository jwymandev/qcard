import { NextResponse } from 'next/server';
import { auth, signOut } from '@/auth';

export async function POST(request: Request) {
  try {
    console.log('Sign-out endpoint called');
    
    // Get the current session
    const session = await auth();
    
    // Log who is signing out
    if (session?.user) {
      console.log(`User signing out: ${session.user.email} (${session.user.id})`);
    } else {
      console.log('No active session found for sign-out');
    }

    // Use NextAuth's signOut function to clear session
    await signOut({ redirect: false });
    
    // Create a response with cookie clearing
    const response = NextResponse.json({ success: true });
    
    // Clear all potential auth cookies
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback-url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    // Set each cookie to expire in the past
    cookiesToClear.forEach(cookieName => {
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
    
    console.log('All auth cookies cleared');
    
    return response;
  } catch (error) {
    console.error('Error during sign-out:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}