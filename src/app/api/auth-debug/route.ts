import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';
import { auth } from '@/auth';

/**
 * POST handler for credential validation
 */
export async function POST(request: Request) {
  // This endpoint is for debugging authentication issues only
  // It should be removed in production
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        Tenant: {
          select: {
            type: true
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found",
        emailExists: false,
        details: "The provided email address is not registered in the system."
      }, { status: 404 });
    }
    
    if (!user.password) {
      return NextResponse.json({ 
        error: "No password set for user",
        emailExists: true,
        userHasPassword: false,
        details: "The user account doesn't have a password set (may be using OAuth)."
      }, { status: 400 });
    }
    
    // Check password - but don't reveal if it's correct in the response
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    // Create a safe version of the user without the password
    const safeUser = {
      id: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
      role: user.role,
      tenantType: user.Tenant?.type,
      passwordLength: user.password?.length,
      // Include the first and last chars of the hashed password
      passwordHash: user.password 
        ? `${user.password.substring(0, 3)}...${user.password.substring(user.password.length - 3)}`
        : null
    };
    
    return NextResponse.json({
      debug: true,
      passwordAttemptLength: password.length,
      emailExists: true,
      userHasPassword: true,
      // Specifically don't include passwordMatch in production
      // This is only for debugging
      passwordHashFormat: passwordMatch ? "Valid bcrypt format" : "Invalid bcrypt format or wrong password",
      user: safeUser
    });
  } catch (error) {
    console.error("Auth debug error:", error);
    return NextResponse.json({ 
      error: "Failed to process authentication debug",
      errorDetails: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * GET handler for debugging RSC and authentication issues
 * This will help identify JSON payload rendering problems
 */
export async function GET(request: Request) {
  try {
    // Check if this is a RSC payload request - these are identifiable by the headers
    const isRscRequest = request.headers.get('RSC') === '1' || 
                        request.headers.get('Next-Router-State-Tree') !== null ||
                        request.headers.get('Next-Url') !== null;
    
    // Get all cookies for debugging
    const cookieHeader = request.headers.get('cookie') || 'none';
    const cookies = cookieHeader === 'none' ? [] : 
      cookieHeader.split(';').map(cookie => cookie.trim());
    
    // Get authentication status
    const session = await auth();
    const isAuthenticated = !!session?.user;
    
    // Get server environment info
    const environment = process.env.NODE_ENV || 'unknown';
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'not set';
    
    // Debug info for headers - using Array.from instead of spread operator
    const headerNames = Array.from(request.headers.keys());
    const headers = headerNames.reduce((acc: Record<string, string>, name: string) => {
      acc[name] = request.headers.get(name) || '';
      return acc;
    }, {});
    
    // Get URL info
    const url = new URL(request.url);
    
    // Return comprehensive debug information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      url: {
        full: request.url,
        pathname: url.pathname,
        search: url.search,
        origin: url.origin
      },
      request: {
        method: request.method,
        isRscRequest,
        headers,
        cookies
      },
      auth: {
        isAuthenticated,
        userId: session?.user?.id || null,
        userEmail: session?.user?.email || null,
        userRole: session?.user?.role || null,
        isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
        isAdmin: session?.user?.isAdmin || session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN',
        tenantType: session?.user?.tenantType || null,
        session: session || null,
        sessionExists: !!session
      },
      environment: {
        nodeEnv: environment,
        nextAuthUrl
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    
    return NextResponse.json({
      error: 'Error generating debug information',
      message: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
}