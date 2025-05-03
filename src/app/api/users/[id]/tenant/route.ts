import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  // Only allow authenticated users to access their own data
  if (!session?.user?.id || session.user.id !== params.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Get user first
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { 
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tenantId: true
      }
    });
    
    // Get tenant separately
    let tenantType = 'TALENT'; // Default to talent
    if (user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { type: true }
      });
      
      if (tenant) {
        tenantType = tenant.type;
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Return user with tenant information
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      tenantType: tenantType,
    });
  } catch (error) {
    console.error("Error fetching user tenant info:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch user information",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}