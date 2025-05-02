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
    const { email, newPassword } = body;
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: "Email and new password are required" }, { status: 400 });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    return NextResponse.json({
      message: "Password reset successfully",
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ 
      error: "Failed to reset password", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}