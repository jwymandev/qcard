import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ 
      authenticated: false,
      message: "Not authenticated"
    });
  }
  
  return NextResponse.json({ 
    authenticated: true,
    user: {
      id: session.user?.id,
      name: session.user?.name,
      email: session.user?.email,
      tenantType: session.user?.tenantType,
      role: session.user?.role
    }
  });
}