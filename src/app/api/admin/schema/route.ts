import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Define validation schema for query parameters
const querySchema = z.object({
  profileType: z.enum(['TALENT', 'STUDIO', 'BOTH']).optional(),
});

// GET /api/admin/schema - Get all profile fields
export async function GET(request: Request) {
  try {
    // Check admin access
    await requireAdmin();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const profileType = searchParams.get('profileType');
    
    // Validate query parameters
    const validationResult = querySchema.safeParse({ profileType });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    // Build query filter
    const where = profileType 
      ? { profileType: { in: [profileType, 'BOTH'] } }
      : undefined;
    
    // Fetch all profile fields from the database
    const fields = await prisma.profileField.findMany({
      where,
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
    
    // Format validation rules from JSON string to object
    const formattedFields = fields.map(field => ({
      ...field,
      validationRules: field.validationRules 
        ? JSON.parse(field.validationRules)
        : [],
    }));
    
    // Return the fields
    return NextResponse.json(formattedFields);
  } catch (error) {
    console.error('Error fetching profile fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile fields' },
      { status: 500 }
    );
  }
}