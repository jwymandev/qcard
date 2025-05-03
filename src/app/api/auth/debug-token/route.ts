import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all cookie names for debugging
    const cookieHeader = request.headers.get('cookie') || 'none';
    const cookieNames = cookieHeader !== 'none' 
      ? cookieHeader.split(';').map(c => c.trim().split('=')[0]) 
      : [];
    
    // Try to get token with different settings
    const tokenDefault = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
    });
    
    const tokenNoSecure = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET || "development-secret",
      secureCookie: false,
    });
    
    // Check specific cookies
    const devCookie = request.cookies.has('next-auth.session-token');
    const prodCookie = request.cookies.has('__Secure-next-auth.session-token');
    
    return NextResponse.json({
      message: "Debug token information",
      cookieHeader: cookieHeader !== 'none',
      cookieNames,
      hasToken: {
        defaultSettings: !!tokenDefault,
        noSecureCookie: !!tokenNoSecure
      },
      tokenDefault: tokenDefault ? {
        id: tokenDefault.id,
        role: tokenDefault.role,
        tenantType: tokenDefault.tenantType,
        sub: tokenDefault.sub,
      } : null,
      tokenNoSecure: tokenNoSecure ? {
        id: tokenNoSecure.id,
        role: tokenNoSecure.role,
        tenantType: tokenNoSecure.tenantType,
        sub: tokenNoSecure.sub,
      } : null,
      cookies: {
        devCookie,
        prodCookie
      }
    });
  } catch (error) {
    console.error("Error in debug token:", error);
    return NextResponse.json({
      error: "Failed to debug token",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}