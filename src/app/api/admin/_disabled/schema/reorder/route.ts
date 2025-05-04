import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-helpers';
import { z } from 'zod';

// Define validation schema for reordering
const reorderSchema = z.object({
  field1: z.object({
    id: z.string(),
    order: z.number(),
  }),
  field2: z.object({
    id: z.string(),
    order: z.number(),
  }),
});

// POST /api/admin/schema/reorder - Reorder fields
export async function POST(request: Request) {
  try {
    // Check admin access
    await requireAdmin();
    
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    const validationResult = reorderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid reorder data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { field1, field2 } = validationResult.data;
    
    // Start a transaction to update both fields
    await prisma.$transaction([
      prisma.profileField.update({
        where: { id: field1.id },
        data: { order: field1.order },
      }),
      prisma.profileField.update({
        where: { id: field2.id },
        data: { order: field2.order },
      }),
    ]);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering fields:', error);
    return NextResponse.json(
      { error: 'Failed to reorder fields' },
      { status: 500 }
    );
  }
}