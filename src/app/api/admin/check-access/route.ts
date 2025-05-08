import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";

export async function GET() {
  try {
    console.log('Admin access check requested');
    
    // Get the auth session without redirect
    const { auth } = await import('@/auth');
    const session = await auth();
    
    if (!session || !session.user) {
      console.error('No session found for admin check');
      return NextResponse.json(
        { 
          success: false, 
          error: "Authentication required" 
        }, 
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const isAdmin = 
      session.user.role === "ADMIN" || 
      session.user.role === "SUPER_ADMIN" || 
      session.user.isAdmin === true;
    
    if (!isAdmin) {
      console.error('User is not an admin:', session.user.email);
      return NextResponse.json(
        { 
          success: false, 
          error: "Admin privileges required",
          user: {
            email: session.user.email,
            role: session.user.role
          }
        }, 
        { status: 403 }
      );
    }
    
    console.log('Admin access confirmed for:', session.user.email);
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin access check failed with error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Admin access check failed",
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}