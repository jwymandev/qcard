import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';

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