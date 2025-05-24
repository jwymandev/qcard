import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

/**
 * API endpoint to check authentication status
 * Provides detailed information about the current session and authentication system
 */
export async function GET(request: Request) {
  try {
    // Get the current session
    const session = await auth();
    
    // Basic authentication check
    const isAuthenticated = !!session?.user;
    
    // Check for token
    let token = null;
    let tokenExists = false;
    
    try {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET || "development-secret",
      });
      tokenExists = !!token;
    } catch (tokenError) {
      console.error("Error checking token:", tokenError);
    }
    
    // Check for auth cookies
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    
    // Look for auth-related cookies
    const authCookies = {
      hasSessionCookie: allCookies.some(c => c.name.includes('next-auth.session-token')),
      hasCallbackCookie: allCookies.some(c => c.name.includes('next-auth.callback-url')),
      hasCsrfCookie: allCookies.some(c => c.name.includes('next-auth.csrf-token')),
      allCookieNames: allCookies.map(c => c.name),
    };
    
    // Check database connectivity
    let dbStatus = "unknown";
    let userCount = 0;
    let dbError = null;
    
    try {
      // Simple database test
      const startTime = Date.now();
      await prisma.$queryRaw`SELECT 1 as test`;
      const queryTime = Date.now() - startTime;
      
      // Count users to verify data access
      userCount = await prisma.user.count();
      
      dbStatus = `connected (${queryTime}ms)`;
    } catch (error) {
      dbStatus = "error";
      dbError = error instanceof Error ? error.message : String(error);
      console.error("Database error during auth status check:", error);
    }
    
    // Determine environment
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      isTest: process.env.NODE_ENV === 'test',
      serverTime: new Date().toISOString(),
    };
    
    // Get auth configuration
    const authConfig = {
      sessionStrategy: "jwt", // As configured in auth.ts
      adapter: "prisma",
      debug: process.env.NODE_ENV === "development",
      secret: process.env.NEXTAUTH_SECRET ? "configured" : "missing",
    };
    
    // Build the response
    return NextResponse.json({
      status: isAuthenticated ? "authenticated" : "unauthenticated",
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          isAdmin: session.user.isAdmin,
          tenantType: session.user.tenantType,
        } : null,
      },
      token: {
        exists: tokenExists,
        contents: token ? {
          // Don't include sensitive token data, just useful fields
          name: token.name,
          email: token.email,
          role: token.role,
          isAdmin: token.isAdmin,
          tenantType: token.tenantType,
          // Add expiry if available
          exp: token.exp ? new Date(token.exp * 1000).toISOString() : null,
        } : null,
      },
      cookies: authCookies,
      database: {
        status: dbStatus,
        userCount,
        error: dbError,
      },
      environment,
      authConfig,
    });
  } catch (error) {
    console.error("Error in auth status endpoint:", error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}