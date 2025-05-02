import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcrypt';

// This endpoint is for development purposes only!
// It should be removed in production or secured behind an admin authentication

export async function POST(request: Request) {
  // Only allow this in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: "This endpoint is only available in development mode" }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, tenantType } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        message: "User already exists",
        user: { id: existingUser.id, email: existingUser.email }
      });
    }
    
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `${firstName || ''} ${lastName || ''}`.trim() || email,
        type: tenantType || 'TALENT'
      }
    });
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        tenantId: tenant.id,
        role: 'USER'
      }
    });
    
    return NextResponse.json({
      message: "Test user created successfully",
      user: { 
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim() || null,
        tenantId: tenant.id,
        tenantType: tenant.type
      }
    });
  } catch (error) {
    console.error("Create test user error:", error);
    return NextResponse.json({ 
      error: "Failed to create test user", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}