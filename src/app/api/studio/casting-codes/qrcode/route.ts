import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { authPrisma } from '@/lib/secure-db-connection';
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
    console.log("GET /api/studio/casting-codes/qrcode: Received request");
    const session = await auth();

    if (!session || !session.user) {
      console.log("GET /api/studio/casting-codes/qrcode: Unauthorized - no session or user");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("GET /api/studio/casting-codes/qrcode: Authenticated as user ID:", session.user.id);

    // Get studio ID from user's tenant
    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      include: { Tenant: true },
    });

    console.log("GET /api/studio/casting-codes/qrcode: Found user:", user?.id, "with tenant type:", user?.Tenant?.type);

    if (!user?.Tenant || user.Tenant.type !== 'STUDIO') {
      console.log("GET /api/studio/casting-codes/qrcode: Not authorized - not a studio user");
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const studio = await authPrisma.studio.findUnique({
      where: { tenantId: user.tenantId! },
    });

    if (!studio) {
      console.log("GET /api/studio/casting-codes/qrcode: Studio not found for tenant ID:", user.tenantId);
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    console.log("GET /api/studio/casting-codes/qrcode: Found studio ID:", studio.id);

    // Get the code parameter from the URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const sizeParam = searchParams.get('size');

    console.log("GET /api/studio/casting-codes/qrcode: Parameters - code:", code, "size:", sizeParam);

    if (!code) {
      console.log("GET /api/studio/casting-codes/qrcode: Missing code parameter");
      return NextResponse.json({ error: 'Casting code is required' }, { status: 400 });
    }

    const size = sizeParam ? parseInt(sizeParam, 10) : 300;

    try {
      // Validate the parameters
      qrCodeRequestSchema.parse({ code, size });
      console.log("GET /api/studio/casting-codes/qrcode: Parameters validated");
    } catch (validationError) {
      console.error("GET /api/studio/casting-codes/qrcode: Validation error:", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: validationError.format() },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Check if this casting code belongs to this studio
    console.log("GET /api/studio/casting-codes/qrcode: Checking if casting code exists");
    const castingCode = await prisma.castingCode.findFirst({
      where: {
        code,
        studioId: studio.id,
      },
    });

    console.log("GET /api/studio/casting-codes/qrcode: Casting code lookup result:", castingCode ? "Found" : "Not found");

    if (!castingCode) {
      console.log("GET /api/studio/casting-codes/qrcode: Casting code not found or not owned by this studio");
      return NextResponse.json(
        { error: 'Casting code not found or not owned by this studio' },
        { status: 404 }
      );
    }

    // Generate the application URL (this should be configured in your environment)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const applicationUrl = `${baseUrl}/apply/${code}`;
    console.log("GET /api/studio/casting-codes/qrcode: Application URL:", applicationUrl);

    // Generate QR code
    console.log("GET /api/studio/casting-codes/qrcode: Generating QR code");
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(applicationUrl, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      console.log("GET /api/studio/casting-codes/qrcode: QR code generated successfully");

      // Return the QR code as data URL
      const response = {
        qrCode: qrCodeDataUrl,
        applicationUrl,
      };

      return NextResponse.json(response);
    } catch (qrError) {
      console.error("GET /api/studio/casting-codes/qrcode: Error generating QR code:", qrError);
      return NextResponse.json(
        { error: 'Failed to generate QR code', details: String(qrError) },
        { status: 500 }
      );
    }
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