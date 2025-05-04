import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-helpers";

export async function GET() {
  try {
    // This will throw and redirect if not admin
    const session = await requireAdmin();
    
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
    console.error('Admin access check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Admin access check failed" 
      }, 
      { status: 403 }
    );
  }
}