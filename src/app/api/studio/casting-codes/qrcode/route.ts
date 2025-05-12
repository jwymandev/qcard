import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import QRCode from 'qrcode';
import { z } from 'zod';

// Schema for validation
const qrCodeRequestSchema = z.object({
  code: z.string().min(1, { message: "Casting code is required" }),
  size: z.number().int().positive().optional().default(300),
});

// GET - Generate QR code for a casting code
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get studio ID from user's tenant
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });
    
    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    
    const studio = await prisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });
    
    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }
    
    // Get the code parameter from the URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const sizeParam = searchParams.get('size');
    
    if (!code) {
      return NextResponse.json({ error: 'Casting code is required' }, { status: 400 });
    }
    
    const size = sizeParam ? parseInt(sizeParam, 10) : 300;
    
    // Validate the parameters
    qrCodeRequestSchema.parse({ code, size });
    
    // Check if this casting code belongs to this studio
    const castingCode = await prisma.castingCode.findFirst({
      where: {
        code,
        studioId: studio.id,
      },
    });
    
    if (!castingCode) {
      return NextResponse.json(
        { error: 'Casting code not found or not owned by this studio' },
        { status: 404 }
      );
    }
    
    // Generate the application URL (this should be configured in your environment)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const applicationUrl = `${baseUrl}/apply/${code}`;
    
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(applicationUrl, {
      width: size,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    // Return the QR code as data URL
    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      applicationUrl,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}