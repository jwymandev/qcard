import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check if essential auth variables are set
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  const hasUrl = !!process.env.NEXTAUTH_URL;
  
  return NextResponse.json({
    status: 'OK',
    auth: {
      secret: hasSecret ? 'Set' : 'Missing',
      url: hasUrl ? process.env.NEXTAUTH_URL : 'Missing',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      trustHost: true
    }
  });
}