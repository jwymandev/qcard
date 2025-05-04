import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    // Return session info for debugging
    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        role: session.user?.role,
        tenantType: session.user?.tenantType,
        expires: session.expires,
      } : null,
      cookies: {
        // Don't log actual cookie values, just presence
        hasCookies: typeof document !== 'undefined' && document.cookie.length > 0,
      },
      env: {
        nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
        hasSecret: !!process.env.NEXTAUTH_SECRET,
        nodeEnv: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json({ 
      error: "Failed to get debug session info",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}